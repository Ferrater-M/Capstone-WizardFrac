package com.WizardFrac.WizardFrac.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Sends WizardFrac's emails.
 *
 * When GMAIL_CLIENT_ID / GMAIL_CLIENT_SECRET / GMAIL_REFRESH_TOKEN are set, mail goes out through the
 * Gmail API over HTTPS (port 443). That is the route that works on Render's free plan, which blocks the
 * SMTP ports (25/465/587), and it is not intercepted by antivirus mail scanners either. Without them it
 * falls back to plain SMTP (spring.mail.*), which still works on paid hosting.
 *
 * The refresh token is used once every time the server starts (see checkGmailOnStartup). Google expires
 * refresh tokens that go unused for 6 months; since Render's free plan restarts the server whenever the
 * site wakes up, this keeps the token alive as long as someone opens the site now and then.
 */
@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    private static final String TOKEN_URL = "https://oauth2.googleapis.com/token";
    // Upload endpoint: takes the raw MIME message (up to 35MB), so attachments need no extra base64 step.
    private static final String SEND_URL = "https://gmail.googleapis.com/upload/gmail/v1/users/me/messages/send?uploadType=media";
    private static final String REFRESH_TOKEN_HELP =
            "Gmail login expired or was revoked. Get a new refresh token from the OAuth Playground "
            + "and update GMAIL_REFRESH_TOKEN (in backend/.env and on Render).";

    @Autowired
    private JavaMailSender mailSender;

    @Autowired
    private RateLimiter rateLimiter;

    // Google limits how much a normal Gmail account may send per day; staying well under it keeps the
    // account from being blocked (which would stop every WizardFrac email, password resets included).
    public static final int MAX_EMAILS_PER_DAY = 300;

    @Value("${spring.mail.username:}")
    private String fromAddress;

    @Value("${gmail.client-id:}")
    private String gmailClientId;

    @Value("${gmail.client-secret:}")
    private String gmailClientSecret;

    @Value("${gmail.refresh-token:}")
    private String gmailRefreshToken;

    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();
    private final ObjectMapper json = new ObjectMapper();

    // One background thread for notice emails (they are rare; order doesn't matter).
    private final ExecutorService background = Executors.newSingleThreadExecutor(r -> {
        Thread t = new Thread(r, "email-notices");
        t.setDaemon(true);
        return t;
    });

    // Access tokens last about an hour; reuse one until shortly before it expires.
    private String accessToken;
    private Instant accessTokenExpiry = Instant.EPOCH;

    public void sendDiagnosticsPdf(String toEmail, MultipartFile pdfFile) throws MessagingException, IOException {
        MimeMessage message = createMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true);
        helper.setFrom(fromAddress);
        helper.setTo(toEmail);
        helper.setSubject("Your WizardFrac Progress Dashboard");
        helper.setText(
            "Hello Wizard,\n\n" +
            "Attached is a PDF summary of your WizardFrac progress dashboard, " +
            "including your stats, competency mastery, misconceptions, and game history.\n\n" +
            "Keep casting those spells!\n" +
            "— WizardFrac"
        );
        helper.addAttachment("wizardfrac-progress.pdf", pdfFile);

        send(message);
    }

    /** The "click to verify your email" message from Settings (see EmailVerificationService). */
    public void sendVerificationEmail(String toEmail, String nickname, String link) throws MessagingException, IOException {
        String name = displayName(nickname);
        String plain =
            "Hello " + name + ",\n\n" +
            "Open this link and press the button to verify your email for WizardFrac:\n" + link + "\n\n" +
            "With a verified email you can reset your password if you ever forget it.\n" +
            "The link works for 24 hours.\n\n" +
            "Didn't ask for this? You can ignore this email.\n" +
            "— WizardFrac";
        String html = themedHtml(name,
            "Click the button to verify your email. Then you can reset your password if you ever forget it.",
            link, "VERIFY MY EMAIL",
            "The link works for 24 hours. Didn't ask for this? You can ignore this email.");
        sendHtml(toEmail, "Verify your WizardFrac email", plain, html);
    }

    /** Forgot password: the "click to choose a new password" message (see PasswordResetService). */
    public void sendPasswordResetEmail(String toEmail, String nickname, String link) throws MessagingException, IOException {
        String name = displayName(nickname);
        String plain =
            "Hello " + name + ",\n\n" +
            "Someone asked to reset the password for your wizard " + name + ".\n" +
            "Open this link to choose a new password:\n" + link + "\n\n" +
            "The link works for 1 hour and only once.\n\n" +
            "Didn't ask for this? You can ignore this email. Your password stays the same.\n" +
            "— WizardFrac";
        String html = themedHtml(name,
            "Forgot your password? No problem! Click the button to choose a new one.",
            link, "RESET MY PASSWORD",
            "The link works for 1 hour and only once. Didn't ask for this? Ignore this email and your password stays the same.");
        sendHtml(toEmail, "Reset your WizardFrac password", plain, html);
    }

    /** Runs an email job off the request thread; failures are logged, never shown to the player. */
    public void runInBackground(String what, EmailJob job) {
        background.submit(() -> {
            try {
                job.run();
            } catch (Exception e) {
                log.warn("Email: could not send {} — {}", what, e.getMessage());
            }
        });
    }

    @FunctionalInterface
    public interface EmailJob {
        void run() throws Exception;
    }

    /** A short "something changed on your account" email (password changed, email changed/removed). */
    public void sendNotice(String toEmail, String nickname, String subject, String text) throws MessagingException, IOException {
        String name = displayName(nickname);
        String plain = "Hello " + name + ",\n\n" + text + "\n\n— WizardFrac";
        sendHtml(toEmail, subject, plain, themedHtml(name, text, null, null, "This is an automatic message from WizardFrac."));
    }

    /**
     * Same as {@link #sendNotice}, but off the request thread: the player doesn't wait for Gmail, and a
     * failed notice never undoes the change it is reporting.
     */
    public void sendNoticeInBackground(String toEmail, String nickname, String subject, String text) {
        background.submit(() -> {
            try {
                sendNotice(toEmail, nickname, subject, text);
            } catch (Exception e) {
                log.warn("Email: could not send notice \"{}\" — {}", subject, e.getMessage());
            }
        });
    }

    private void sendHtml(String toEmail, String subject, String plain, String html) throws MessagingException, IOException {
        MimeMessage message = createMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
        helper.setFrom(fromAddress);
        helper.setTo(toEmail);
        helper.setSubject(subject);
        helper.setText(plain, html);
        send(message);
    }

    // Purple/gold card in the game's island-selection colours. buttonLink/buttonText may be null.
    private static String themedHtml(String name, String text, String buttonLink, String buttonText, String footer) {
        String button = buttonLink == null ? "" :
            "<a href=\"" + escapeHtml(buttonLink) + "\" style=\"display:inline-block;background:#7C3AED;color:#ffffff;"
            + "text-decoration:none;font-weight:bold;font-size:16px;padding:14px 28px;border:3px solid #A855F7;\">"
            + escapeHtml(buttonText) + "</a>";
        return "<div style=\"font-family:Segoe UI,Arial,sans-serif;background:#12082F;color:#F8F7FF;padding:32px;\">"
            + "<div style=\"max-width:480px;margin:0 auto;background:#211044;border:4px solid #6D28D9;padding:28px;text-align:center;\">"
            + "<h1 style=\"color:#FBBF24;font-size:22px;margin:0 0 16px;letter-spacing:2px;\">&#9733; WIZARDFRAC &#9733;</h1>"
            + "<p style=\"font-size:16px;margin:0 0 12px;\">Hello <b>" + escapeHtml(name) + "</b>!</p>"
            + "<p style=\"font-size:15px;color:#C4B5FD;margin:0 0 24px;\">" + escapeHtml(text) + "</p>"
            + button
            + "<p style=\"font-size:12px;color:#C4B5FD;margin:24px 0 0;\">" + escapeHtml(footer) + "</p>"
            + "</div></div>";
    }

    private static String displayName(String nickname) {
        return nickname == null || nickname.isBlank() ? "Wizard" : nickname;
    }

    private static String escapeHtml(String s) {
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;");
    }

    /** A blank message to fill in (with MimeMessageHelper) and pass to {@link #send}. */
    public MimeMessage createMessage() {
        if (fromAddress == null || fromAddress.isBlank()) {
            throw new IllegalStateException("Email sending is not configured on the server (MAIL_USERNAME missing).");
        }
        return mailSender.createMimeMessage();
    }

    /** Sends a message through the Gmail API when it is configured, otherwise through SMTP. */
    public void send(MimeMessage message) throws MessagingException, IOException {
        rateLimiter.hit("email-global", MAX_EMAILS_PER_DAY, Duration.ofDays(1),
            "WizardFrac has sent a lot of emails today. Please try again in {wait}.");
        if (!gmailApiConfigured()) {
            mailSender.send(message);
            return;
        }

        message.saveChanges();
        ByteArrayOutputStream raw = new ByteArrayOutputStream();
        message.writeTo(raw);

        HttpRequest request = HttpRequest.newBuilder(URI.create(SEND_URL))
                .timeout(Duration.ofSeconds(30))
                .header("Authorization", "Bearer " + getAccessToken())
                .header("Content-Type", "message/rfc822")
                .POST(HttpRequest.BodyPublishers.ofByteArray(raw.toByteArray()))
                .build();
        HttpResponse<String> response = sendHttp(request);

        if (response.statusCode() == 401) {
            // The cached access token was rejected; forget it so the next attempt fetches a fresh one.
            accessTokenExpiry = Instant.EPOCH;
        }
        if (response.statusCode() / 100 != 2) {
            throw new IOException("Gmail API refused the email (HTTP " + response.statusCode() + "): " + googleError(response.body()));
        }
    }

    private boolean gmailApiConfigured() {
        // Pasted values often carry a stray space or line break, which Google rejects as an invalid token.
        gmailClientId = gmailClientId.trim();
        gmailClientSecret = gmailClientSecret.trim();
        gmailRefreshToken = gmailRefreshToken.trim();
        return !gmailClientId.isEmpty() && !gmailClientSecret.isEmpty() && !gmailRefreshToken.isEmpty();
    }

    private synchronized String getAccessToken() throws IOException {
        if (accessToken != null && Instant.now().isBefore(accessTokenExpiry)) return accessToken;

        String form = "client_id=" + enc(gmailClientId)
                + "&client_secret=" + enc(gmailClientSecret)
                + "&refresh_token=" + enc(gmailRefreshToken)
                + "&grant_type=refresh_token";
        HttpRequest request = HttpRequest.newBuilder(URI.create(TOKEN_URL))
                .timeout(Duration.ofSeconds(15))
                .header("Content-Type", "application/x-www-form-urlencoded")
                .POST(HttpRequest.BodyPublishers.ofString(form))
                .build();
        HttpResponse<String> response = sendHttp(request);
        JsonNode body = parse(response.body());

        if (response.statusCode() / 100 != 2) {
            String error = body.path("error").asText("");
            if ("invalid_grant".equals(error)) throw new IllegalStateException(REFRESH_TOKEN_HELP);
            if ("invalid_client".equals(error) || "unauthorized_client".equals(error)) {
                throw new IllegalStateException("Gmail API setup problem: GMAIL_CLIENT_ID or GMAIL_CLIENT_SECRET is wrong.");
            }
            throw new IOException("Could not log in to Gmail (HTTP " + response.statusCode() + "): " + googleError(response.body()));
        }

        accessToken = body.path("access_token").asText();
        long expiresIn = body.path("expires_in").asLong(3600);
        accessTokenExpiry = Instant.now().plusSeconds(Math.max(60, expiresIn - 120));
        return accessToken;
    }

    /** Uses the refresh token once at startup: keeps it from expiring when unused, and reports problems early. */
    @EventListener(ApplicationReadyEvent.class)
    public void checkGmailOnStartup() {
        if (!gmailApiConfigured()) {
            log.info("Email: Gmail API not configured (GMAIL_* missing) — using SMTP.");
            return;
        }
        // Off the main thread so a slow network never delays the server starting up.
        Thread check = new Thread(() -> {
            try {
                getAccessToken();
                log.info("Email: Gmail API ready (sending as {}).", fromAddress);
            } catch (Exception e) {
                log.error("Email: Gmail API check failed — {}", e.getMessage());
            }
        }, "gmail-startup-check");
        check.setDaemon(true);
        check.start();
    }

    private HttpResponse<String> sendHttp(HttpRequest request) throws IOException {
        try {
            return http.send(request, HttpResponse.BodyHandlers.ofString());
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IOException("Interrupted while contacting Gmail.", e);
        }
    }

    private JsonNode parse(String body) {
        try {
            return json.readTree(body == null || body.isBlank() ? "{}" : body);
        } catch (IOException e) {
            return json.createObjectNode();
        }
    }

    // Google's error bodies are JSON; pull out the readable part instead of dumping the whole thing.
    private String googleError(String body) {
        JsonNode node = parse(body);
        JsonNode err = node.path("error");
        if (err.isObject()) return err.path("message").asText(body);
        String desc = node.path("error_description").asText("");
        return desc.isBlank() ? err.asText(body) : desc;
    }

    private static String enc(String s) {
        return URLEncoder.encode(s, StandardCharsets.UTF_8);
    }
}
