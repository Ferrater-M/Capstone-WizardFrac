package com.WizardFrac.WizardFrac.service;

import com.WizardFrac.WizardFrac.entity.Student;
import com.WizardFrac.WizardFrac.repository.StudentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Locale;
import java.util.Optional;
import java.util.regex.Pattern;

/**
 * Email verification for password recovery.
 *
 * Flow: the student types an email in Settings (and their password, to prove it's really them) → it is
 * saved as pendingEmail and a one-time link is emailed → the link opens email-verified.html, where the
 * player presses a button → the page POSTs the token to /api/students/verify-email → pendingEmail becomes
 * the verified email. Needing a button press means email scanners that open links automatically can't
 * verify an address by accident.
 *
 * Changing a verified email works the same way: the old address stays in use until the new one is
 * verified, and then the old address is told about the change.
 *
 * Only the SHA-256 hash of a link's token is stored, so a database leak can't be turned into working
 * links. Links expire after {@link #LINK_LIFETIME}.
 */
@Service
public class EmailVerificationService {

    public static final Duration LINK_LIFETIME = Duration.ofHours(24);
    public static final Duration RESEND_COOLDOWN = Duration.ofSeconds(60);
    private static final int MAX_EMAIL_LENGTH = 254;
    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");
    private static final String NOT_YOU = " If this wasn't you, tell a grown-up or your teacher right away.";

    private final SecureRandom random = new SecureRandom();

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private EmailService emailService;

    @Autowired
    private StudentService studentService;

    @Autowired
    private RateLimiter rateLimiter;

    /** Shown to the user as-is (the controller turns it into this HTTP status with this message). */
    public static class VerificationException extends RuntimeException {
        private final int status;
        public VerificationException(int status, String message) {
            super(message);
            this.status = status;
        }
        public int getStatus() {
            return status;
        }
    }

    public enum VerifyResult { SUCCESS, EXPIRED, INVALID, TAKEN }

    private static final String EMAIL_TAKEN = "That email is already used by another wizard. Each email can only belong to one account.";

    /**
     * Saves {@code rawEmail} as the student's pending email and sends the verification link
     * ({@code linkPrefix} + token). Works both for a first email and for changing a verified one.
     */
    public String requestVerification(Long studentId, String rawEmail, String password, String linkPrefix,
                                      String clientIp) throws Exception {
        Student student = findStudent(studentId);
        checkPassword(student, password);

        String email = normalize(rawEmail);
        if (email.isEmpty() || email.length() > MAX_EMAIL_LENGTH || !EMAIL_PATTERN.matcher(email).matches()) {
            throw new VerificationException(400, "Please type a real email address.");
        }
        if (student.isEmailVerified() && email.equals(student.getEmail())) {
            throw new VerificationException(409, "That is already your verified email.");
        }
        if (studentRepository.existsByEmailAndIdNot(email, student.getId())) {
            throw new VerificationException(409, EMAIL_TAKEN);
        }

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime lastSent = student.getEmailVerificationSentAt();
        if (lastSent != null && lastSent.plus(RESEND_COOLDOWN).isAfter(now)) {
            long wait = Duration.between(now, lastSent.plus(RESEND_COOLDOWN)).getSeconds() + 1;
            throw new VerificationException(429, "Please wait " + wait + " seconds before sending another link.");
        }

        // Anti-spam: one address can't be flooded, and one network can't send to endless addresses.
        rateLimiter.hit("verify-to:" + email, 5, Duration.ofHours(1),
            "Too many links were sent to this email. Please wait {wait}.");
        rateLimiter.hit("verify-ip:" + clientIp, 30, Duration.ofHours(1),
            "Too many emails were sent from this network. Please wait {wait}.");

        String token = newToken();
        student.setPendingEmail(email);
        student.setEmailVerificationTokenHash(hash(token));
        student.setEmailVerificationExpiresAt(now.plus(LINK_LIFETIME));
        student.setEmailVerificationSentAt(now);

        // Send first, save after: if Gmail refuses, nothing changes and the player can retry right away.
        emailService.sendVerificationEmail(email, student.getNickname(), linkPrefix + token);
        studentRepository.save(student);
        return email;
    }

    /** The player pressed the button on email-verified.html. */
    public VerifyResult verify(String token) {
        if (token == null || token.isBlank() || token.length() > 100) return VerifyResult.INVALID;

        Optional<Student> found = studentRepository.findByEmailVerificationTokenHash(hash(token.trim()));
        if (found.isEmpty()) return VerifyResult.INVALID;

        Student student = found.get();
        String pending = student.getPendingEmail();
        // Already used (pressed twice, or opened again later): still a success for the player.
        if (pending == null) return student.isEmailVerified() ? VerifyResult.SUCCESS : VerifyResult.INVALID;

        LocalDateTime expires = student.getEmailVerificationExpiresAt();
        if (expires == null || expires.isBefore(LocalDateTime.now())) return VerifyResult.EXPIRED;

        // Two accounts can both have the same email pending; the first to verify it keeps it.
        if (studentRepository.existsByEmailAndIdNot(pending, student.getId())) {
            student.setPendingEmail(null);
            studentRepository.save(student);
            return VerifyResult.TAKEN;
        }

        String oldEmail = student.isEmailVerified() ? student.getEmail() : null;
        student.setEmail(pending);
        student.setEmailVerifiedAt(LocalDateTime.now());
        student.setPendingEmail(null);
        // The token hash is kept so a second press of the same link still says "verified".
        studentRepository.save(student);

        if (oldEmail != null && !oldEmail.equals(pending)) {
            emailService.sendNoticeInBackground(oldEmail, student.getNickname(),
                "Your WizardFrac email was changed",
                "The email for your wizard " + student.getNickname() + " was changed to " + mask(pending) + "."
                    + " This old email won't be used anymore." + NOT_YOU);
        }
        return VerifyResult.SUCCESS;
    }

    /** Settings → Remove Email: forget both the verified and any pending email. */
    public void removeEmail(Long studentId, String password) {
        Student student = findStudent(studentId);
        checkPassword(student, password);

        String oldEmail = student.isEmailVerified() ? student.getEmail() : null;
        student.setEmail(null);
        student.setEmailVerifiedAt(null);
        student.setPendingEmail(null);
        student.setEmailVerificationTokenHash(null);
        student.setEmailVerificationExpiresAt(null);
        studentRepository.save(student);

        if (oldEmail != null) {
            emailService.sendNoticeInBackground(oldEmail, student.getNickname(),
                "Your email was removed from WizardFrac",
                "This email was removed from your wizard " + student.getNickname() + "."
                    + " It can't be used to reset the password anymore." + NOT_YOU);
        }
    }

    /** "jo•••@gmail.com" — enough for the player to recognise, without exposing the full address. */
    public static String mask(String email) {
        if (email == null) return null;
        int at = email.indexOf('@');
        if (at <= 0) return "•••";
        String name = email.substring(0, at);
        String shown = name.length() <= 2 ? name.substring(0, 1) : name.substring(0, 2);
        return shown + "•••" + email.substring(at);
    }

    private Student findStudent(Long studentId) {
        return studentRepository.findById(studentId)
            .orElseThrow(() -> new VerificationException(404, "Player not found."));
    }

    // Asking for the password again means someone using a player's unattended (still logged-in) game
    // can't put THEIR email on the account, which forgot-password would then hand them.
    private void checkPassword(Student student, String password) {
        if (!student.hasPassword()) return;
        if (!studentService.passwordMatches(student, password)) {
            throw new VerificationException(401, "That password isn't right.");
        }
    }

    private static String normalize(String email) {
        return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
    }

    private String newToken() {
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private static String hash(String token) {
        try {
            MessageDigest sha = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(sha.digest(token.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
