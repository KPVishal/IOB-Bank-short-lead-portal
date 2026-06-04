package com.bijlipay.iob.config;

import com.bijlipay.iob.user.Role;
import com.bijlipay.iob.user.User;
import com.bijlipay.iob.user.UserRepository;
import com.bijlipay.iob.user.UserStatus;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class BootstrapRunner implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.bootstrap.enabled:true}")
    private boolean enabled;

    @Override
    public void run(String... args) {
        if (!enabled) {
            log.info("Bootstrap disabled (app.bootstrap.enabled=false). Skipping demo user creation.");
            return;
        }
        if (userRepository.count() > 0) {
            log.info("Users table is not empty. Skipping bootstrap.");
            return;
        }

        log.info("Bootstrapping demo users (one-time, users table is empty)...");
        create("rejin@bijlipay.co.in",  "Bijli@123",  "Rejin Raj",   "9876543210", Role.ADMIN,          null,   UserStatus.ACTIVE);
        create("ravi.kumar@iob.in",     "Branch@123", "Ravi Kumar",  "9988776655", Role.BRANCH_MANAGER, "0023", UserStatus.ACTIVE);
        create("branch.user@iob.in",    "Branch@123", "Branch User", "9988776600", Role.BRANCH_MANAGER, "0017", UserStatus.ACTIVE);
        create("anitha.s@iob.in",       "Branch@123", "Anitha S",    "9988776611", Role.BRANCH_MANAGER, "0042", UserStatus.INACTIVE);
        log.info("Bootstrap complete. Created 4 demo users.");
    }

    private void create(String email, String rawPw, String displayName, String mobile, Role role, String soleId, UserStatus status) {
        if (userRepository.existsByEmailIgnoreCase(email)) return;
        userRepository.save(User.builder()
                .email(email)
                .passwordHash(passwordEncoder.encode(rawPw))
                .role(role)
                .status(status)
                .displayName(displayName)
                .mobile(mobile)
                .soleId(soleId)
                .build());
    }
}
