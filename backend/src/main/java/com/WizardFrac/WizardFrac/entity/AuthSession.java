package com.WizardFrac.WizardFrac.entity;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;

/**
 * One logged-in game (a "login pass"). Created on login/register; the game sends the raw token with
 * every request (Authorization: Bearer ...) and the server looks it up here to know which player is
 * asking. Only the SHA-256 hash of the token is stored.
 */
@Entity
@Table(name = "auth_sessions", indexes = @Index(name = "idx_auth_sessions_student", columnList = "studentId"))
public class AuthSession {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 64)
    private String tokenHash;

    @Column(nullable = false)
    private Long studentId;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime expiresAt;

    public AuthSession() {}

    public AuthSession(String tokenHash, Long studentId, LocalDateTime expiresAt) {
        this.tokenHash = tokenHash;
        this.studentId = studentId;
        this.createdAt = LocalDateTime.now();
        this.expiresAt = expiresAt;
    }

    public Long getId() { return id; }
    public String getTokenHash() { return tokenHash; }
    public Long getStudentId() { return studentId; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getExpiresAt() { return expiresAt; }
}
