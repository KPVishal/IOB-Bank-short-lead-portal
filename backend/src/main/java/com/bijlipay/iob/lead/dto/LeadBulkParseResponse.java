package com.bijlipay.iob.lead.dto;

import com.bijlipay.iob.branch.dto.BranchResponse;

import java.util.List;

public record LeadBulkParseResponse(
        BranchResponse branch,
        int totalRows,
        int validCount,
        int invalidCount,
        List<LeadBulkRow> rows
) {}
