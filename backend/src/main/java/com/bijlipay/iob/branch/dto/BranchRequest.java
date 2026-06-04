package com.bijlipay.iob.branch.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record BranchRequest(
        @NotBlank @Size(max = 20) String soleId,
        @NotBlank @Size(max = 150) String branchName,
        @NotBlank @Size(max = 100) String city,
        @NotBlank @Size(max = 100) String state,
        @NotBlank @Pattern(regexp = "\\d{6}", message = "Pincode must be exactly 6 digits") String pincode,
        @Size(max = 50) String bankRegion,
        @NotBlank @Pattern(regexp = "ACTIVE|INACTIVE", message = "Status must be ACTIVE or INACTIVE") String status
) {}
