package com.bijlipay.iob.email;

import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${app.email.from}")
    private String fromAddress;

    @Value("${app.email.from-name}")
    private String fromName;

    @Value("${app.email.enabled}")
    private boolean enabled;

    @Value("${app.frontend.base-url}")
    private String frontendBaseUrl;

    @Value("${app.user-defaults.password}")
    private String defaultPassword;

    @Async
    public void sendWelcomeEmail(String toEmail, String displayName, String soleId, String branchName) {
        if (!enabled) {
            log.info("Email disabled. Would have sent welcome email to {}", toEmail);
            return;
        }
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, false, StandardCharsets.UTF_8.name());
            helper.setFrom(fromAddress, fromName);
            helper.setTo(toEmail);
            helper.setSubject("Welcome to Bijlipay — IOB Bank Portal");
            helper.setText(buildHtml(displayName, toEmail, soleId, branchName), true);
            mailSender.send(message);
            log.info("Welcome email sent to {}", toEmail);
        } catch (Exception e) {
            log.warn("Failed to send welcome email to {}: {}", toEmail, e.getMessage());
        }
    }

    private String buildHtml(String displayName, String email, String soleId, String branchName) {
        String name = displayName == null || displayName.isBlank() ? email : displayName;
        String branchLine = (branchName != null && !branchName.isBlank())
                ? "<p style=\"margin:8px 0\"><b>Branch:</b> " + escape(branchName) + " (Sole ID " + escape(soleId) + ")</p>"
                : "";
        return """
                <!doctype html>
                <html><body style="font-family: 'Segoe UI', system-ui, sans-serif; background:#f5f5f5; padding:24px;">
                  <table width="100%%" cellpadding="0" cellspacing="0" style="max-width:560px; margin:auto; background:#fff; border-radius:8px; overflow:hidden; border:1px solid #e5e7eb">
                    <tr>
                      <td style="background:linear-gradient(135deg,#5B2C6F,#3F1D4F); color:#fff; padding:24px;">
                        <div style="font-size:20px; font-weight:700">bijlipay</div>
                        <div style="font-size:12px; opacity:.85">IOB Bank Portal</div>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:24px; color:#1f2937; font-size:14px; line-height:1.5">
                        <p>Hi %s,</p>
                        <p>You have been added as a <b>Branch Manager</b> on the Bijlipay IOB Bank Portal.</p>
                        %s
                        <p>Use the credentials below to log in. You will be asked to change your password on first login.</p>
                        <table cellpadding="6" style="background:#FAF7FB; border:1px solid #F5EDF6; border-radius:6px; margin:12px 0; font-size:13px">
                          <tr><td><b>Email</b></td><td>%s</td></tr>
                          <tr><td><b>Temporary password</b></td><td><code>%s</code></td></tr>
                        </table>
                        <p style="text-align:center; margin:24px 0">
                          <a href="%s/login" style="background:#5B2C6F; color:#fff; text-decoration:none; padding:10px 24px; border-radius:4px; font-weight:600; letter-spacing:.05em; text-transform:uppercase; font-size:12px">Log in to the portal</a>
                        </p>
                        <p style="font-size:12px; color:#6b7280">If you weren't expecting this email, please ignore it or contact your administrator.</p>
                      </td>
                    </tr>
                    <tr>
                      <td style="background:#fafafa; border-top:1px solid #e5e7eb; padding:12px 24px; font-size:11px; color:#9ca3af; text-align:right">
                        © 2026 Bijlipay · Skilworth Technologies
                      </td>
                    </tr>
                  </table>
                </body></html>
                """.formatted(
                        escape(name),
                        branchLine,
                        escape(email),
                        escape(defaultPassword),
                        frontendBaseUrl);
    }

    private String escape(String s) {
        if (s == null) return "";
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }
}
