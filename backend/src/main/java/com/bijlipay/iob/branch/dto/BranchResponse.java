package com.bijlipay.iob.branch.dto;

import com.bijlipay.iob.branch.Branch;

import java.time.Instant;

public record BranchResponse(
        Long id,
        String soleId,
        String branchName,
        String city,
        String state,
        String pincode,
        String bankRegion,
        String status,
        Instant createdAt,
        Instant updatedAt
) {
    public static BranchResponse from(Branch b) {
        return new BranchResponse(
                b.getId(),
                b.getSoleId(),
                b.getBranchName(),
                b.getCity(),
                b.getState(),
                b.getPincode(),
                b.getBankRegion(),
                b.getStatus().name(),
                b.getCreatedAt(),
                b.getUpdatedAt()
        );
    }
}
