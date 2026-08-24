package com.WizardFrac.WizardFrac.controller;

import com.WizardFrac.WizardFrac.service.EmailService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

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

    @PostMapping("/send-diagnostics")
    public ResponseEntity<?> sendDiagnostics(@RequestParam("email") String email,
                                              @RequestParam("file") MultipartFile file) {
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
            emailService.sendDiagnosticsPdf(email.trim(), file);
            Map<String, String> response = new HashMap<>();
            response.put("message", "Statistics sent successfully");
            return ResponseEntity.ok(response);
        } catch (IllegalStateException e) {
            error.put("error", e.getMessage());
            return ResponseEntity.status(503).body(error);
        } catch (Exception e) {
            error.put("error", "Failed to send email: " + e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }
}
