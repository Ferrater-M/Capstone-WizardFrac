package com.WizardFrac.WizardFrac.service;

import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

@Service
public class EmailService {

    @Autowired
    private JavaMailSender mailSender;

    @Value("${spring.mail.username:}")
    private String fromAddress;

    public void sendDiagnosticsPdf(String toEmail, MultipartFile pdfFile) throws jakarta.mail.MessagingException, IOException {
        if (fromAddress == null || fromAddress.isBlank()) {
            throw new IllegalStateException("Email sending is not configured on the server (MAIL_USERNAME/MAIL_PASSWORD missing).");
        }

        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true);
        helper.setFrom(fromAddress);
        helper.setTo(toEmail);
        helper.setSubject("Your WizardFrac Progress Dashboard");
        helper.setText(
            "Hello Wizard,\n\n" +
            "Attached is a PDF summary of your WizardFrac progress dashboard, " +
            "including your stats, competency mastery, misconceptions, and game history.\n\n" +
            "Keep casting those spells!\n" +
            "— WizardFrac"
        );
        helper.addAttachment("wizardfrac-progress.pdf", pdfFile);

        mailSender.send(message);
    }
}
