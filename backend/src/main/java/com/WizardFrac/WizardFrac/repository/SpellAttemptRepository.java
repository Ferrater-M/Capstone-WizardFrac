package com.WizardFrac.WizardFrac.repository;

import com.WizardFrac.WizardFrac.entity.SpellAttempt;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface SpellAttemptRepository extends JpaRepository<SpellAttempt, Long> {
    List<SpellAttempt> findByGameSessionIdOrderByTimestamp(Long gameSessionId);
}
