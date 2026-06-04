package com.bijlipay.iob.auth;

import com.bijlipay.iob.auth.dto.ChangePasswordRequest;
import com.bijlipay.iob.auth.dto.LoginRequest;
import com.bijlipay.iob.auth.dto.LoginResponse;
import com.bijlipay.iob.auth.dto.MeResponse;
import com.bijlipay.iob.auth.dto.OtpVerifyRequest;
import com.bijlipay.iob.common.exception.ApiException;
import com.bijlipay.iob.user.Role;
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

        if (user.getRole() == Role.ADMIN) {
            String challenge = jwtService.generateOtpChallenge(user.getEmail(), user.getRole().name());
            return LoginResponse.otpRequired(challenge);
        }

        String token = jwtService.generateAccessToken(user.getEmail(), user.getRole().name());
        return LoginResponse.done(token, jwtService.getAccessTokenExpirySeconds(), MeResponse.from(user));
    }

    public LoginResponse verifyOtp(OtpVerifyRequest req) {
        Claims claims;
        try {
            claims = jwtService.parse(req.challengeToken());
        } catch (JwtException e) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Invalid or expired OTP challenge");
        }

        if (!JwtService.PURPOSE_OTP_CHALLENGE.equals(claims.get("purpose"))) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Invalid OTP challenge");
        }

        // Mock OTP — any 6 digits succeed. Replace with real verification when integrating SMS/email gateway.

        String email = claims.getSubject();
        User user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "User no longer exists"));

        if (user.getStatus() == UserStatus.INACTIVE) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Your account is inactive.");
        }

        if (user.isMustChangePassword()) {
            String t = jwtService.generateChangePasswordToken(user.getEmail(), user.getRole().name());
            return LoginResponse.changePasswordRequired(t);
        }

        String token = jwtService.generateAccessToken(user.getEmail(), user.getRole().name());
        return LoginResponse.done(token, jwtService.getAccessTokenExpirySeconds(), MeResponse.from(user));
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

        if (user.getRole() == Role.ADMIN) {
            String challenge = jwtService.generateOtpChallenge(user.getEmail(), user.getRole().name());
            return LoginResponse.otpRequired(challenge);
        }
        String token = jwtService.generateAccessToken(user.getEmail(), user.getRole().name());
        return LoginResponse.done(token, jwtService.getAccessTokenExpirySeconds(), MeResponse.from(user));
    }

    public MeResponse me(String email) {
        User user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "User not found"));
        return MeResponse.from(user);
    }
}
