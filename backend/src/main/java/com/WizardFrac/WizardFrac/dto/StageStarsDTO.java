package com.WizardFrac.WizardFrac.dto;

public class StageStarsDTO {
    private String islandType;
    private Integer stageNumber;
    private Integer stars;

    public StageStarsDTO() {}

    public StageStarsDTO(String islandType, Integer stageNumber, Integer stars) {
        this.islandType = islandType;
        this.stageNumber = stageNumber;
        this.stars = stars;
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

    public Integer getStars() {
        return stars;
    }

    public void setStars(Integer stars) {
        this.stars = stars;
    }
}
