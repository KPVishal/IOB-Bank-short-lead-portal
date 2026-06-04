package com.bijlipay.iob.user.dto;

import java.util.List;
import java.util.Map;

public record UserBulkImportResponse(
        int totalRows,
        int importedCount,
        int failedCount,
        List<UserResponse> imported,
        List<FailedRow> failed
) {
    public record FailedRow(
            int rowNumber,
            Map<String, String> data,
            List<String> errors,
            List<String> missingFields
    ) {}
}
