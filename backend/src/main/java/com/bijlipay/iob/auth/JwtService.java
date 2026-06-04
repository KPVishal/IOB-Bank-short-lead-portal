package com.bijlipay.iob.auth;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtBuilder;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;
import java.util.Map;

@Service
public class JwtService {

    public static final String PURPOSE_ACCESS = "ACCESS";
    public static final String PURPOSE_OTP_CHALLENGE = "OTP_CHALLENGE";
    public static final String PURPOSE_CHANGE_PASSWORD = "CHANGE_PASSWORD";

    private static final long OTP_CHALLENGE_MINUTES = 5;
    private static final long CHANGE_PASSWORD_MINUTES = 15;

    private final SecretKey key;
    private final long accessTokenExpiryMinutes;

    public JwtService(
            @Value("${app.jwt.secret}") String secret,
            @Value("${app.jwt.access-token-expiry-minutes}") long accessTokenExpiryMinutes
    ) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.accessTokenExpiryMinutes = accessTokenExpiryMinutes;
    }

    public String generateAccessToken(String email, String role) {
        return buildToken(email, role, PURPOSE_ACCESS, Map.of(), accessTokenExpiryMinutes);
    }

    public String generateOtpChallenge(String email, String role) {
        return buildToken(email, role, PURPOSE_OTP_CHALLENGE, Map.of(), OTP_CHALLENGE_MINUTES);
    }

    public String generateChangePasswordToken(String email, String role) {
        return buildToken(email, role, PURPOSE_CHANGE_PASSWORD, Map.of(), CHANGE_PASSWORD_MINUTES);
    }

    public Claims parse(String token) throws JwtException {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public long getAccessTokenExpirySeconds() {
        return accessTokenExpiryMinutes * 60L;
    }

    private String buildToken(String subject, String role, String purpose, Map<String, Object> extra, long expiryMinutes) {
        Instant now = Instant.now();
        Instant expiry = now.plus(expiryMinutes, ChronoUnit.MINUTES);
        JwtBuilder builder = Jwts.builder()
                .subject(subject)
                .claim("role", role)
                .claim("purpose", purpose)
                .issuedAt(Date.from(now))
                .expiration(Date.from(expiry));
        if (extra != null) {
            extra.forEach(builder::claim);
        }
        return builder.signWith(key).compact();
    }
}
