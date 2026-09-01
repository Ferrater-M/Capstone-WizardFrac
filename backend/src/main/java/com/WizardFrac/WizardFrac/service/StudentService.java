package com.WizardFrac.WizardFrac.service;

import com.WizardFrac.WizardFrac.entity.Student;
import com.WizardFrac.WizardFrac.repository.StudentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.Optional;

@Service
public class StudentService {
    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    // Thrown when a login/password-change attempt supplies the wrong password —
    // the controller turns this into a 401 with a user-facing message.
    public static class WrongPasswordException extends RuntimeException {
        public WrongPasswordException(String message) {
            super(message);
        }
    }

    // True if this nickname belongs to an already-claimed (password-protected) student.
    // An unregistered/unclaimed nickname (including one that doesn't exist yet) is false,
    // so the frontend offers to claim it instead of asking for a password.
    public boolean hasPassword(String nickname) {
        return studentRepository.findByNickname(nickname)
            .map(Student::hasPassword)
            .orElse(false);
    }

    // Find-or-create by nickname, but password-aware: a claimed nickname requires
    // the matching password; an unclaimed one logs in regardless, so it can then
    // be claimed via setPassword.
    public Student login(String nickname, String password) {
        Optional<Student> existingStudent = studentRepository.findByNickname(nickname);

        if (existingStudent.isEmpty()) {
            return studentRepository.save(new Student(nickname));
        }

        Student student = existingStudent.get();
        if (student.hasPassword()) {
            if (password == null || !passwordEncoder.matches(password, student.getPasswordHash())) {
                throw new WrongPasswordException("Incorrect password.");
            }
        }
        student.setLastLoginAt(LocalDateTime.now());
        return studentRepository.save(student);
    }

    // Set (claim) or change a student's password. If one is already set, currentPassword
    // must match it first — pass null/blank only when the nickname isn't claimed yet.
    public Student setPassword(Long studentId, String currentPassword, String newPassword) {
        Student student = studentRepository.findById(studentId)
            .orElseThrow(() -> new IllegalArgumentException("Student not found"));

        if (student.hasPassword()) {
            if (currentPassword == null || !passwordEncoder.matches(currentPassword, student.getPasswordHash())) {
                throw new WrongPasswordException("Current password is incorrect.");
            }
        }

        student.setPasswordHash(passwordEncoder.encode(newPassword));
        return studentRepository.save(student);
    }

    // Get student by ID
    public Optional<Student> getStudentById(Long id) {
        return studentRepository.findById(id);
    }

    // Get student by nickname
    public Optional<Student> getStudentByNickname(String nickname) {
        return studentRepository.findByNickname(nickname);
    }

    // True if another student already has this nickname (nickname is the login key, so it must stay unique)
    public boolean isNicknameTaken(String nickname, Long excludingStudentId) {
        return studentRepository.findByNickname(nickname)
            .map(existing -> !existing.getId().equals(excludingStudentId))
            .orElse(false);
    }

    public Student updateNickname(Long studentId, String newNickname) {
        Student student = studentRepository.findById(studentId)
            .orElseThrow(() -> new IllegalArgumentException("Student not found"));
        student.setNickname(newNickname);
        return studentRepository.save(student);
    }

    public Student updateProfilePicture(Long studentId, byte[] data, String contentType) {
        Student student = studentRepository.findById(studentId)
            .orElseThrow(() -> new IllegalArgumentException("Student not found"));
        student.setProfilePicture(data);
        student.setProfilePictureType(contentType);
        return studentRepository.save(student);
    }
}
