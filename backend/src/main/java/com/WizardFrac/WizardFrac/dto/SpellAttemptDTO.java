package com.WizardFrac.WizardFrac.dto;

public class SpellAttemptDTO {
    private Long gameSessionId;
    private String mechanicType;
    private String problemStatement;
    private String answerSubmitted;
    private String correctAnswer;
    private Boolean isCorrect;
    private String errorType;
    private Integer remainingLives;
    private Integer streakCount;
    private Double multiplierValue;
    private Integer enemyHealthBefore;
    private Integer enemyHealthAfter;
    private Integer pointsEarned;

    // Constructors
    public SpellAttemptDTO() {}

    public SpellAttemptDTO(Long gameSessionId, String mechanicType, String problemStatement,
                          String answerSubmitted, String correctAnswer, Boolean isCorrect,
                          String errorType, Integer remainingLives, Integer streakCount,
                          Double multiplierValue, Integer enemyHealthBefore, Integer enemyHealthAfter,
                          Integer pointsEarned) {
        this.gameSessionId = gameSessionId;
        this.mechanicType = mechanicType;
        this.problemStatement = problemStatement;
        this.answerSubmitted = answerSubmitted;
        this.correctAnswer = correctAnswer;
        this.isCorrect = isCorrect;
        this.errorType = errorType;
        this.remainingLives = remainingLives;
        this.streakCount = streakCount;
        this.multiplierValue = multiplierValue;
        this.enemyHealthBefore = enemyHealthBefore;
        this.enemyHealthAfter = enemyHealthAfter;
        this.pointsEarned = pointsEarned;
    }

    // Getters and Setters
    public Long getGameSessionId() {
        return gameSessionId;
    }

    public void setGameSessionId(Long gameSessionId) {
        this.gameSessionId = gameSessionId;
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

    public Integer getPointsEarned() {
        return pointsEarned;
    }

    public void setPointsEarned(Integer pointsEarned) {
        this.pointsEarned = pointsEarned;
    }
}
