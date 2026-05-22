package com.WizardFrac.WizardFrac.dto;

public class GameSessionDTO {
    private Long id;
    private Long studentId;
    private String islandType;
    private Integer stageNumber;
    private Integer currentLives;
    private Integer activeStreak;
    private Double currentMultiplier;
    private Integer enemyHealth;
    private Integer score;
    private String status;

    // Constructors
    public GameSessionDTO() {}

    public GameSessionDTO(Long id, Long studentId, String islandType, Integer stageNumber,
                         Integer currentLives, Integer activeStreak, Double currentMultiplier,
                         Integer enemyHealth, Integer score, String status) {
        this.id = id;
        this.studentId = studentId;
        this.islandType = islandType;
        this.stageNumber = stageNumber;
        this.currentLives = currentLives;
        this.activeStreak = activeStreak;
        this.currentMultiplier = currentMultiplier;
        this.enemyHealth = enemyHealth;
        this.score = score;
        this.status = status;
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getStudentId() {
        return studentId;
    }

    public void setStudentId(Long studentId) {
        this.studentId = studentId;
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

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}
