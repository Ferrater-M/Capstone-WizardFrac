package com.WizardFrac.WizardFrac.service;

import com.WizardFrac.WizardFrac.entity.Student;
import com.WizardFrac.WizardFrac.repository.StudentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.Optional;

@Service
public class StudentService {
    @Autowired
    private StudentRepository studentRepository;

    // Find or create student by nickname (for login)
    public Student findOrCreateStudent(String nickname) {
        Optional<Student> existingStudent = studentRepository.findByNickname(nickname);
        
        if (existingStudent.isPresent()) {
            Student student = existingStudent.get();
            student.setLastLoginAt(LocalDateTime.now());
            return studentRepository.save(student);
        }

        // Create new student
        Student newStudent = new Student(nickname);
        return studentRepository.save(newStudent);
    }

    // Get student by ID
    public Optional<Student> getStudentById(Long id) {
        return studentRepository.findById(id);
    }

    // Get student by nickname
    public Optional<Student> getStudentByNickname(String nickname) {
        return studentRepository.findByNickname(nickname);
    }
}
