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
    private Integer level;
    private Integer xpIntoLevel;
    private Integer xpForNextLevel;
    private String wizardRank;
    private Integer starCurrency;
    private Integer currentStreak;
    private Integer dailyQuestProgress;
    private Integer dailyQuestTarget;
    private Boolean dailyQuestClaimed;

    // Constructors
    public GameProgressDTO() {}

    public GameProgressDTO(Long studentId, Integer similarIslandMaxStage,
                          Boolean dissimilarIslandUnlocked, Integer dissimilarIslandMaxStage,
                          Boolean hybridIslandUnlocked, Integer hybridIslandMaxStage,
                          Integer totalScore, Integer totalGamesPlayed, Integer totalGamesWon,
                          Integer level, Integer xpIntoLevel, Integer xpForNextLevel, String wizardRank,
                          Integer starCurrency, Integer currentStreak,
                          Integer dailyQuestProgress, Integer dailyQuestTarget, Boolean dailyQuestClaimed) {
        this.studentId = studentId;
        this.similarIslandMaxStage = similarIslandMaxStage;
        this.dissimilarIslandUnlocked = dissimilarIslandUnlocked;
        this.dissimilarIslandMaxStage = dissimilarIslandMaxStage;
        this.hybridIslandUnlocked = hybridIslandUnlocked;
        this.hybridIslandMaxStage = hybridIslandMaxStage;
        this.totalScore = totalScore;
        this.totalGamesPlayed = totalGamesPlayed;
        this.totalGamesWon = totalGamesWon;
        this.level = level;
        this.xpIntoLevel = xpIntoLevel;
        this.xpForNextLevel = xpForNextLevel;
        this.wizardRank = wizardRank;
        this.starCurrency = starCurrency;
        this.currentStreak = currentStreak;
        this.dailyQuestProgress = dailyQuestProgress;
        this.dailyQuestTarget = dailyQuestTarget;
        this.dailyQuestClaimed = dailyQuestClaimed;
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

    public Integer getLevel() {
        return level;
    }

    public void setLevel(Integer level) {
        this.level = level;
    }

    public Integer getXpIntoLevel() {
        return xpIntoLevel;
    }

    public void setXpIntoLevel(Integer xpIntoLevel) {
        this.xpIntoLevel = xpIntoLevel;
    }

    public Integer getXpForNextLevel() {
        return xpForNextLevel;
    }

    public void setXpForNextLevel(Integer xpForNextLevel) {
        this.xpForNextLevel = xpForNextLevel;
    }

    public String getWizardRank() {
        return wizardRank;
    }

    public void setWizardRank(String wizardRank) {
        this.wizardRank = wizardRank;
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

    public Integer getDailyQuestProgress() {
        return dailyQuestProgress;
    }

    public void setDailyQuestProgress(Integer dailyQuestProgress) {
        this.dailyQuestProgress = dailyQuestProgress;
    }

    public Integer getDailyQuestTarget() {
        return dailyQuestTarget;
    }

    public void setDailyQuestTarget(Integer dailyQuestTarget) {
        this.dailyQuestTarget = dailyQuestTarget;
    }

    public Boolean getDailyQuestClaimed() {
        return dailyQuestClaimed;
    }

    public void setDailyQuestClaimed(Boolean dailyQuestClaimed) {
        this.dailyQuestClaimed = dailyQuestClaimed;
    }
}
