package com.WizardFrac.WizardFrac.service;

import com.WizardFrac.WizardFrac.entity.AuthSession;
import com.WizardFrac.WizardFrac.repository.AuthSessionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import jakarta.servlet.http.HttpServletRequest;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Login passes. Before this, the server believed whatever player ID the game sent, so anyone could
 * change anyone's account by sending requests by hand. Now login/register hand the game a random
 * token, and {@link com.WizardFrac.WizardFrac.config.AuthInterceptor} only lets a request touch a
 * player's data when it carries that player's token.
 *
 * Tokens live in the database (so they survive Render restarting the server) with a small in-memory
 * cache so most requests don't need an extra database query.
 */
@Service
public class AuthService {

    public static final Duration SESSION_LIFETIME = Duration.ofDays(7);

    private final SecureRandom random = new SecureRandom();
    private final Map<String, Cached> cache = new ConcurrentHashMap<>();

    private record Cached(Long studentId, LocalDateTime expiresAt) {}

    @Autowired
    private AuthSessionRepository sessions;

    /** New login pass for this player; returns the raw token (sent to the game once, never stored). */
    public String createSession(Long studentId) {
        LocalDateTime now = LocalDateTime.now();
        sessions.deleteExpired(now);
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        AuthSession session = new AuthSession(hash(token), studentId, now.plus(SESSION_LIFETIME));
        sessions.save(session);
        cache.put(session.getTokenHash(), new Cached(studentId, session.getExpiresAt()));
        return token;
    }

    /** Which player this token belongs to, if it is real and not expired. */
    public Optional<Long> resolve(String token) {
        if (token == null || token.isBlank() || token.length() > 100) return Optional.empty();
        String h = hash(token);
        LocalDateTime now = LocalDateTime.now();

        Cached c = cache.get(h);
        if (c == null) {
            Optional<AuthSession> found = sessions.findByTokenHash(h);
            if (found.isEmpty()) return Optional.empty();
            c = new Cached(found.get().getStudentId(), found.get().getExpiresAt());
            if (cache.size() > 5000) cache.clear(); // keep memory bounded on the free server
            cache.put(h, c);
        }
        if (c.expiresAt().isBefore(now)) {
            cache.remove(h);
            sessions.deleteByTokenHash(h);
            return Optional.empty();
        }
        return Optional.of(c.studentId());
    }

    public void revoke(String token) {
        if (token == null || token.isBlank()) return;
        String h = hash(token);
        cache.remove(h);
        sessions.deleteByTokenHash(h);
    }

    /** Logs the player out everywhere except the game holding {@code keepToken} (may be null). */
    public void revokeOthers(Long studentId, String keepToken) {
        String keep = keepToken == null || keepToken.isBlank() ? null : hash(keepToken);
        cache.entrySet().removeIf(e -> e.getValue().studentId().equals(studentId) && !e.getKey().equals(keep));
        if (keep == null) sessions.deleteAllForStudent(studentId);
        else sessions.deleteOthers(studentId, keep);
    }

    /** The raw token from "Authorization: Bearer <token>", or null. */
    public static String bearerToken(HttpServletRequest request) {
        String header = request.getHeader("Authorization");
        if (header == null || !header.startsWith("Bearer ")) return null;
        return header.substring(7).trim();
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
