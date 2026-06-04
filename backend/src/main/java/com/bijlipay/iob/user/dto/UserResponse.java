package com.bijlipay.iob.user.dto;

import com.bijlipay.iob.user.User;

import java.time.Instant;

public record UserResponse(
        Long id,
        String email,
        String userName,
        String mobile,
        String role,
        String status,
        String soleId,
        String branchName,
        String city,
        String state,
        boolean mustChangePassword,
        Instant createdAt
) {
    public static UserResponse from(User u, String branchName, String city, String state) {
        return new UserResponse(
                u.getId(),
                u.getEmail(),
                u.getDisplayName(),
                u.getMobile(),
                u.getRole().name(),
                u.getStatus().name(),
                u.getSoleId(),
                branchName,
                city,
                state,
                u.isMustChangePassword(),
                u.getCreatedAt()
        );
    }
}
