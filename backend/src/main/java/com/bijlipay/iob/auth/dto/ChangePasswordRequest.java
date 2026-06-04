package com.bijlipay.iob.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ChangePasswordRequest(
        @NotBlank String changeToken,
        @NotBlank @Size(min = 8, max = 100, message = "Password must be at least 8 characters") String newPassword,
        @NotBlank String confirmPassword
) {}
