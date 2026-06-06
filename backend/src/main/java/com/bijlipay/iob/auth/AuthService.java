package com.bijlipay.iob.auth;

import com.bijlipay.iob.auth.dto.ChangePasswordRequest;
import com.bijlipay.iob.auth.dto.LoginRequest;
import com.bijlipay.iob.auth.dto.LoginResponse;
import com.bijlipay.iob.auth.dto.MeResponse;
import com.bijlipay.iob.branch.BranchRepository;
import com.bijlipay.iob.branch.dto.BranchResponse;
import com.bijlipay.iob.common.exception.ApiException;
import com.bijlipay.iob.user.User;
import com.bijlipay.iob.user.UserRepository;
import com.bijlipay.iob.user.UserStatus;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final BranchRepository branchRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public LoginResponse login(LoginRequest req) {
        User user = userRepository.findByEmailIgnoreCase(req.email().trim())
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Invalid email or password"));

        if (!passwordEncoder.matches(req.password(), user.getPasswordHash())) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Invalid email or password");
        }

        if (user.getStatus() == UserStatus.INACTIVE) {
            throw new ApiException(HttpStatus.FORBIDDEN,
                    "Your account is inactive. Please contact your administrator.");
        }

        if (user.isMustChangePassword()) {
            String token = jwtService.generateChangePasswordToken(user.getEmail(), user.getRole().name());
            return LoginResponse.changePasswordRequired(token);
        }

        // OTP step intentionally removed — both ADMIN and BRANCH_MANAGER receive an
        // ACCESS token directly after credentials are validated.
        String token = jwtService.generateAccessToken(user.getEmail(), user.getRole().name());
        return LoginResponse.done(token, jwtService.getAccessTokenExpirySeconds(), buildMe(user));
    }

    @Transactional
    public LoginResponse changePassword(ChangePasswordRequest req) {
        if (!req.newPassword().equals(req.confirmPassword())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Passwords do not match");
        }

        Claims claims;
        try {
            claims = jwtService.parse(req.changeToken());
        } catch (JwtException e) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Your change-password link has expired. Please log in again.");
        }
        if (!JwtService.PURPOSE_CHANGE_PASSWORD.equals(claims.get("purpose"))) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Invalid change-password token");
        }

        String email = claims.getSubject();
        User user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "User no longer exists"));
        if (user.getStatus() == UserStatus.INACTIVE) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Your account is inactive.");
        }

        if (passwordEncoder.matches(req.newPassword(), user.getPasswordHash())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "New password must be different from the previous one");
        }

        user.setPasswordHash(passwordEncoder.encode(req.newPassword()));
        user.setMustChangePassword(false);
        userRepository.save(user);

        // OTP step intentionally removed — issue ACCESS token straight after password change.
        String token = jwtService.generateAccessToken(user.getEmail(), user.getRole().name());
        return LoginResponse.done(token, jwtService.getAccessTokenExpirySeconds(), buildMe(user));
    }

    public MeResponse me(String email) {
        User user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "User not found"));
        return buildMe(user);
    }

    /**
     * Build a {@link MeResponse} that includes the user's mapped Branch (if
     * one exists for their Sole ID). Returned as null otherwise — e.g. an
     * admin without a Sole ID, or a branch user whose Sole ID hasn't yet
     * had a Branch row created by an admin.
     */
    private MeResponse buildMe(User user) {
        BranchResponse branch = null;
        if (user.getSoleId() != null && !user.getSoleId().isBlank()) {
            branch = branchRepository.findBySoleIdIgnoreCase(user.getSoleId())
                    .map(BranchResponse::from)
                    .orElse(null);
        }
        return MeResponse.from(user, branch);
    }
}
