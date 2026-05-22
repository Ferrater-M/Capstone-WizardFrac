package com.WizardFrac.WizardFrac.dto;

public class GameProgressDTO {
    private Long studentId;
    private Integer similarIslandMaxStage;
    private Boolean dissimilarIslandUnlocked;
    private Integer dissimilarIslandMaxStage;
    private Boolean hybridIslandUnlocked;
    private Integer hybridIslandMaxStage;
    private Integer totalScore;
    private Integer totalGamesPlayed;
    private Integer totalGamesWon;

    // Constructors
    public GameProgressDTO() {}

    public GameProgressDTO(Long studentId, Integer similarIslandMaxStage,
                          Boolean dissimilarIslandUnlocked, Integer dissimilarIslandMaxStage,
                          Boolean hybridIslandUnlocked, Integer hybridIslandMaxStage,
                          Integer totalScore, Integer totalGamesPlayed, Integer totalGamesWon) {
        this.studentId = studentId;
        this.similarIslandMaxStage = similarIslandMaxStage;
        this.dissimilarIslandUnlocked = dissimilarIslandUnlocked;
        this.dissimilarIslandMaxStage = dissimilarIslandMaxStage;
        this.hybridIslandUnlocked = hybridIslandUnlocked;
        this.hybridIslandMaxStage = hybridIslandMaxStage;
        this.totalScore = totalScore;
        this.totalGamesPlayed = totalGamesPlayed;
        this.totalGamesWon = totalGamesWon;
    }

    // Getters and Setters
    public Long getStudentId() {
        return studentId;
    }

    public void setStudentId(Long studentId) {
        this.studentId = studentId;
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
}
