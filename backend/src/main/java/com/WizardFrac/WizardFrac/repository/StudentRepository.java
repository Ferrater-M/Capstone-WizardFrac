package com.WizardFrac.WizardFrac.repository;

import com.WizardFrac.WizardFrac.entity.Student;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface StudentRepository extends JpaRepository<Student, Long> {
    Optional<Student> findByNickname(String nickname);
    Optional<Student> findByEmailVerificationTokenHash(String emailVerificationTokenHash);
    Optional<Student> findByPasswordResetTokenHash(String passwordResetTokenHash);
    // `email` only ever holds VERIFIED addresses, so this means "another wizard already verified it".
    boolean existsByEmailAndIdNot(String email, Long id);
}
