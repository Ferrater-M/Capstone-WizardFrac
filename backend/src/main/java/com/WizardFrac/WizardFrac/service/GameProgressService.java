package com.WizardFrac.WizardFrac.service;

import com.WizardFrac.WizardFrac.entity.*;
import com.WizardFrac.WizardFrac.repository.*;
import com.WizardFrac.WizardFrac.dto.SpellAttemptDTO;
import com.WizardFrac.WizardFrac.dto.DiagnosticsDTO;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class GameProgressService {
    @Autowired
    private GameProgressRepository gameProgressRepository;

    @Autowired
    private GameSessionRepository gameSessionRepository;

    @Autowired
    private SpellAttemptRepository spellAttemptRepository;

    @Autowired
    private StudentRepository studentRepository;

    private ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

    // Save spell attempt to database (UC-1.2 - automatic recording of spell submissions)
    public SpellAttempt recordSpellAttempt(Long gameSessionId, SpellAttemptDTO attemptDTO) {
        Optional<GameSession> sessionOpt = gameSessionRepository.findById(gameSessionId);
        if (sessionOpt.isEmpty()) {
            throw new RuntimeException("Game session not found");
        }

        GameSession session = sessionOpt.get();
        SpellAttempt attempt = new SpellAttempt();
        attempt.setGameSession(session);
        attempt.setMechanicType(attemptDTO.getMechanicType());
        attempt.setProblemStatement(attemptDTO.getProblemStatement());
        attempt.setAnswerSubmitted(attemptDTO.getAnswerSubmitted());
        attempt.setCorrectAnswer(attemptDTO.getCorrectAnswer());
        attempt.setIsCorrect(attemptDTO.getIsCorrect());
        attempt.setErrorType(attemptDTO.getErrorType());
        attempt.setRemainingLives(attemptDTO.getRemainingLives());
        attempt.setStreakCount(attemptDTO.getStreakCount());
        attempt.setMultiplierValue(attemptDTO.getMultiplierValue());
        attempt.setEnemyHealthBefore(attemptDTO.getEnemyHealthBefore());
        attempt.setEnemyHealthAfter(attemptDTO.getEnemyHealthAfter());
        attempt.setPointsEarned(attemptDTO.getPointsEarned());
        attempt.setTimestamp(LocalDateTime.now());

        // Update session stats
        session.setCurrentLives(attemptDTO.getRemainingLives());
        session.setActiveStreak(attemptDTO.getStreakCount());
        session.setCurrentMultiplier(attemptDTO.getMultiplierValue());
        session.setEnemyHealth(attemptDTO.getEnemyHealthAfter());
        session.setScore(session.getScore() + attemptDTO.getPointsEarned());
        gameSessionRepository.save(session);

        return spellAttemptRepository.save(attempt);
    }

    // End game session and save full session record (UC-1.2 - session end saving)
    @Transactional
    public void endGameSession(Long gameSessionId, String status, boolean isWon) {
        Optional<GameSession> sessionOpt = gameSessionRepository.findById(gameSessionId);
        if (sessionOpt.isEmpty()) {
            throw new RuntimeException("Game session not found");
        }

        GameSession session = sessionOpt.get();
        session.setStatus(status); // COMPLETED, FAILED, etc.
        session.setEndedAt(LocalDateTime.now());

        // Serialize session data to JSON (all spell attempts)
        List<SpellAttempt> attempts = spellAttemptRepository.findByGameSessionIdOrderByTimestamp(gameSessionId);
        try {
            List<Map<String, Object>> attemptsData = attempts.stream().map(attempt -> {
                Map<String, Object> map = new HashMap<>();
                map.put("mechanicType", attempt.getMechanicType());
                map.put("problemStatement", attempt.getProblemStatement());
                map.put("answerSubmitted", attempt.getAnswerSubmitted());
                map.put("correctAnswer", attempt.getCorrectAnswer());
                map.put("isCorrect", attempt.getIsCorrect());
                map.put("errorType", attempt.getErrorType());
                map.put("remainingLives", attempt.getRemainingLives());
                map.put("streakCount", attempt.getStreakCount());
                map.put("multiplierValue", attempt.getMultiplierValue());
                map.put("pointsEarned", attempt.getPointsEarned());
                map.put("timestamp", attempt.getTimestamp() != null ? attempt.getTimestamp().toString() : null);
                return map;
            }).toList();
            
            String sessionDataJson = objectMapper.writeValueAsString(attemptsData);
            session.setSessionDataJson(sessionDataJson);
        } catch (Exception e) {
            // Log error but continue
            System.err.println("Error serializing session data: " + e.getMessage());
        }

        gameSessionRepository.save(session);

        // Update game progress
        updateGameProgress(session, isWon);
    }

    // Update game progress after session completion
    private void updateGameProgress(GameSession session, boolean isWon) {
        Optional<GameProgress> progressOpt = gameProgressRepository.findByStudentId(session.getStudent().getId());
        GameProgress progress;
        if (progressOpt.isEmpty()) {
            progress = new GameProgress(session.getStudent());
        } else {
            progress = progressOpt.get();
        }

        // Update island progress
        if ("Similar".equalsIgnoreCase(session.getIslandType())) {
            if (isWon && session.getStageNumber() > progress.getSimilarIslandMaxStage()) {
                progress.setSimilarIslandMaxStage(session.getStageNumber());
            }
            // Unlock Dissimilar Island after completing Similar
            if (isWon && session.getStageNumber() >= 5) {
                progress.setDissimilarIslandUnlocked(true);
            }
        } else if ("Dissimilar".equalsIgnoreCase(session.getIslandType())) {
            if (isWon && session.getStageNumber() > progress.getDissimilarIslandMaxStage()) {
                progress.setDissimilarIslandMaxStage(session.getStageNumber());
            }
            // Unlock Hybrid Island after completing Dissimilar
            if (isWon && session.getStageNumber() >= 5) {
                progress.setHybridIslandUnlocked(true);
            }
        } else if ("Hybrid".equalsIgnoreCase(session.getIslandType())) {
            if (isWon && session.getStageNumber() > progress.getHybridIslandMaxStage()) {
                progress.setHybridIslandMaxStage(session.getStageNumber());
            }
        }

        // Update general stats
        progress.setTotalGamesPlayed(progress.getTotalGamesPlayed() + 1);
        if (isWon) {
            progress.setTotalGamesWon(progress.getTotalGamesWon() + 1);
        }
        progress.setTotalScore(progress.getTotalScore() + session.getScore());
        progress.setLastSessionEndedAt(LocalDateTime.now());
        progress.setLastActiveSessionId(session.getId());
        progress.setUpdatedAt(LocalDateTime.now());

        gameProgressRepository.save(progress);
    }

    // Get game progress for a student
    public Optional<GameProgress> getGameProgress(Long studentId) {
        Optional<GameProgress> progressOpt = gameProgressRepository.findByStudentId(studentId);
        if (progressOpt.isPresent()) {
            return progressOpt;
        }
        
        Optional<Student> studentOpt = studentRepository.findById(studentId);
        if (studentOpt.isPresent()) {
            GameProgress newProgress = new GameProgress(studentOpt.get());
            return Optional.of(gameProgressRepository.save(newProgress));
        }
        
        return Optional.empty();
    }

    // Get session history
    public List<GameSession> getSessionHistory(Long studentId) {
        return gameSessionRepository.findByStudentIdOrderByStartedAtDesc(studentId);
    }

    // Get diagnostics data for student
    public DiagnosticsDTO getDiagnostics(Long studentId) {
        List<GameSession> sessions = gameSessionRepository.findByStudentIdOrderByStartedAtDesc(studentId);
        
        List<SpellAttempt> allAttempts = new ArrayList<>();
        for (GameSession session : sessions) {
            allAttempts.addAll(spellAttemptRepository.findByGameSessionIdOrderByTimestamp(session.getId()));
        }

        // Calculate summary
        int totalCorrect = 0;
        int totalIncorrect = 0;
        double totalMultiplier = 0;

        for (SpellAttempt attempt : allAttempts) {
            if (attempt.getIsCorrect()) {
                totalCorrect++;
            } else {
                totalIncorrect++;
            }
            totalMultiplier += attempt.getMultiplierValue();
        }

        double avgMultiplier = allAttempts.isEmpty() ? 1.0 : totalMultiplier / allAttempts.size();
        DiagnosticsDTO.SummaryDTO summary = new DiagnosticsDTO.SummaryDTO(
            totalCorrect, 
            totalIncorrect, 
            sessions.size(), 
            avgMultiplier
        );

        // Calculate competency mastery
        Map<String, List<SpellAttempt>> attemptsByCompetency = allAttempts.stream()
            .collect(Collectors.groupingBy(SpellAttempt::getMechanicType));

        List<DiagnosticsDTO.CompetencyMasteryDTO> competencies = new ArrayList<>();

        Map<String, String> competencyNames = new HashMap<>();
        competencyNames.put("SameContainer", "Similar Fractions");
        competencyNames.put("ButterflyMethod", "Dissimilar Fractions");
        competencyNames.put("MixedConversion", "Mixed Numbers");

        for (String competencyId : Arrays.asList("SameContainer", "ButterflyMethod", "MixedConversion")) {
            List<SpellAttempt> compAttempts = attemptsByCompetency.getOrDefault(competencyId, new ArrayList<>());
            
            int compCorrect = 0;
            for (SpellAttempt attempt : compAttempts) {
                if (attempt.getIsCorrect()) compCorrect++;
            }

            double accuracy = compAttempts.isEmpty() ? 0.0 : (double) compCorrect / compAttempts.size() * 100;
            String masteryLevel = getMasteryLevel(accuracy);
            List<Double> trendData = compAttempts.isEmpty() ? Arrays.asList(0.0) : Arrays.asList(accuracy); // Simplified for now

            competencies.add(new DiagnosticsDTO.CompetencyMasteryDTO(
                competencyId,
                competencyNames.getOrDefault(competencyId, competencyId),
                masteryLevel,
                accuracy,
                trendData
            ));
        }

        // Calculate streak history
        List<DiagnosticsDTO.StreakHistoryDTO> streakHistory = new ArrayList<>();
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("MM-dd");
        
        for (GameSession session : sessions) {
            String dateStr = session.getStartedAt().format(formatter);
            int peakStreak = session.getActiveStreak(); // Simplified
            streakHistory.add(new DiagnosticsDTO.StreakHistoryDTO(dateStr, peakStreak));
        }

        // Limit to last 10 sessions
        if (streakHistory.size() > 10) {
            streakHistory = streakHistory.subList(0, 10);
        }

        return new DiagnosticsDTO(competencies, summary, streakHistory);
    }

    private String getMasteryLevel(double accuracy) {
        if (accuracy >= 80) {
            return "Proficient";
        } else if (accuracy >= 60) {
            return "Developing";
        } else {
            return "Beginner";
        }
    }
}
