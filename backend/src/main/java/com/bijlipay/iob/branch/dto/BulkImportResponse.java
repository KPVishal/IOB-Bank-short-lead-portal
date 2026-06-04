package com.bijlipay.iob.branch.dto;

import java.util.List;
import java.util.Map;

public record BulkImportResponse(
        int totalRows,
        int importedCount,
        int failedCount,
        List<BranchResponse> imported,
        List<FailedRow> failed
) {
    public record FailedRow(
            int rowNumber,
            Map<String, String> data,
            List<String> errors,
            List<String> missingFields
    ) {}
}
