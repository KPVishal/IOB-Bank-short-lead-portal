package com.bijlipay.iob.branch;

import com.bijlipay.iob.branch.dto.BranchRequest;
import com.bijlipay.iob.branch.dto.BranchResponse;
import com.bijlipay.iob.branch.dto.BulkImportResponse;
import com.bijlipay.iob.common.dto.PageResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/branches")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class BranchController {

    private final BranchService branchService;
    private final BranchBulkService branchBulkService;

    @GetMapping
    public PageResponse<BranchResponse> list(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String city,
            @RequestParam(required = false) String state,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return branchService.list(q, city, state, status, page, size);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public BranchResponse create(@Valid @RequestBody BranchRequest request) {
        return branchService.create(request);
    }

    @GetMapping("/{id}")
    public BranchResponse get(@PathVariable Long id) {
        return branchService.get(id);
    }

    @GetMapping("/template")
    public ResponseEntity<ByteArrayResource> downloadTemplate() {
        byte[] bytes = branchBulkService.buildTemplate();
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"branches-template.xlsx\"")
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .contentLength(bytes.length)
                .body(new ByteArrayResource(bytes));
    }

    @PostMapping(value = "/bulk-import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public BulkImportResponse bulkImport(@RequestParam("file") MultipartFile file) {
        return branchBulkService.bulkImport(file);
    }
}
