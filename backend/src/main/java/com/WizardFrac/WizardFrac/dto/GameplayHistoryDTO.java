package com.WizardFrac.WizardFrac.dto;

public class GameplayHistoryDTO {
    private String nickname;
    private String island;
    private Integer level;
    private Integer hintsUsed;
    private String hintLabel;
    private Integer points;
    private Integer correctAnswers;
    private String status;

    public GameplayHistoryDTO() {}

    public GameplayHistoryDTO(String nickname, String island, Integer level,
                              Integer hintsUsed, String hintLabel,
                              Integer points, Integer correctAnswers, String status) {
        this.nickname = nickname;
        this.island = island;
        this.level = level;
        this.hintsUsed = hintsUsed;
        this.hintLabel = hintLabel;
        this.points = points;
        this.correctAnswers = correctAnswers;
        this.status = status;
    }

    public String getNickname() {
        return nickname;
    }

    public void setNickname(String nickname) {
        this.nickname = nickname;
    }

    public String getIsland() {
        return island;
    }

    public void setIsland(String island) {
        this.island = island;
    }

    public Integer getLevel() {
        return level;
    }

    public void setLevel(Integer level) {
        this.level = level;
    }

    public Integer getHintsUsed() {
        return hintsUsed;
    }

    public void setHintsUsed(Integer hintsUsed) {
        this.hintsUsed = hintsUsed;
    }

    public String getHintLabel() {
        return hintLabel;
    }

    public void setHintLabel(String hintLabel) {
        this.hintLabel = hintLabel;
    }

    public Integer getPoints() {
        return points;
    }

    public void setPoints(Integer points) {
        this.points = points;
    }

    public Integer getCorrectAnswers() {
        return correctAnswers;
    }

    public void setCorrectAnswers(Integer correctAnswers) {
        this.correctAnswers = correctAnswers;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}
