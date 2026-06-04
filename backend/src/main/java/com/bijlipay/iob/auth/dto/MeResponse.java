package com.bijlipay.iob.auth.dto;

import com.bijlipay.iob.user.User;

public record MeResponse(
        Long id,
        String email,
        String displayName,
        String role,
        String status,
        String mobile,
        String soleId
) {
    public static MeResponse from(User u) {
        return new MeResponse(
                u.getId(),
                u.getEmail(),
                u.getDisplayName(),
                u.getRole().name(),
                u.getStatus().name(),
                u.getMobile(),
                u.getSoleId()
        );
    }
}
