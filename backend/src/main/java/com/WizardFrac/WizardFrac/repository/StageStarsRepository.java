package com.WizardFrac.WizardFrac.repository;

import com.WizardFrac.WizardFrac.entity.StageStars;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface StageStarsRepository extends JpaRepository<StageStars, Long> {
    List<StageStars> findByStudentId(Long studentId);

    Optional<StageStars> findByStudentIdAndIslandTypeAndStageNumber(
        Long studentId, String islandType, Integer stageNumber
    );
}
