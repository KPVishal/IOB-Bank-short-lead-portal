package com.bijlipay.iob.lead;

import com.bijlipay.iob.lead.dto.LeadBulkParseResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/leads")
@RequiredArgsConstructor
public class LeadController {

    private final LeadBulkService leadBulkService;

    @GetMapping("/template")
    public ResponseEntity<ByteArrayResource> downloadTemplate() {
        byte[] bytes = leadBulkService.buildTemplate();
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"leads-template.xlsx\"")
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .contentLength(bytes.length)
                .body(new ByteArrayResource(bytes));
    }

    @PostMapping(value = "/parse-bulk", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public LeadBulkParseResponse parseBulk(
            @RequestParam("file") MultipartFile file,
            @RequestParam("soleId") String soleId
    ) {
        return leadBulkService.parse(file, soleId);
    }
}
