package com.WizardFrac.WizardFrac.controller;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import jakarta.servlet.http.HttpServletRequest;
import java.util.regex.Pattern;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import com.WizardFrac.WizardFrac.entity.Student;
import com.WizardFrac.WizardFrac.service.AuthService;
import com.WizardFrac.WizardFrac.service.EmailVerificationService;
import com.WizardFrac.WizardFrac.service.PasswordResetService;
import com.WizardFrac.WizardFrac.service.RateLimiter;
import com.WizardFrac.WizardFrac.service.StudentService;

@RestController
@RequestMapping("/api/students")
@CrossOrigin(origins = "*")
public class StudentController {
    private static final long MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB
    private static final int MAX_NICKNAME_LENGTH = 30;
    private static final Pattern LOCAL_ORIGIN = Pattern.compile("^http://(localhost|127\\.0\\.0\\.1)(:\\d{1,5})?$");

    @Autowired
    private StudentService studentService;

    @Autowired
    private EmailVerificationService emailVerificationService;

    @Autowired
    private AuthService authService;

    @Autowired
    private PasswordResetService passwordResetService;

    @Autowired
    private RateLimiter rateLimiter;

    // New players per network per hour — roomy, since a whole class can share one school network.
    private static final int MAX_NEW_PLAYERS_PER_IP = 60;

    // Where the email link's page lives (frontend/public/email-verified.html).
    @Value("${app.frontend-url:https://capstone-wizard-frac.vercel.app}")
    private String frontendUrl;

    // Public address of this backend, used inside the emailed link. Blank = work it out from the request.
    @Value("${app.backend-url:}")
    private String backendUrl;

    // Login/Create student endpoint. `password` is only required once the nickname
    // is claimed (see /check-nickname) — an unclaimed nickname logs in regardless.
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> request, HttpServletRequest http) {
        String nickname = request.get("nickname");
        if (nickname == null || nickname.trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Nickname is required");
        }

        Student student;
        Map<String, String> error = new HashMap<>();
        try {
            // A nickname nobody has used yet creates a new player, so it counts toward the new-player limit.
            if (studentService.getStudentByNickname(nickname.trim()).isEmpty()) {
                rateLimiter.hit("new-player-ip:" + RateLimiter.clientIp(http), MAX_NEW_PLAYERS_PER_IP, Duration.ofHours(1),
                    "Too many new players were made from this network. Please wait {wait}.");
            }
            student = studentService.login(nickname.trim(), request.get("password"));
        } catch (StudentService.WrongPasswordException e) {
            error.put("error", e.getMessage());
            return ResponseEntity.status(401).body(error);
        } catch (RateLimiter.LimitException e) {
            error.put("error", e.getMessage());
            return ResponseEntity.status(429).body(error);
        }

        return ResponseEntity.ok(loginResponse(student));
    }

    // Register a new player in one request: create the nickname and set its password together
    // (the old flow needed /login and then /{id}/password — two trips to the server).
    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody Map<String, String> request, HttpServletRequest http) {
        String nickname = request.get("nickname");
        String password = request.get("password");
        Map<String, String> error = new HashMap<>();
        if (nickname == null || nickname.trim().isEmpty()) {
            error.put("error", "Nickname is required.");
            return ResponseEntity.badRequest().body(error);
        }
        if (password == null || password.length() < 4) {
            error.put("error", "Password must be at least 4 characters.");
            return ResponseEntity.badRequest().body(error);
        }
        try {
            rateLimiter.hit("new-player-ip:" + RateLimiter.clientIp(http), MAX_NEW_PLAYERS_PER_IP, Duration.ofHours(1),
                "Too many new players were made from this network. Please wait {wait}.");
            return ResponseEntity.ok(loginResponse(studentService.register(nickname.trim(), password)));
        } catch (StudentService.NicknameTakenException e) {
            error.put("error", e.getMessage());
            return ResponseEntity.status(409).body(error);
        } catch (RateLimiter.LimitException e) {
            error.put("error", e.getMessage());
            return ResponseEntity.status(429).body(error);
        }
    }

    // Log out: the game's login pass stops working.
    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpServletRequest http) {
        authService.revoke(AuthService.bearerToken(http));
        Map<String, String> response = new HashMap<>();
        response.put("message", "Logged out.");
        return ResponseEntity.ok(response);
    }

    // What the frontend gets after logging in or registering
    private Map<String, Object> loginResponse(Student student) {
        Map<String, Object> response = new HashMap<>();
        response.put("studentId", student.getId());
        response.put("nickname", student.getNickname());
        response.put("selectedCharacterId", student.getSelectedCharacterId());
        response.put("selectedCharacterName", student.getSelectedCharacterName());
        response.put("createdAt", student.getCreatedAt());
        response.put("hasPassword", student.hasPassword());
        // The login pass: the game sends it back with every request (see AuthInterceptor).
        response.put("token", authService.createSession(student.getId()));
        return response;
    }

    // Tells the login screen whether this nickname is already claimed (needs a
    // password) or free (offer to claim it) — an unregistered nickname is unclaimed.
    @GetMapping("/check-nickname")
    public ResponseEntity<?> checkNickname(@RequestParam String nickname) {
        if (nickname == null || nickname.trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Nickname is required");
        }
        Map<String, Object> response = new HashMap<>();
        response.put("hasPassword", studentService.hasPassword(nickname.trim()));
        return ResponseEntity.ok(response);
    }

    // Set (claim) or change a student's password.
    @PutMapping("/{studentId}/password")
    public ResponseEntity<?> updatePassword(@PathVariable Long studentId, @RequestBody Map<String, String> request,
                                            HttpServletRequest http) {
        Map<String, String> error = new HashMap<>();
        String newPassword = request.get("newPassword");

        if (newPassword == null || newPassword.length() < 4) {
            error.put("error", "New password must be at least 4 characters.");
            return ResponseEntity.badRequest().body(error);
        }

        try {
            studentService.setPassword(studentId, request.get("currentPassword"), newPassword);
            // Anyone else logged in as this player (e.g. someone who knew the old password) is logged out.
            authService.revokeOthers(studentId, AuthService.bearerToken(http));
            Map<String, String> response = new HashMap<>();
            response.put("message", "Password updated.");
            return ResponseEntity.ok(response);
        } catch (StudentService.WrongPasswordException e) {
            error.put("error", e.getMessage());
            return ResponseEntity.status(401).body(error);
        } catch (RateLimiter.LimitException e) {
            error.put("error", e.getMessage());
            return ResponseEntity.status(429).body(error);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    // Get student info
    @GetMapping("/{studentId}")
    public ResponseEntity<?> getStudent(@PathVariable Long studentId) {
        Optional<Student> student = studentService.getStudentById(studentId);
        if (student.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Map<String, Object> response = new HashMap<>();
        Student s = student.get();
        response.put("studentId", s.getId());
        response.put("nickname", s.getNickname());
        response.put("selectedCharacterId", s.getSelectedCharacterId());
        response.put("selectedCharacterName", s.getSelectedCharacterName());
        response.put("lastLoginAt", s.getLastLoginAt());
        response.put("hasProfilePicture", s.getProfilePicture() != null);
        response.put("hasPassword", s.hasPassword());
        // Masked: shown on screen, so a passer-by doesn't see the whole address.
        response.put("email", EmailVerificationService.mask(s.getEmail()));
        response.put("emailVerified", s.isEmailVerified());
        response.put("pendingEmail", EmailVerificationService.mask(s.getPendingEmail()));

        return ResponseEntity.ok(response);
    }

    // Settings → Email → Verify (first email, or changing a verified one). Needs the player's password.
    @PostMapping("/{studentId}/email")
    public ResponseEntity<?> requestEmailVerification(@PathVariable Long studentId, @RequestBody Map<String, String> request,
                                                      HttpServletRequest http) {
        Map<String, Object> body = new HashMap<>();
        String linkPrefix = pageLinkPrefix(http, "email-verified.html");
        try {
            String email = emailVerificationService.requestVerification(
                studentId, request.get("email"), request.get("password"), linkPrefix, RateLimiter.clientIp(http));
            body.put("message", "Verification link sent.");
            body.put("pendingEmail", EmailVerificationService.mask(email));
            body.put("cooldownSeconds", EmailVerificationService.RESEND_COOLDOWN.getSeconds());
            return ResponseEntity.ok(body);
        } catch (EmailVerificationService.VerificationException e) {
            body.put("error", e.getMessage());
            return ResponseEntity.status(e.getStatus()).body(body);
        } catch (RateLimiter.LimitException e) {
            body.put("error", e.getMessage());
            return ResponseEntity.status(429).body(body);
        } catch (IllegalStateException e) {
            body.put("error", "Email sending isn't set up on the server yet.");
            return ResponseEntity.status(503).body(body);
        } catch (Exception e) {
            body.put("error", "Couldn't send the email. Please try again.");
            return ResponseEntity.status(500).body(body);
        }
    }

    // Settings → Email → Remove Email. Needs the player's password.
    @PostMapping("/{studentId}/email/remove")
    public ResponseEntity<?> removeEmail(@PathVariable Long studentId, @RequestBody Map<String, String> request) {
        Map<String, Object> body = new HashMap<>();
        try {
            emailVerificationService.removeEmail(studentId, request.get("password"));
            body.put("message", "Email removed.");
            return ResponseEntity.ok(body);
        } catch (EmailVerificationService.VerificationException e) {
            body.put("error", e.getMessage());
            return ResponseEntity.status(e.getStatus()).body(body);
        } catch (RateLimiter.LimitException e) {
            body.put("error", e.getMessage());
            return ResponseEntity.status(429).body(body);
        }
    }

    // Called by email-verified.html when the player presses its button (a POST, so email scanners that
    // merely open the link can't verify it). status: success | expired | invalid
    @PostMapping("/verify-email")
    public ResponseEntity<?> verifyEmail(@RequestBody Map<String, String> request) {
        EmailVerificationService.VerifyResult result = emailVerificationService.verify(request.get("token"));
        Map<String, Object> body = new HashMap<>();
        body.put("status", result.name().toLowerCase());
        return ResponseEntity.ok(body);
    }

    // The site the email link should open. When testing locally (the game runs on localhost), use that
    // local site — the Vercel site only has email-verified.html after a push. Anything else gets the
    // configured FRONTEND_URL, so a stranger can't make our emails link to their own website.
    private String frontendFor(HttpServletRequest http) {
        String origin = http.getHeader("Origin");
        if (origin != null && LOCAL_ORIGIN.matcher(origin).matches()) return origin;
        return frontendUrl;
    }

    // I FORGOT on the login screen. Always the same answer, so it can't be used to find out which
    // nicknames have an email (the email itself is sent in the background, so timing doesn't tell either).
    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody Map<String, String> request, HttpServletRequest http) {
        Map<String, Object> body = new HashMap<>();
        try {
            passwordResetService.requestReset(request.get("nickname"), pageLinkPrefix(http, "reset-password.html"),
                RateLimiter.clientIp(http));
        } catch (RateLimiter.LimitException e) {
            body.put("error", e.getMessage());
            return ResponseEntity.status(429).body(body);
        }
        body.put("message", "If this wizard has a verified email, a reset link was sent to it.");
        return ResponseEntity.ok(body);
    }

    // The button on reset-password.html. status: success | expired | invalid | weak
    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody Map<String, String> request) {
        Map<String, Object> body = new HashMap<>();
        body.put("status", passwordResetService.resetPassword(request.get("token"), request.get("password")).name().toLowerCase());
        return ResponseEntity.ok(body);
    }

    // Start of an emailed link: <frontend>/<page>?api=<this backend>&token=  (the page sends the token
    // back to the backend named in `api` when the player presses its button).
    private String pageLinkPrefix(HttpServletRequest http, String page) {
        String backend = (backendUrl == null || backendUrl.isBlank())
            ? ServletUriComponentsBuilder.fromCurrentContextPath().toUriString()
            : backendUrl.trim();
        return trimSlash(frontendFor(http)) + "/" + page + "?api="
            + URLEncoder.encode(trimSlash(backend), StandardCharsets.UTF_8) + "&token=";
    }

    private static String trimSlash(String url) {
        return url.trim().replaceAll("/+$", "");
    }

    // Update nickname — nickname doubles as the login key, so it must stay unique
    @PutMapping("/{studentId}/nickname")
    public ResponseEntity<?> updateNickname(@PathVariable Long studentId, @RequestBody Map<String, String> request) {
        Map<String, String> error = new HashMap<>();
        String nickname = request.get("nickname");

        if (nickname == null || nickname.trim().isEmpty()) {
            error.put("error", "Nickname is required.");
            return ResponseEntity.badRequest().body(error);
        }
        nickname = nickname.trim();
        if (nickname.length() > MAX_NICKNAME_LENGTH) {
            error.put("error", "Nickname must be " + MAX_NICKNAME_LENGTH + " characters or fewer.");
            return ResponseEntity.badRequest().body(error);
        }
        if (studentService.isNicknameTaken(nickname, studentId)) {
            error.put("error", "That nickname is already taken.");
            return ResponseEntity.status(409).body(error);
        }

        try {
            Student updated = studentService.updateNickname(studentId, nickname);
            Map<String, Object> response = new HashMap<>();
            response.put("studentId", updated.getId());
            response.put("nickname", updated.getNickname());
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    // Upload/replace profile picture — stored directly in the database
    @PostMapping("/{studentId}/profile-picture")
    public ResponseEntity<?> uploadProfilePicture(@PathVariable Long studentId, @RequestParam("file") MultipartFile file) {
        Map<String, String> error = new HashMap<>();

        if (file == null || file.isEmpty()) {
            error.put("error", "No image file was received.");
            return ResponseEntity.badRequest().body(error);
        }
        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            error.put("error", "File must be an image.");
            return ResponseEntity.badRequest().body(error);
        }
        if (file.getSize() > MAX_IMAGE_BYTES) {
            error.put("error", "Image is too large (max 5MB).");
            return ResponseEntity.badRequest().body(error);
        }

        try {
            studentService.updateProfilePicture(studentId, file.getBytes(), contentType);
            Map<String, String> response = new HashMap<>();
            response.put("message", "Profile picture updated.");
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        } catch (IOException e) {
            error.put("error", "Failed to read the uploaded file.");
            return ResponseEntity.status(500).body(error);
        }
    }

    // Serve the stored profile picture bytes directly as an image
    @GetMapping("/{studentId}/profile-picture")
    public ResponseEntity<byte[]> getProfilePicture(@PathVariable Long studentId) {
        Optional<Student> student = studentService.getStudentById(studentId);
        if (student.isEmpty() || student.get().getProfilePicture() == null) {
            return ResponseEntity.notFound().build();
        }

        Student s = student.get();
        String contentType = s.getProfilePictureType() != null ? s.getProfilePictureType() : "image/png";
        return ResponseEntity.ok()
            .contentType(MediaType.parseMediaType(contentType))
            .header("Cache-Control", "no-cache")
            .body(s.getProfilePicture());
    }
}
