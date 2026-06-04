package com.bijlipay.iob.auth.dto;

public record LoginResponse(
        String step,
        String token,
        Long expiresIn,
        String challengeToken,
        String changeToken,
        MeResponse user
) {
    public static LoginResponse otpRequired(String challengeToken) {
        return new LoginResponse("OTP", null, null, challengeToken, null, null);
    }

    public static LoginResponse changePasswordRequired(String changeToken) {
        return new LoginResponse("CHANGE_PASSWORD", null, null, null, changeToken, null);
    }

    public static LoginResponse done(String token, long expiresInSeconds, MeResponse user) {
        return new LoginResponse("DONE", token, expiresInSeconds, null, null, user);
    }
}
