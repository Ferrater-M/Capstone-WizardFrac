package com.WizardFrac.WizardFrac.service;

import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.WizardFrac.WizardFrac.dto.CharacterSelectionDTO;
import com.WizardFrac.WizardFrac.entity.Character;
import com.WizardFrac.WizardFrac.entity.Student;
import com.WizardFrac.WizardFrac.repository.CharacterRepository;
import com.WizardFrac.WizardFrac.repository.StudentRepository;

@Service
public class CharacterService {
    @Autowired
    private CharacterRepository characterRepository;

    @Autowired
    private StudentRepository studentRepository;

    // Get all available characters
    public List<Character> getAllCharacters() {
        return characterRepository.findAll();
    }

    // Get character by ID
    public Optional<Character> getCharacterById(Long id) {
        return characterRepository.findById(id);
    }

    // Save character selection for a student (UC-1.3)
    public Student selectCharacter(Long studentId, CharacterSelectionDTO selection) {
        Optional<Student> studentOpt = studentRepository.findById(studentId);
        Optional<Character> characterOpt = characterRepository.findById(selection.getCharacterId());

        if (studentOpt.isPresent() && characterOpt.isPresent()) {
            Student student = studentOpt.get();
            student.setSelectedCharacterId(selection.getCharacterId());
            student.setSelectedCharacterName(selection.getCharacterName());
            return studentRepository.save(student);
        }

        throw new RuntimeException("Student or Character not found");
    }

    // Get student's selected character
    public Optional<Character> getStudentSelectedCharacter(Long studentId) {
        Optional<Student> studentOpt = studentRepository.findById(studentId);
        if (studentOpt.isPresent() && studentOpt.get().getSelectedCharacterId() != null) {
            return characterRepository.findById(studentOpt.get().getSelectedCharacterId());
        }
        return Optional.empty();
    }

    // Create/seed characters (for initialization)
    public Character createCharacter(String name, String description, String imageUrl, String rarity) {
        Character character = new Character(name, description, imageUrl, rarity);
        return characterRepository.save(character);
    }
}
