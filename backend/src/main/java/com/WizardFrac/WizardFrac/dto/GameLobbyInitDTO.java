package com.WizardFrac.WizardFrac.dto;

public class GameLobbyInitDTO {
    private Long sessionId;
    private String islandType;
    private Integer stageNumber;
    private String firstProblem;
    private String mechanicType;
    private Integer enemyHealth;
    private Integer lives;

    // Constructors
    public GameLobbyInitDTO() {}

    public GameLobbyInitDTO(Long sessionId, String islandType, Integer stageNumber,
                           String firstProblem, String mechanicType, Integer enemyHealth, Integer lives) {
        this.sessionId = sessionId;
        this.islandType = islandType;
        this.stageNumber = stageNumber;
        this.firstProblem = firstProblem;
        this.mechanicType = mechanicType;
        this.enemyHealth = enemyHealth;
        this.lives = lives;
    }

    // Getters and Setters
    public Long getSessionId() {
        return sessionId;
    }

    public void setSessionId(Long sessionId) {
        this.sessionId = sessionId;
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

    public String getFirstProblem() {
        return firstProblem;
    }

    public void setFirstProblem(String firstProblem) {
        this.firstProblem = firstProblem;
    }

    public String getMechanicType() {
        return mechanicType;
    }

    public void setMechanicType(String mechanicType) {
        this.mechanicType = mechanicType;
    }

    public Integer getEnemyHealth() {
        return enemyHealth;
    }

    public void setEnemyHealth(Integer enemyHealth) {
        this.enemyHealth = enemyHealth;
    }

    public Integer getLives() {
        return lives;
    }

    public void setLives(Integer lives) {
        this.lives = lives;
    }
}
