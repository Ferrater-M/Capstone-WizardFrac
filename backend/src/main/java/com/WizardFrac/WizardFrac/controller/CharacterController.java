package com.WizardFrac.WizardFrac.controller;

import com.WizardFrac.WizardFrac.entity.Character;
import com.WizardFrac.WizardFrac.entity.Student;
import com.WizardFrac.WizardFrac.service.CharacterService;
import com.WizardFrac.WizardFrac.dto.CharacterSelectionDTO;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/characters")
@CrossOrigin(origins = "*")
public class CharacterController {
    @Autowired
    private CharacterService characterService;

    // Get all available characters (UC-1.3)
    @GetMapping
    public ResponseEntity<List<Character>> getAllCharacters() {
        List<Character> characters = characterService.getAllCharacters();
        return ResponseEntity.ok(characters);
    }

    // Get character by ID
    @GetMapping("/{characterId}")
    public ResponseEntity<?> getCharacter(@PathVariable Long characterId) {
        Optional<Character> character = characterService.getCharacterById(characterId);
        if (character.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(character.get());
    }

    // Select character for student (UC-1.3)
    @PostMapping("/select/{studentId}")
    public ResponseEntity<?> selectCharacter(@PathVariable Long studentId, 
                                            @RequestBody CharacterSelectionDTO selection) {
        try {
            Student student = characterService.selectCharacter(studentId, selection);
            return ResponseEntity.ok(student);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // Get student's selected character
    @GetMapping("/student/{studentId}")
    public ResponseEntity<?> getStudentCharacter(@PathVariable Long studentId) {
        Optional<Character> character = characterService.getStudentSelectedCharacter(studentId);
        if (character.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(character.get());
    }
}
