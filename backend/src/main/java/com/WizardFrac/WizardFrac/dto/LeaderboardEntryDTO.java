package com.WizardFrac.WizardFrac.dto;

public class LeaderboardEntryDTO {
    private int rank;
    private Long studentId;
    private String nickname;
    private Integer totalScore;
    private Integer level;
    private String wizardRank;
    private String topIsland;

    public LeaderboardEntryDTO() {}

    public LeaderboardEntryDTO(int rank, Long studentId, String nickname, Integer totalScore,
                                Integer level, String wizardRank, String topIsland) {
        this.rank = rank;
        this.studentId = studentId;
        this.nickname = nickname;
        this.totalScore = totalScore;
        this.level = level;
        this.wizardRank = wizardRank;
        this.topIsland = topIsland;
    }

    public int getRank() {
        return rank;
    }

    public void setRank(int rank) {
        this.rank = rank;
    }

    public Long getStudentId() {
        return studentId;
    }

    public void setStudentId(Long studentId) {
        this.studentId = studentId;
    }

    public String getNickname() {
        return nickname;
    }

    public void setNickname(String nickname) {
        this.nickname = nickname;
    }

    public Integer getTotalScore() {
        return totalScore;
    }

    public void setTotalScore(Integer totalScore) {
        this.totalScore = totalScore;
    }

    public Integer getLevel() {
        return level;
    }

    public void setLevel(Integer level) {
        this.level = level;
    }

    public String getWizardRank() {
        return wizardRank;
    }

    public void setWizardRank(String wizardRank) {
        this.wizardRank = wizardRank;
    }

    public String getTopIsland() {
        return topIsland;
    }

    public void setTopIsland(String topIsland) {
        this.topIsland = topIsland;
    }
}
