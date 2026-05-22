package com.WizardFrac.WizardFrac.controller;

import com.WizardFrac.WizardFrac.entity.GameProgress;
import com.WizardFrac.WizardFrac.entity.SpellAttempt;
import com.WizardFrac.WizardFrac.service.GameProgressService;
import com.WizardFrac.WizardFrac.dto.SpellAttemptDTO;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
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
            SpellAttempt attempt = gameProgressService.recordSpellAttempt(gameSessionId, attemptDTO);
            return ResponseEntity.ok(attempt);
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

            gameProgressService.endGameSession(gameSessionId, status, isWon != null ? isWon : false);

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
        return ResponseEntity.ok(progress.get());
    }

    // Get session history
    @GetMapping("/history/{studentId}")
    public ResponseEntity<?> getSessionHistory(@PathVariable Long studentId) {
        return ResponseEntity.ok(gameProgressService.getSessionHistory(studentId));
    }
}
