package com.WizardFrac.WizardFrac.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "spell_attempts")
public class SpellAttempt {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "game_session_id", nullable = false)
    private GameSession gameSession;

    @Column(nullable = false)
    private String mechanicType; // SameContainer, ButterflyMethod, MixedConversion

    @Column(nullable = false)
    private String problemStatement;

    @Column(nullable = false)
    private String answerSubmitted;

    @Column(nullable = false)
    private String correctAnswer;

    @Column(nullable = false)
    private Boolean isCorrect;

    @Column(nullable = true)
    private String errorType; // null if correct, otherwise description of error

    @Column(nullable = false)
    private Integer remainingLives;

    @Column(nullable = false)
    private Integer streakCount;

    @Column(nullable = false)
    private Double multiplierValue;

    @Column(nullable = false)
    private Integer enemyHealthBefore;

    @Column(nullable = false)
    private Integer enemyHealthAfter;

    @Column(nullable = false)
    private LocalDateTime timestamp;

    @Column(nullable = false)
    private Integer pointsEarned;

    public SpellAttempt() {
        this.timestamp = LocalDateTime.now();
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public GameSession getGameSession() {
        return gameSession;
    }

    public void setGameSession(GameSession gameSession) {
        this.gameSession = gameSession;
    }

    public String getMechanicType() {
        return mechanicType;
    }

    public void setMechanicType(String mechanicType) {
        this.mechanicType = mechanicType;
    }

    public String getProblemStatement() {
        return problemStatement;
    }

    public void setProblemStatement(String problemStatement) {
        this.problemStatement = problemStatement;
    }

    public String getAnswerSubmitted() {
        return answerSubmitted;
    }

    public void setAnswerSubmitted(String answerSubmitted) {
        this.answerSubmitted = answerSubmitted;
    }

    public String getCorrectAnswer() {
        return correctAnswer;
    }

    public void setCorrectAnswer(String correctAnswer) {
        this.correctAnswer = correctAnswer;
    }

    public Boolean getIsCorrect() {
        return isCorrect;
    }

    public void setIsCorrect(Boolean isCorrect) {
        this.isCorrect = isCorrect;
    }

    public String getErrorType() {
        return errorType;
    }

    public void setErrorType(String errorType) {
        this.errorType = errorType;
    }

    public Integer getRemainingLives() {
        return remainingLives;
    }

    public void setRemainingLives(Integer remainingLives) {
        this.remainingLives = remainingLives;
    }

    public Integer getStreakCount() {
        return streakCount;
    }

    public void setStreakCount(Integer streakCount) {
        this.streakCount = streakCount;
    }

    public Double getMultiplierValue() {
        return multiplierValue;
    }

    public void setMultiplierValue(Double multiplierValue) {
        this.multiplierValue = multiplierValue;
    }

    public Integer getEnemyHealthBefore() {
        return enemyHealthBefore;
    }

    public void setEnemyHealthBefore(Integer enemyHealthBefore) {
        this.enemyHealthBefore = enemyHealthBefore;
    }

    public Integer getEnemyHealthAfter() {
        return enemyHealthAfter;
    }

    public void setEnemyHealthAfter(Integer enemyHealthAfter) {
        this.enemyHealthAfter = enemyHealthAfter;
    }

    public LocalDateTime getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(LocalDateTime timestamp) {
        this.timestamp = timestamp;
    }

    public Integer getPointsEarned() {
        return pointsEarned;
    }

    public void setPointsEarned(Integer pointsEarned) {
        this.pointsEarned = pointsEarned;
    }
}
