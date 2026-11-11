package com.WizardFrac.WizardFrac.repository;

import com.WizardFrac.WizardFrac.entity.GameSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface GameSessionRepository extends JpaRepository<GameSession, Long> {
    List<GameSession> findByStudentIdOrderByStartedAtDesc(Long studentId);
}
