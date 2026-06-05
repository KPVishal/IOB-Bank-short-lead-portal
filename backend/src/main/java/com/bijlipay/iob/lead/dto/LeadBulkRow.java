package com.bijlipay.iob.lead.dto;

import java.util.List;
import java.util.Map;

public record LeadBulkRow(
        int rowNumber,
        Map<String, String> data,
        String merchantName,
        String contactName,
        String contactNumber,
        String alternateNumber,
        String email,
        String address,
        String pincode,
        String state,
        String city,
        String deviceLabel,
        String deviceModel,
        int deviceCount,
        List<String> errors,
        List<String> missingFields,
        boolean valid
) {}
