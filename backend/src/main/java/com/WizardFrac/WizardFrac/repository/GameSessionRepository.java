package com.WizardFrac.WizardFrac.repository;

import com.WizardFrac.WizardFrac.entity.GameSession;
import com.WizardFrac.WizardFrac.entity.Student;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface GameSessionRepository extends JpaRepository<GameSession, Long> {
    List<GameSession> findByStudentIdOrderByStartedAtDesc(Long studentId);
    Optional<GameSession> findTopByStudentIdAndStatusOrderByStartedAtDesc(Long studentId, String status);
    List<GameSession> findByStudentIdAndStatus(Long studentId, String status);
}
