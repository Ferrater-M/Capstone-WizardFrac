package com.WizardFrac.WizardFrac.controller;

import com.WizardFrac.WizardFrac.entity.GameProgress;
import com.WizardFrac.WizardFrac.service.GameProgressService;
import com.WizardFrac.WizardFrac.dto.SpellAttemptDTO;
import com.WizardFrac.WizardFrac.dto.DiagnosticsDTO;
import com.WizardFrac.WizardFrac.dto.GameProgressDTO;
import com.WizardFrac.WizardFrac.dto.LeaderboardEntryDTO;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/game-progress")
@CrossOrigin(origins = "*")
public class GameProgressController {
    @Autowired
    private GameProgressService gameProgressService;

    // Record spell attempt (UC-1.2 - automatic recording)
    @PostMapping("/spell-attempt/{gameSessionId}")
    public ResponseEntity<?> recordSpellAttempt(@PathVariable Long gameSessionId,
                                               @RequestBody SpellAttemptDTO attemptDTO) {
        try {
            gameProgressService.recordSpellAttempt(gameSessionId, attemptDTO);
            Map<String, String> response = new HashMap<>();
            response.put("message", "Spell attempt saved");
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    // End game session and save progress (UC-1.2 - session end saving)
    @PostMapping("/end-session/{gameSessionId}")
    public ResponseEntity<?> endGameSession(@PathVariable Long gameSessionId,
                                           @RequestBody Map<String, Object> request) {
        try {
            String status = (String) request.get("status"); // COMPLETED, FAILED, PAUSED
            Boolean isWon = (Boolean) request.get("isWon");
            Integer hintsUsed = request.get("hintsUsed") != null
                ? ((Number) request.get("hintsUsed")).intValue()
                : 0;

            gameProgressService.endGameSession(gameSessionId, status, isWon != null ? isWon : false, hintsUsed);

            Map<String, String> response = new HashMap<>();
            response.put("message", "Game session saved successfully");
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    // Get game progress for a student
    @GetMapping("/{studentId}")
    public ResponseEntity<?> getGameProgress(@PathVariable Long studentId) {
        Optional<GameProgress> progress = gameProgressService.getGameProgress(studentId);
        if (progress.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        GameProgress p = progress.get();

        // Daily quest resets at midnight; if today's data hasn't been touched yet,
        // show it as fresh without writing to the DB on a plain read.
        boolean questIsForToday = p.getDailyQuestDate() != null && p.getDailyQuestDate().isEqual(LocalDate.now());
        int questProgress = questIsForToday ? p.getDailyQuestProgress() : 0;
        boolean questClaimed = questIsForToday && Boolean.TRUE.equals(p.getDailyQuestClaimed());

        int totalScore = p.getTotalScore();
        GameProgressDTO dto = new GameProgressDTO(
            p.getStudent().getId(),
            p.getSimilarIslandMaxStage(),
            p.getDissimilarIslandUnlocked(),
            p.getDissimilarIslandMaxStage(),
            p.getHybridIslandUnlocked(),
            p.getHybridIslandMaxStage(),
            totalScore,
            p.getTotalGamesPlayed(),
            p.getTotalGamesWon(),
            gameProgressService.getLevel(totalScore),
            gameProgressService.getXpIntoLevel(totalScore),
            gameProgressService.getXpForNextLevel(totalScore),
            gameProgressService.getWizardRank(totalScore),
            p.getStarCurrency(),
            p.getCurrentStreak(),
            questProgress,
            gameProgressService.getDailyQuestTarget(),
            questClaimed
        );
        return ResponseEntity.ok(dto);
    }

    // Get session history
    @GetMapping("/history/{studentId}")
    public ResponseEntity<?> getSessionHistory(@PathVariable Long studentId) {
        return ResponseEntity.ok(gameProgressService.getSessionHistory(studentId));
    }

    // Get diagnostics data
    @GetMapping("/diagnostics/{studentId}")
    public ResponseEntity<DiagnosticsDTO> getDiagnostics(@PathVariable Long studentId) {
        DiagnosticsDTO diagnostics = gameProgressService.getDiagnostics(studentId);
        return ResponseEntity.ok(diagnostics);
    }

    // Get best star rating per stage (for stage-select display)
    @GetMapping("/stars/{studentId}")
    public ResponseEntity<?> getStageStars(@PathVariable Long studentId) {
        return ResponseEntity.ok(gameProgressService.getStageStars(studentId));
    }

    // All-time leaderboard, ranked by total score across all students
    @GetMapping("/leaderboard")
    public ResponseEntity<List<LeaderboardEntryDTO>> getLeaderboard() {
        return ResponseEntity.ok(gameProgressService.getLeaderboard());
    }
}
