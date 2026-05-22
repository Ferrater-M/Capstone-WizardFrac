package com.WizardFrac.WizardFrac.service;

import com.WizardFrac.WizardFrac.entity.*;
import com.WizardFrac.WizardFrac.repository.*;
import com.WizardFrac.WizardFrac.dto.SpellAttemptDTO;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

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
}
