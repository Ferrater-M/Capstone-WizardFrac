package com.WizardFrac.WizardFrac.controller;

import com.WizardFrac.WizardFrac.entity.Student;
import com.WizardFrac.WizardFrac.service.StudentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/students")
@CrossOrigin(origins = "*")
public class StudentController {
    @Autowired
    private StudentService studentService;

    // Login/Create student endpoint
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> request) {
        String nickname = request.get("nickname");
        if (nickname == null || nickname.trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Nickname is required");
        }

        // Check if nickname already exists — reject duplicates
        Optional<Student> existing = studentService.getStudentByNickname(nickname);
        if (existing.isPresent()) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Nickname is not available. Please use another nickname.");
            return ResponseEntity.status(409).body(error);
        }

        Student student = studentService.findOrCreateStudent(nickname);
        
        Map<String, Object> response = new HashMap<>();
        response.put("studentId", student.getId());
        response.put("nickname", student.getNickname());
        response.put("selectedCharacterId", student.getSelectedCharacterId());
        response.put("createdAt", student.getCreatedAt());
        
        return ResponseEntity.ok(response);
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
        response.put("lastLoginAt", s.getLastLoginAt());
        
        return ResponseEntity.ok(response);
    }
}
