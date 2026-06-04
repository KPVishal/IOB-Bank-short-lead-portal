package com.bijlipay.iob.user.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record UserCreateRequest(
        @NotBlank @Size(max = 20) String soleId,
        @NotBlank @Size(max = 150) String userName,
        @NotBlank @Email @Size(max = 150) String email,
        @NotBlank @Pattern(regexp = "\\d{10}", message = "Mobile must be exactly 10 digits") String mobile,
        @NotBlank @Pattern(regexp = "BRANCH_MANAGER", message = "Role must be BRANCH_MANAGER") String role
) {}
