package com.bijlipay.iob.branch;

public enum BranchStatus {
    ACTIVE,
    INACTIVE;

    public static BranchStatus fromLabel(String label) {
        if (label == null) return null;
        String s = label.trim().toLowerCase();
        if (s.isEmpty()) return null;
        return switch (s) {
            case "active" -> ACTIVE;
            case "inactive" -> INACTIVE;
            default -> null;
        };
    }
}
