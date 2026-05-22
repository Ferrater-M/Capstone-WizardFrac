package com.WizardFrac.WizardFrac.controller;

import com.WizardFrac.WizardFrac.entity.GameSession;
import com.WizardFrac.WizardFrac.service.GameLobbyService;
import com.WizardFrac.WizardFrac.dto.GameLobbyInitDTO;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/game-lobby")
@CrossOrigin(origins = "*")
public class GameLobbyController {
    @Autowired
    private GameLobbyService gameLobbyService;

    // Initialize game lobby and start gameplay session (UC-2.1)
    @PostMapping("/start-stage/{studentId}")
    public ResponseEntity<?> startStage(@PathVariable Long studentId,
                                       @RequestBody Map<String, Object> request) {
        try {
            String islandType = (String) request.get("islandType");
            Integer stageNumber = ((Number) request.get("stageNumber")).intValue();

            GameLobbyInitDTO initData = gameLobbyService.initializeGameLobby(
                studentId, islandType, stageNumber
            );

            return ResponseEntity.ok(initData);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    // Get last active session (for session restoration - UC-1.2)
    @GetMapping("/last-session/{studentId}")
    public ResponseEntity<?> getLastSession(@PathVariable Long studentId) {
        Optional<GameSession> session = gameLobbyService.getLastActiveSession(studentId);
        if (session.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(session.get());
    }
}
