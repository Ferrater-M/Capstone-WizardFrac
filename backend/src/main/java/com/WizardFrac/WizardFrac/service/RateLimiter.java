package com.WizardFrac.WizardFrac.service;

import org.springframework.stereotype.Service;

import jakarta.servlet.http.HttpServletRequest;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * "At most N times per time window" counters, e.g. at most 5 verification emails to one address per
 * hour. Stops someone using WizardFrac to flood strangers with emails (which could get the Gmail account
 * blocked by Google, breaking ALL emails) and stops password guessing.
 *
 * Kept in memory: the counters reset when the server restarts, which is fine for this purpose.
 * Limits per network (IP) are generous because a whole classroom shares one school network.
 */
@Service
public class RateLimiter {

    /** Shown to the player as-is, as a 429 "Too Many Requests". */
    public static class LimitException extends RuntimeException {
        public LimitException(String message) {
            super(message);
        }
    }

    private final Map<String, Deque<Instant>> hits = new ConcurrentHashMap<>();

    /** Counts one use of {@code key}; throws {@link LimitException} with {@code message} if over the limit. */
    public void hit(String key, int max, Duration window, String message) {
        long wait = secondsUntilFree(key, max, window);
        if (wait > 0) throw new LimitException(message.replace("{wait}", describe(wait)));
        record(key);
    }

    /** Throws if {@code key} is already at its limit, without counting a use (e.g. before checking a password). */
    public void check(String key, int max, Duration window, String message) {
        long wait = secondsUntilFree(key, max, window);
        if (wait > 0) throw new LimitException(message.replace("{wait}", describe(wait)));
    }

    /** Counts one use without checking (e.g. a wrong password). */
    public void record(String key) {
        Deque<Instant> q = hits.computeIfAbsent(key, k -> new ArrayDeque<>());
        synchronized (q) {
            q.addLast(Instant.now());
        }
        if (hits.size() > 20000) prune();
    }

    public void clear(String key) {
        hits.remove(key);
    }

    private long secondsUntilFree(String key, int max, Duration window) {
        Deque<Instant> q = hits.get(key);
        if (q == null) return 0;
        synchronized (q) {
            Instant cutoff = Instant.now().minus(window);
            while (!q.isEmpty() && q.peekFirst().isBefore(cutoff)) q.pollFirst();
            if (q.size() < max) return 0;
            return Math.max(1, Duration.between(cutoff, q.peekFirst()).getSeconds() + 1);
        }
    }

    // Drop counters with nothing recent (older than a day), so memory stays small.
    private void prune() {
        Instant cutoff = Instant.now().minus(Duration.ofDays(1));
        hits.entrySet().removeIf(e -> e.getValue().isEmpty() || e.getValue().peekLast().isBefore(cutoff));
    }

    private static String describe(long seconds) {
        if (seconds < 60) return seconds + " seconds";
        long minutes = (seconds + 59) / 60;
        if (minutes < 60) return minutes + (minutes == 1 ? " minute" : " minutes");
        long hours = (minutes + 59) / 60;
        return hours + (hours == 1 ? " hour" : " hours");
    }

    /** The visitor's network address (Render's proxy passes it on; see server.forward-headers-strategy). */
    public static String clientIp(HttpServletRequest request) {
        return request.getRemoteAddr();
    }
}
