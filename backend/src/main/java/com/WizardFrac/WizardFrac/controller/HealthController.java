package com.WizardFrac.WizardFrac.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Tiny "are you awake?" address for an uptime pinger (UptimeRobot, cron-job.org, …).
 *
 * Render's free plan puts the backend to sleep after ~15 minutes without visitors, and the first visit
 * afterwards waits 30–60 s for it to wake. Pinging this every ~10 minutes keeps it awake. It also runs
 * one trivial database query, which keeps Supabase's free database from pausing after a quiet week.
 */
@RestController
public class HealthController {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @GetMapping("/api/health")
    public ResponseEntity<Map<String, String>> health() {
        try {
            jdbcTemplate.queryForObject("SELECT 1", Integer.class);
            return ResponseEntity.ok(Map.of("status", "ok", "database", "ok"));
        } catch (Exception e) {
            // Still answer quickly so the pinger sees the backend is up, and flags the database problem
            return ResponseEntity.status(503).body(Map.of("status", "ok", "database", "unreachable"));
        }
    }
}
