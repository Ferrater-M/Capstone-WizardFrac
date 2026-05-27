package com.WizardFrac.WizardFrac.dto;

import java.util.List;
import java.util.Map;

public class DiagnosticsDTO {
    private List<CompetencyMasteryDTO> competencies;
    private SummaryDTO summary;
    private List<StreakHistoryDTO> streakHistory;

    public DiagnosticsDTO() {}

    public DiagnosticsDTO(List<CompetencyMasteryDTO> competencies, SummaryDTO summary, List<StreakHistoryDTO> streakHistory) {
        this.competencies = competencies;
        this.summary = summary;
        this.streakHistory = streakHistory;
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

    public List<StreakHistoryDTO> getStreakHistory() {
        return streakHistory;
    }

    public void setStreakHistory(List<StreakHistoryDTO> streakHistory) {
        this.streakHistory = streakHistory;
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

        public SummaryDTO() {}

        public SummaryDTO(Integer totalCorrect, Integer totalIncorrect, Integer totalSessions, Double averageMultiplier) {
            this.totalCorrect = totalCorrect;
            this.totalIncorrect = totalIncorrect;
            this.totalSessions = totalSessions;
            this.averageMultiplier = averageMultiplier;
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

    public static class StreakHistoryDTO {
        private String sessionDate;
        private Integer peakStreak;

        public StreakHistoryDTO() {}

        public StreakHistoryDTO(String sessionDate, Integer peakStreak) {
            this.sessionDate = sessionDate;
            this.peakStreak = peakStreak;
        }

        public String getSessionDate() {
            return sessionDate;
        }

        public void setSessionDate(String sessionDate) {
            this.sessionDate = sessionDate;
        }

        public Integer getPeakStreak() {
            return peakStreak;
        }

        public void setPeakStreak(Integer peakStreak) {
            this.peakStreak = peakStreak;
        }
    }
}
