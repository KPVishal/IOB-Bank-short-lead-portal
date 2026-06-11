package com.bijlipay.iob.user;

import com.bijlipay.iob.common.dto.PageResponse;
import com.bijlipay.iob.user.dto.UserBulkImportResponse;
import com.bijlipay.iob.user.dto.UserCreateRequest;
import com.bijlipay.iob.user.dto.UserResponse;
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
@RequestMapping("/api/users")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class UserController {

    private final UserService userService;
    private final UserBulkService userBulkService;

    @GetMapping
    public PageResponse<UserResponse> list(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String city,
            @RequestParam(required = false) String state,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return userService.list(q, city, state, page, size);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public UserResponse create(@Valid @RequestBody UserCreateRequest request) {
        return userService.create(request);
    }

    @GetMapping("/template")
    public ResponseEntity<ByteArrayResource> downloadTemplate() {
        byte[] bytes = userBulkService.buildTemplate();
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"users-template.xlsx\"")
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .contentLength(bytes.length)
                .body(new ByteArrayResource(bytes));
    }

    @PostMapping(value = "/bulk-import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public UserBulkImportResponse bulkImport(@RequestParam("file") MultipartFile file) {
        return userBulkService.bulkImport(file);
    }

    /**
     * Activate / deactivate a user. Body: {"status": "ACTIVE"} or {"status": "INACTIVE"}.
     * Admin only (class-level @PreAuthorize already gates this).
     */
    @PatchMapping("/{id}/status")
    public UserResponse updateStatus(@PathVariable Long id, @RequestBody StatusUpdateRequest body) {
        return userService.updateStatus(id, body.status());
    }

    public record StatusUpdateRequest(String status) {}
}
