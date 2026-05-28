package com.WizardFrac.WizardFrac.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "game_sessions")
public class GameSession {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", nullable = false)
    private Student student;

    @Column(nullable = false)
    private String islandType; // Similar, Dissimilar, Hybrid

    @Column(nullable = false)
    private Integer stageNumber;

    @Column(nullable = false)
    private Integer currentLives = 3;

    @Column(nullable = false)
    private Integer activeStreak = 0;

    @Column(nullable = false)
    private Double currentMultiplier = 1.0;

    @Column(nullable = false)
    private Integer enemyHealth;

    @Column(nullable = false)
    private Integer score = 0;

    @Column(nullable = false)
    private LocalDateTime startedAt;

    @Column(nullable = true)
    private LocalDateTime endedAt;

    @Column(nullable = false)
    private String status; // ACTIVE, COMPLETED, FAILED, PAUSED

    @Column(nullable = true, columnDefinition = "TEXT")
    private String sessionDataJson;

    public GameSession() {
        this.startedAt = LocalDateTime.now();
        this.status = "ACTIVE";
    }

    public GameSession(Student student, String islandType, Integer stageNumber) {
        this.student = student;
        this.islandType = islandType;
        this.stageNumber = stageNumber;
        this.startedAt = LocalDateTime.now();
        this.status = "ACTIVE";
        this.currentLives = 3;
        this.activeStreak = 0;
        this.currentMultiplier = 1.0;
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Student getStudent() {
        return student;
    }

    public void setStudent(Student student) {
        this.student = student;
    }

    public String getIslandType() {
        return islandType;
    }

    public void setIslandType(String islandType) {
        this.islandType = islandType;
    }

    public Integer getStageNumber() {
        return stageNumber;
    }

    public void setStageNumber(Integer stageNumber) {
        this.stageNumber = stageNumber;
    }

    public Integer getCurrentLives() {
        return currentLives;
    }

    public void setCurrentLives(Integer currentLives) {
        this.currentLives = currentLives;
    }

    public Integer getActiveStreak() {
        return activeStreak;
    }

    public void setActiveStreak(Integer activeStreak) {
        this.activeStreak = activeStreak;
    }

    public Double getCurrentMultiplier() {
        return currentMultiplier;
    }

    public void setCurrentMultiplier(Double currentMultiplier) {
        this.currentMultiplier = currentMultiplier;
    }

    public Integer getEnemyHealth() {
        return enemyHealth;
    }

    public void setEnemyHealth(Integer enemyHealth) {
        this.enemyHealth = enemyHealth;
    }

    public Integer getScore() {
        return score;
    }

    public void setScore(Integer score) {
        this.score = score;
    }

    public LocalDateTime getStartedAt() {
        return startedAt;
    }

    public void setStartedAt(LocalDateTime startedAt) {
        this.startedAt = startedAt;
    }

    public LocalDateTime getEndedAt() {
        return endedAt;
    }

    public void setEndedAt(LocalDateTime endedAt) {
        this.endedAt = endedAt;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getSessionDataJson() {
        return sessionDataJson;
    }

    public void setSessionDataJson(String sessionDataJson) {
        this.sessionDataJson = sessionDataJson;
    }
}
