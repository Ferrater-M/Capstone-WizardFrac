package com.WizardFrac.WizardFrac.repository;

import com.WizardFrac.WizardFrac.entity.AuthSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface AuthSessionRepository extends JpaRepository<AuthSession, Long> {
    Optional<AuthSession> findByTokenHash(String tokenHash);

    @Modifying
    @Transactional
    @Query("DELETE FROM AuthSession s WHERE s.tokenHash = :hash")
    int deleteByTokenHash(@Param("hash") String hash);

    // Log out every other game of this player (after a password change).
    @Modifying
    @Transactional
    @Query("DELETE FROM AuthSession s WHERE s.studentId = :studentId AND s.tokenHash <> :keepHash")
    int deleteOthers(@Param("studentId") Long studentId, @Param("keepHash") String keepHash);

    @Modifying
    @Transactional
    @Query("DELETE FROM AuthSession s WHERE s.studentId = :studentId")
    int deleteAllForStudent(@Param("studentId") Long studentId);

    @Modifying
    @Transactional
    @Query("DELETE FROM AuthSession s WHERE s.expiresAt < :now")
    int deleteExpired(@Param("now") LocalDateTime now);
}
