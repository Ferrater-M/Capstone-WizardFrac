package com.WizardFrac.WizardFrac.dto;

import java.util.List;
import java.util.Map;

public class DiagnosticsDTO {
    private List<CompetencyMasteryDTO> competencies;
    private SummaryDTO summary;
    private List<GameplayHistoryDTO> gameHistory;
    private List<MisconceptionDTO> dissimilarMisconceptions;

    public DiagnosticsDTO() {}

    public DiagnosticsDTO(List<CompetencyMasteryDTO> competencies, SummaryDTO summary,
                          List<GameplayHistoryDTO> gameHistory, List<MisconceptionDTO> dissimilarMisconceptions) {
        this.competencies = competencies;
        this.summary = summary;
        this.gameHistory = gameHistory;
        this.dissimilarMisconceptions = dissimilarMisconceptions;
    }

    public List<MisconceptionDTO> getDissimilarMisconceptions() {
        return dissimilarMisconceptions;
    }

    public void setDissimilarMisconceptions(List<MisconceptionDTO> dissimilarMisconceptions) {
        this.dissimilarMisconceptions = dissimilarMisconceptions;
    }

    public List<CompetencyMasteryDTO> getCompetencies() {
        return competencies;
    }

    public void setCompetencies(List<CompetencyMasteryDTO> competencies) {
        this.competencies = competencies;
    }

    public SummaryDTO getSummary() {
        return summary;
    }

    public void setSummary(SummaryDTO summary) {
        this.summary = summary;
    }

    public List<GameplayHistoryDTO> getGameHistory() {
        return gameHistory;
    }

    public void setGameHistory(List<GameplayHistoryDTO> gameHistory) {
        this.gameHistory = gameHistory;
    }

    public static class CompetencyMasteryDTO {
        private String competencyId;
        private String competencyName;
        private String masteryLevel; // Beginner, Developing, Proficient
        private Double accuracy;
        private List<Double> trendData;

        public CompetencyMasteryDTO() {}

        public CompetencyMasteryDTO(String competencyId, String competencyName, String masteryLevel, Double accuracy, List<Double> trendData) {
            this.competencyId = competencyId;
            this.competencyName = competencyName;
            this.masteryLevel = masteryLevel;
            this.accuracy = accuracy;
            this.trendData = trendData;
        }

        public String getCompetencyId() {
            return competencyId;
        }

        public void setCompetencyId(String competencyId) {
            this.competencyId = competencyId;
        }

        public String getCompetencyName() {
            return competencyName;
        }

        public void setCompetencyName(String competencyName) {
            this.competencyName = competencyName;
        }

        public String getMasteryLevel() {
            return masteryLevel;
        }

        public void setMasteryLevel(String masteryLevel) {
            this.masteryLevel = masteryLevel;
        }

        public Double getAccuracy() {
            return accuracy;
        }

        public void setAccuracy(Double accuracy) {
            this.accuracy = accuracy;
        }

        public List<Double> getTrendData() {
            return trendData;
        }

        public void setTrendData(List<Double> trendData) {
            this.trendData = trendData;
        }
    }

    public static class SummaryDTO {
        private Integer totalCorrect;
        private Integer totalIncorrect;
        private Integer totalSessions;
        private Double averageMultiplier;
        private Integer totalScore;
        private String wizardRank; // Apprentice, Mage, Archmage, Grand Wizard

        public SummaryDTO() {}

        public SummaryDTO(Integer totalCorrect, Integer totalIncorrect, Integer totalSessions, Double averageMultiplier,
                          Integer totalScore, String wizardRank) {
            this.totalCorrect = totalCorrect;
            this.totalIncorrect = totalIncorrect;
            this.totalSessions = totalSessions;
            this.averageMultiplier = averageMultiplier;
            this.totalScore = totalScore;
            this.wizardRank = wizardRank;
        }

        public Integer getTotalScore() {
            return totalScore;
        }

        public void setTotalScore(Integer totalScore) {
            this.totalScore = totalScore;
        }

        public String getWizardRank() {
            return wizardRank;
        }

        public void setWizardRank(String wizardRank) {
            this.wizardRank = wizardRank;
        }

        public Integer getTotalCorrect() {
            return totalCorrect;
        }

        public void setTotalCorrect(Integer totalCorrect) {
            this.totalCorrect = totalCorrect;
        }

        public Integer getTotalIncorrect() {
            return totalIncorrect;
        }

        public void setTotalIncorrect(Integer totalIncorrect) {
            this.totalIncorrect = totalIncorrect;
        }

        public Integer getTotalSessions() {
            return totalSessions;
        }

        public void setTotalSessions(Integer totalSessions) {
            this.totalSessions = totalSessions;
        }

        public Double getAverageMultiplier() {
            return averageMultiplier;
        }

        public void setAverageMultiplier(Double averageMultiplier) {
            this.averageMultiplier = averageMultiplier;
        }
    }

    public static class MisconceptionDTO {
        private String errorType;
        private String label;
        private Integer count;
        private Boolean recurring; // true once the same misconception appears 2+ times

        public MisconceptionDTO() {}

        public MisconceptionDTO(String errorType, String label, Integer count, Boolean recurring) {
            this.errorType = errorType;
            this.label = label;
            this.count = count;
            this.recurring = recurring;
        }

        public String getErrorType() {
            return errorType;
        }

        public void setErrorType(String errorType) {
            this.errorType = errorType;
        }

        public String getLabel() {
            return label;
        }

        public void setLabel(String label) {
            this.label = label;
        }

        public Integer getCount() {
            return count;
        }

        public void setCount(Integer count) {
            this.count = count;
        }

        public Boolean getRecurring() {
            return recurring;
        }

        public void setRecurring(Boolean recurring) {
            this.recurring = recurring;
        }
    }
}
