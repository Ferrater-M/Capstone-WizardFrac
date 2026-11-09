package com.WizardFrac.WizardFrac.entity;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "students")
public class Student {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String nickname;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime lastLoginAt;

    @Column(nullable = true)
    private Long selectedCharacterId;

    @Column(nullable = true)
    private String selectedCharacterName;

    @Column(nullable = true, columnDefinition = "bytea")
    private byte[] profilePicture;

    @Column(nullable = true)
    private String profilePictureType;

    // BCrypt hash of the student's password. Null until the nickname is
    // "claimed" (see StudentService#setPassword) — an unclaimed nickname can
    // still be used to log in without a password, same as before this field existed.
    @Column(nullable = true)
    private String passwordHash;

    // Verified email for password recovery (set only once the player has verified it).
    @Column(nullable = true)
    private String email;

    // An email typed in Settings that is waiting for its link to be used. A verified `email` keeps
    // working until this one is verified and replaces it.
    @Column(nullable = true)
    private String pendingEmail;

    @Column(nullable = true)
    private LocalDateTime emailVerifiedAt;

    // SHA-256 of the one-time verification link token (the raw token only ever lives in the email).
    @Column(nullable = true)
    private String emailVerificationTokenHash;

    @Column(nullable = true)
    private LocalDateTime emailVerificationExpiresAt;

    // When the last verification email went out — used to stop the Verify button being spammed.
    @Column(nullable = true)
    private LocalDateTime emailVerificationSentAt;

    // Forgot password: SHA-256 of the one-time reset link token, and when that link stops working.
    @Column(nullable = true)
    private String passwordResetTokenHash;

    @Column(nullable = true)
    private LocalDateTime passwordResetExpiresAt;

    public Student() {
        this.createdAt = LocalDateTime.now();
        this.lastLoginAt = LocalDateTime.now();
    }

    public Student(String nickname) {
        this.nickname = nickname;
        this.createdAt = LocalDateTime.now();
        this.lastLoginAt = LocalDateTime.now();
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getNickname() {
        return nickname;
    }

    public void setNickname(String nickname) {
        this.nickname = nickname;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getLastLoginAt() {
        return lastLoginAt;
    }

    public void setLastLoginAt(LocalDateTime lastLoginAt) {
        this.lastLoginAt = lastLoginAt;
    }

    public Long getSelectedCharacterId() {
        return selectedCharacterId;
    }

    public void setSelectedCharacterId(Long selectedCharacterId) {
        this.selectedCharacterId = selectedCharacterId;
    }

    public String getSelectedCharacterName() {
        return selectedCharacterName;
    }

    public void setSelectedCharacterName(String selectedCharacterName) {
        this.selectedCharacterName = selectedCharacterName;
    }

    public byte[] getProfilePicture() {
        return profilePicture;
    }

    public void setProfilePicture(byte[] profilePicture) {
        this.profilePicture = profilePicture;
    }

    public String getProfilePictureType() {
        return profilePictureType;
    }

    public void setProfilePictureType(String profilePictureType) {
        this.profilePictureType = profilePictureType;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public void setPasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
    }

    public boolean hasPassword() {
        return passwordHash != null && !passwordHash.isEmpty();
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPendingEmail() {
        return pendingEmail;
    }

    public void setPendingEmail(String pendingEmail) {
        this.pendingEmail = pendingEmail;
    }

    public LocalDateTime getEmailVerifiedAt() {
        return emailVerifiedAt;
    }

    public void setEmailVerifiedAt(LocalDateTime emailVerifiedAt) {
        this.emailVerifiedAt = emailVerifiedAt;
    }

    public String getEmailVerificationTokenHash() {
        return emailVerificationTokenHash;
    }

    public void setEmailVerificationTokenHash(String emailVerificationTokenHash) {
        this.emailVerificationTokenHash = emailVerificationTokenHash;
    }

    public LocalDateTime getEmailVerificationExpiresAt() {
        return emailVerificationExpiresAt;
    }

    public void setEmailVerificationExpiresAt(LocalDateTime emailVerificationExpiresAt) {
        this.emailVerificationExpiresAt = emailVerificationExpiresAt;
    }

    public LocalDateTime getEmailVerificationSentAt() {
        return emailVerificationSentAt;
    }

    public void setEmailVerificationSentAt(LocalDateTime emailVerificationSentAt) {
        this.emailVerificationSentAt = emailVerificationSentAt;
    }

    public String getPasswordResetTokenHash() {
        return passwordResetTokenHash;
    }

    public void setPasswordResetTokenHash(String passwordResetTokenHash) {
        this.passwordResetTokenHash = passwordResetTokenHash;
    }

    public LocalDateTime getPasswordResetExpiresAt() {
        return passwordResetExpiresAt;
    }

    public void setPasswordResetExpiresAt(LocalDateTime passwordResetExpiresAt) {
        this.passwordResetExpiresAt = passwordResetExpiresAt;
    }

    public boolean isEmailVerified() {
        return email != null && emailVerifiedAt != null;
    }
}
