package com.WizardFrac.WizardFrac.entity;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "game_progress")
public class GameProgress {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", nullable = false)
    private Student student;

    @Column(nullable = false)
    private Integer similarIslandMaxStage = 0;

    @Column(nullable = false)
    private Boolean dissimilarIslandUnlocked = false;

    @Column(nullable = false)
    private Integer dissimilarIslandMaxStage = 0;

    @Column(nullable = false)
    private Boolean hybridIslandUnlocked = false;

    @Column(nullable = false)
    private Integer hybridIslandMaxStage = 0;

    @Column(nullable = false)
    private Integer totalScore = 0;

    @Column(nullable = false)
    private Integer totalGamesPlayed = 0;

    @Column(nullable = false)
    private Integer totalGamesWon = 0;

    @Column(nullable = false)
    private LocalDateTime lastSessionEndedAt;

    @Column(nullable = true)
    private Long lastActiveSessionId;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @Column(nullable = false)
    private Integer starCurrency = 0;

    @Column(nullable = false)
    private Integer currentStreak = 0;

    @Column(nullable = true)
    private LocalDate lastActiveDate;

    @Column(nullable = false)
    private Integer dailyQuestProgress = 0;

    @Column(nullable = true)
    private LocalDate dailyQuestDate;

    @Column(nullable = false)
    private Boolean dailyQuestClaimed = false;

    public GameProgress() {
        this.updatedAt = LocalDateTime.now();
        this.lastSessionEndedAt = LocalDateTime.now();
    }

    public GameProgress(Student student) {
        this.student = student;
        this.updatedAt = LocalDateTime.now();
        this.lastSessionEndedAt = LocalDateTime.now();
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

    public Integer getSimilarIslandMaxStage() {
        return similarIslandMaxStage;
    }

    public void setSimilarIslandMaxStage(Integer similarIslandMaxStage) {
        this.similarIslandMaxStage = similarIslandMaxStage;
    }

    public Boolean getDissimilarIslandUnlocked() {
        return dissimilarIslandUnlocked;
    }

    public void setDissimilarIslandUnlocked(Boolean dissimilarIslandUnlocked) {
        this.dissimilarIslandUnlocked = dissimilarIslandUnlocked;
    }

    public Integer getDissimilarIslandMaxStage() {
        return dissimilarIslandMaxStage;
    }

    public void setDissimilarIslandMaxStage(Integer dissimilarIslandMaxStage) {
        this.dissimilarIslandMaxStage = dissimilarIslandMaxStage;
    }

    public Boolean getHybridIslandUnlocked() {
        return hybridIslandUnlocked;
    }

    public void setHybridIslandUnlocked(Boolean hybridIslandUnlocked) {
        this.hybridIslandUnlocked = hybridIslandUnlocked;
    }

    public Integer getHybridIslandMaxStage() {
        return hybridIslandMaxStage;
    }

    public void setHybridIslandMaxStage(Integer hybridIslandMaxStage) {
        this.hybridIslandMaxStage = hybridIslandMaxStage;
    }

    public Integer getTotalScore() {
        return totalScore;
    }

    public void setTotalScore(Integer totalScore) {
        this.totalScore = totalScore;
    }

    public Integer getTotalGamesPlayed() {
        return totalGamesPlayed;
    }

    public void setTotalGamesPlayed(Integer totalGamesPlayed) {
        this.totalGamesPlayed = totalGamesPlayed;
    }

    public Integer getTotalGamesWon() {
        return totalGamesWon;
    }

    public void setTotalGamesWon(Integer totalGamesWon) {
        this.totalGamesWon = totalGamesWon;
    }

    public LocalDateTime getLastSessionEndedAt() {
        return lastSessionEndedAt;
    }

    public void setLastSessionEndedAt(LocalDateTime lastSessionEndedAt) {
        this.lastSessionEndedAt = lastSessionEndedAt;
    }

    public Long getLastActiveSessionId() {
        return lastActiveSessionId;
    }

    public void setLastActiveSessionId(Long lastActiveSessionId) {
        this.lastActiveSessionId = lastActiveSessionId;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    public Integer getStarCurrency() {
        return starCurrency;
    }

    public void setStarCurrency(Integer starCurrency) {
        this.starCurrency = starCurrency;
    }

    public Integer getCurrentStreak() {
        return currentStreak;
    }

    public void setCurrentStreak(Integer currentStreak) {
        this.currentStreak = currentStreak;
    }

    public LocalDate getLastActiveDate() {
        return lastActiveDate;
    }

    public void setLastActiveDate(LocalDate lastActiveDate) {
        this.lastActiveDate = lastActiveDate;
    }

    public Integer getDailyQuestProgress() {
        return dailyQuestProgress;
    }

    public void setDailyQuestProgress(Integer dailyQuestProgress) {
        this.dailyQuestProgress = dailyQuestProgress;
    }

    public LocalDate getDailyQuestDate() {
        return dailyQuestDate;
    }

    public void setDailyQuestDate(LocalDate dailyQuestDate) {
        this.dailyQuestDate = dailyQuestDate;
    }

    public Boolean getDailyQuestClaimed() {
        return dailyQuestClaimed;
    }

    public void setDailyQuestClaimed(Boolean dailyQuestClaimed) {
        this.dailyQuestClaimed = dailyQuestClaimed;
    }
}
