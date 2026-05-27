package com.WizardFrac.WizardFrac.service;

import com.WizardFrac.WizardFrac.entity.*;
import com.WizardFrac.WizardFrac.repository.*;
import com.WizardFrac.WizardFrac.dto.GameLobbyInitDTO;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.Optional;

@Service
public class GameLobbyService {
    @Autowired
    private GameSessionRepository gameSessionRepository;

    @Autowired
    private GameProgressRepository gameProgressRepository;

    @Autowired
    private StudentRepository studentRepository;

    // Initialize game lobby and create game session (UC-2.1)
    public GameLobbyInitDTO initializeGameLobby(Long studentId, String islandType, Integer stageNumber) {
        // Check unlock conditions
        Optional<Student> studentOpt = studentRepository.findById(studentId);
        if (studentOpt.isEmpty()) {
            throw new RuntimeException("Student not found");
        }

        // Get or create game progress
        Optional<GameProgress> progressOpt = gameProgressRepository.findByStudentId(studentId);
        GameProgress progress = progressOpt.orElseGet(() -> {
            GameProgress newProgress = new GameProgress(studentOpt.get());
            return gameProgressRepository.save(newProgress);
        });

        // Check island unlock conditions (Temporarily unlocked for editing)
        if ("Similar".equalsIgnoreCase(islandType)) {
            // Similar Island is always available
        } else if ("Dissimilar".equalsIgnoreCase(islandType)) {
            // Temporarily unlocked for editing
        } else if ("Hybrid".equalsIgnoreCase(islandType)) {
            // Temporarily unlocked for editing
        }

        // Create game session
        Student student = studentOpt.get();
        GameSession session = new GameSession(student, islandType, stageNumber);
        session.setEnemyHealth(100); // Initial enemy health
        GameSession savedSession = gameSessionRepository.save(session);

        // Generate first problem (placeholder - actual implementation would generate real problems)
        String firstProblem = generateFractionProblem(islandType);
        String mechanicType = getMechanicType(islandType);

        return new GameLobbyInitDTO(
            savedSession.getId(),
            islandType,
            stageNumber,
            firstProblem,
            mechanicType,
            savedSession.getEnemyHealth(),
            savedSession.getCurrentLives()
        );
    }

    // Restore last saved session state (UC-1.2 - session restoration)
    public Optional<GameSession> getLastActiveSession(Long studentId) {
        return gameSessionRepository.findTopByStudentIdAndStatusOrderByStartedAtDesc(studentId, "ACTIVE");
    }

    // Generate a random fraction problem
    private String generateFractionProblem(String islandType) {
        // Placeholder - actual implementation would generate real fraction problems
        if ("Similar".equalsIgnoreCase(islandType)) {
            return "1/2 + 1/4 = ?";
        } else if ("Dissimilar".equalsIgnoreCase(islandType)) {
            return "2/3 + 3/5 = ?";
        } else {
            return "1 1/2 + 2/3 = ?";
        }
    }

    // Get mechanic type based on island
    private String getMechanicType(String islandType) {
        if ("Similar".equalsIgnoreCase(islandType)) {
            return "SameContainer";
        } else if ("Dissimilar".equalsIgnoreCase(islandType)) {
            return "ButterflyMethod";
        } else {
            return "MixedConversion";
        }
    }
}
