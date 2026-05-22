package com.WizardFrac.WizardFrac.repository;

import com.WizardFrac.WizardFrac.entity.GameProgress;
import com.WizardFrac.WizardFrac.entity.Student;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface GameProgressRepository extends JpaRepository<GameProgress, Long> {
    Optional<GameProgress> findByStudentId(Long studentId);
}
