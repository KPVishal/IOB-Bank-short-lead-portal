package com.bijlipay.iob.auth.dto;

import com.bijlipay.iob.branch.dto.BranchResponse;
import com.bijlipay.iob.user.User;

/**
 * What {@code GET /api/auth/me} returns. Includes the user's mapped Branch
 * (when one exists for their Sole ID) so the Lead Entry screen can fill in
 * bank info without making a second {@code /api/branches} call — that
 * endpoint is admin-only, so branch users would 403 if they tried.
 */
public record MeResponse(
        Long id,
        String email,
        String displayName,
        String role,
        String status,
        String mobile,
        String soleId,
        BranchResponse branch
) {
    public static MeResponse from(User u, BranchResponse branch) {
        return new MeResponse(
                u.getId(),
                u.getEmail(),
                u.getDisplayName(),
                u.getRole().name(),
                u.getStatus().name(),
                u.getMobile(),
                u.getSoleId(),
                branch
        );
    }
}
