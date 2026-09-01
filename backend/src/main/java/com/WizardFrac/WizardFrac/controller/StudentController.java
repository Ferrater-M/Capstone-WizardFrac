package com.WizardFrac.WizardFrac.controller;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
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

import com.WizardFrac.WizardFrac.entity.Student;
import com.WizardFrac.WizardFrac.service.StudentService;

@RestController
@RequestMapping("/api/students")
@CrossOrigin(origins = "*")
public class StudentController {
    private static final long MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB
    private static final int MAX_NICKNAME_LENGTH = 30;

    @Autowired
    private StudentService studentService;

    // Login/Create student endpoint. `password` is only required once the nickname
    // is claimed (see /check-nickname) — an unclaimed nickname logs in regardless.
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> request) {
        String nickname = request.get("nickname");
        if (nickname == null || nickname.trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Nickname is required");
        }

        Student student;
        try {
            student = studentService.login(nickname.trim(), request.get("password"));
        } catch (StudentService.WrongPasswordException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.status(401).body(error);
        }

        Map<String, Object> response = new HashMap<>();
        response.put("studentId", student.getId());
        response.put("nickname", student.getNickname());
        response.put("selectedCharacterId", student.getSelectedCharacterId());
        response.put("selectedCharacterName", student.getSelectedCharacterName());
        response.put("createdAt", student.getCreatedAt());
        response.put("hasPassword", student.hasPassword());

        return ResponseEntity.ok(response);
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
    public ResponseEntity<?> updatePassword(@PathVariable Long studentId, @RequestBody Map<String, String> request) {
        Map<String, String> error = new HashMap<>();
        String newPassword = request.get("newPassword");

        if (newPassword == null || newPassword.length() < 4) {
            error.put("error", "New password must be at least 4 characters.");
            return ResponseEntity.badRequest().body(error);
        }

        try {
            studentService.setPassword(studentId, request.get("currentPassword"), newPassword);
            Map<String, String> response = new HashMap<>();
            response.put("message", "Password updated.");
            return ResponseEntity.ok(response);
        } catch (StudentService.WrongPasswordException e) {
            error.put("error", e.getMessage());
            return ResponseEntity.status(401).body(error);
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

        return ResponseEntity.ok(response);
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
