package com.WizardFrac.WizardFrac.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "stage_stars", uniqueConstraints = {
    @UniqueConstraint(columnNames = { "student_id", "islandType", "stageNumber" })
})
public class StageStars {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", nullable = false)
    private Student student;

    @Column(nullable = false)
    private String islandType; // Similar, Dissimilar, Hybrid

    @Column(nullable = false)
    private Integer stageNumber;

    @Column(nullable = false)
    private Integer stars = 0; // best result achieved, 1-3

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    public StageStars() {
        this.updatedAt = LocalDateTime.now();
    }

    public StageStars(Student student, String islandType, Integer stageNumber, Integer stars) {
        this.student = student;
        this.islandType = islandType;
        this.stageNumber = stageNumber;
        this.stars = stars;
        this.updatedAt = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Student getStudent() {
        return student;
    }

    public void setStudent(Student student) {
        this.student = student;
    }

    public String getIslandType() {
        return islandType;
    }

    public void setIslandType(String islandType) {
        this.islandType = islandType;
    }

    public Integer getStageNumber() {
        return stageNumber;
    }

    public void setStageNumber(Integer stageNumber) {
        this.stageNumber = stageNumber;
    }

    public Integer getStars() {
        return stars;
    }

    public void setStars(Integer stars) {
        this.stars = stars;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
