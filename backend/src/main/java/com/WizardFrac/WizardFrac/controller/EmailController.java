package com.WizardFrac.WizardFrac.controller;

import com.WizardFrac.WizardFrac.config.AuthInterceptor;
import com.WizardFrac.WizardFrac.service.EmailService;
import com.WizardFrac.WizardFrac.service.RateLimiter;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.Duration;
import java.util.HashMap;
import java.util.Map;
import java.util.regex.Pattern;

@RestController
@RequestMapping("/api/email")
@CrossOrigin(origins = "*")
public class EmailController {

    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");
    private static final long MAX_PDF_BYTES = 10 * 1024 * 1024; // 10MB

    @Autowired
    private EmailService emailService;

    @Autowired
    private RateLimiter rateLimiter;

    @PostMapping("/send-diagnostics")
    public ResponseEntity<?> sendDiagnostics(@RequestParam("email") String email,
                                              @RequestParam("file") MultipartFile file,
                                              HttpServletRequest http) {
        Map<String, String> error = new HashMap<>();

        if (email == null || !EMAIL_PATTERN.matcher(email.trim()).matches()) {
            error.put("error", "Please provide a valid email address.");
            return ResponseEntity.badRequest().body(error);
        }
        if (file == null || file.isEmpty()) {
            error.put("error", "No PDF file was received.");
            return ResponseEntity.badRequest().body(error);
        }
        if (file.getSize() > MAX_PDF_BYTES) {
            error.put("error", "PDF file is too large.");
            return ResponseEntity.badRequest().body(error);
        }

        try {
            // Only logged-in players get here (AuthInterceptor); cap how often they can send reports.
            rateLimiter.hit("pdf-student:" + http.getAttribute(AuthInterceptor.AUTH_STUDENT_ID), 10, Duration.ofHours(1),
                "You've sent a lot of reports. Please wait {wait}.");
            rateLimiter.hit("pdf-ip:" + RateLimiter.clientIp(http), 30, Duration.ofHours(1),
                "Too many reports were sent from this network. Please wait {wait}.");
            emailService.sendDiagnosticsPdf(email.trim(), file);
            Map<String, String> response = new HashMap<>();
            response.put("message", "Statistics sent successfully");
            return ResponseEntity.ok(response);
        } catch (RateLimiter.LimitException e) {
            error.put("error", e.getMessage());
            return ResponseEntity.status(429).body(error);
        } catch (IllegalStateException e) {
            error.put("error", e.getMessage());
            return ResponseEntity.status(503).body(error);
        } catch (Exception e) {
            error.put("error", "Failed to send email: " + e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }
}
