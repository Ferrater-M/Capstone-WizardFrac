package com.WizardFrac.WizardFrac.config;

import com.WizardFrac.WizardFrac.entity.Character;
import com.WizardFrac.WizardFrac.repository.CharacterRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class DataInitializer {

    @Autowired
    private CharacterRepository characterRepository;

    // Each entry: name, description, rarity, imageUrl, initialHealth
    private static final Object[][] CHARACTERS = {

            { "Wizard Boy", "A mystical boy with fraction magic.", "Rare", "/images/wizard-boy.png", 150 },
            { "Wizard Girl", "A powerful girl with advanced spellcasting.", "Rare", "/images/wizard-girl.png", 150 },
    };

    @Bean
    public CommandLineRunner initCharacters() {
        return args -> {
            for (Object[] data : CHARACTERS) {
                String name = (String) data[0];
                // Only insert if this character does not already exist by name
                if (characterRepository.findByName(name).isEmpty()) {
                    Character c = new Character();
                    c.setName(name);
                    c.setDescription((String) data[1]);
                    c.setRarity((String) data[2]);
                    c.setImageUrl((String) data[3]);
                    c.setInitialHealth((Integer) data[4]);
                    characterRepository.save(c);
                    System.out.println("Seeded character: " + name);
                }
            }
        };
    }
}
