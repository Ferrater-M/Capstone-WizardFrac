package com.WizardFrac.WizardFrac.service;

import com.WizardFrac.WizardFrac.entity.Student;
import com.WizardFrac.WizardFrac.repository.StudentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Optional;

/**
 * Forgot password.
 *
 * I FORGOT (login screen, nickname already typed) → if that wizard has a VERIFIED email, a one-time
 * link is emailed to it → the link opens reset-password.html → the player types a new password and
 * presses the button → the page POSTs token + password to /api/students/reset-password.
 *
 * - The answer to I FORGOT is always the same, whether or not the nickname exists or has an email,
 *   and the email is sent in the background, so nobody can use it to learn about other accounts.
 * - Links work once and for {@link #LINK_LIFETIME}; only the token's SHA-256 hash is stored.
 * - A reset logs out every game using the account and emails a "password changed" notice.
 */
@Service
public class PasswordResetService {

    public static final Duration LINK_LIFETIME = Duration.ofHours(1);
    public static final int MIN_PASSWORD_LENGTH = 4;

    public enum ResetResult { SUCCESS, EXPIRED, INVALID, WEAK }

    private final SecureRandom random = new SecureRandom();

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private EmailService emailService;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private AuthService authService;

    @Autowired
    private RateLimiter rateLimiter;

    /** Sends a reset link if this nickname has a verified email; silently does nothing otherwise. */
    public void requestReset(String nickname, String linkPrefix, String clientIp) {
        // Per network: the only limit the player is told about (it says nothing about any account).
        rateLimiter.hit("reset-ip:" + clientIp, 30, Duration.ofHours(1),
            "Too many reset requests from this network. Please wait {wait}.");
        if (nickname == null || nickname.isBlank()) return;

        Optional<Student> found = studentRepository.findByNickname(nickname.trim());
        if (found.isEmpty() || !found.get().isEmailVerified()) return;
        Student student = found.get();

        // Per account: at most 3 reset emails an hour. Over the limit we just don't send (no error,
        // since an error would reveal that this account has an email).
        try {
            rateLimiter.hit("reset-to:" + student.getId(), 3, Duration.ofHours(1), "limit");
        } catch (RateLimiter.LimitException e) {
            return;
        }

        String token = newToken();
        student.setPasswordResetTokenHash(hash(token));
        student.setPasswordResetExpiresAt(LocalDateTime.now().plus(LINK_LIFETIME));
        studentRepository.save(student);

        String to = student.getEmail();
        String name = student.getNickname();
        emailService.runInBackground("password reset email",
            () -> emailService.sendPasswordResetEmail(to, name, linkPrefix + token));
    }

    /** The player pressed the button on reset-password.html. */
    public ResetResult resetPassword(String token, String newPassword) {
        if (token == null || token.isBlank() || token.length() > 100) return ResetResult.INVALID;
        Optional<Student> found = studentRepository.findByPasswordResetTokenHash(hash(token.trim()));
        if (found.isEmpty()) return ResetResult.INVALID;

        Student student = found.get();
        LocalDateTime expires = student.getPasswordResetExpiresAt();
        if (expires == null || expires.isBefore(LocalDateTime.now())) return ResetResult.EXPIRED;
        // Checked after the token so a bad link is reported as a bad link, not a short password.
        if (newPassword == null || newPassword.length() < MIN_PASSWORD_LENGTH) return ResetResult.WEAK;

        student.setPasswordHash(passwordEncoder.encode(newPassword));
        student.setPasswordResetTokenHash(null); // one use only
        student.setPasswordResetExpiresAt(null);
        studentRepository.save(student);

        authService.revokeOthers(student.getId(), null);       // log out every game on this account
        rateLimiter.clear("wrong-password:" + student.getId()); // the old wrong tries no longer matter

        if (student.isEmailVerified()) {
            emailService.sendNoticeInBackground(student.getEmail(), student.getNickname(),
                "Your WizardFrac password was changed",
                "The password for your wizard " + student.getNickname() + " was just reset using the link we emailed."
                    + " If this was you, you're all set! If this wasn't you, tell a grown-up or your teacher right away.");
        }
        return ResetResult.SUCCESS;
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
