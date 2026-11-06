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

    /** A blank message to fill in (with MimeMessageHelper) and pass to {@link #send}. */
    public MimeMessage createMessage() {
        if (fromAddress == null || fromAddress.isBlank()) {
            throw new IllegalStateException("Email sending is not configured on the server (MAIL_USERNAME missing).");
        }
        return mailSender.createMimeMessage();
    }

    /** Sends a message through the Gmail API when it is configured, otherwise through SMTP. */
    public void send(MimeMessage message) throws MessagingException, IOException {
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
