package com.WizardFrac.WizardFrac.dto;

public class CharacterSelectionDTO {
    private Long characterId;
    private String characterName;

    // Constructors
    public CharacterSelectionDTO() {}

    public CharacterSelectionDTO(Long characterId, String characterName) {
        this.characterId = characterId;
        this.characterName = characterName;
    }

    // Getters and Setters
    public Long getCharacterId() {
        return characterId;
    }

    public void setCharacterId(Long characterId) {
        this.characterId = characterId;
    }

    public String getCharacterName() {
        return characterName;
    }

    public void setCharacterName(String characterName) {
        this.characterName = characterName;
    }
}
