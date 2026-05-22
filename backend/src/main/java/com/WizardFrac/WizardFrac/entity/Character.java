package com.WizardFrac.WizardFrac.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "characters")
public class Character {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String name;

    @Column(nullable = false)
    private String description;

    @Column(nullable = false)
    private String imageUrl;

    @Column(nullable = false)
    private Integer initialHealth = 100;

    @Column(nullable = false)
    private String rarity;

    public Character() {}

    public Character(String name, String description, String imageUrl, String rarity) {
        this.name = name;
        this.description = description;
        this.imageUrl = imageUrl;
        this.rarity = rarity;
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public void setImageUrl(String imageUrl) {
        this.imageUrl = imageUrl;
    }

    public Integer getInitialHealth() {
        return initialHealth;
    }

    public void setInitialHealth(Integer initialHealth) {
        this.initialHealth = initialHealth;
    }

    public String getRarity() {
        return rarity;
    }

    public void setRarity(String rarity) {
        this.rarity = rarity;
    }
}
