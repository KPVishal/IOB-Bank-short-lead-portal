package com.bijlipay.iob.branch;

import com.bijlipay.iob.branch.dto.BranchRequest;
import com.bijlipay.iob.branch.dto.BranchResponse;
import com.bijlipay.iob.common.dto.PageResponse;
import com.bijlipay.iob.common.exception.ApiException;
import com.bijlipay.iob.reference.ReferenceService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class BranchService {

    private final BranchRepository branchRepository;
    private final ReferenceService referenceService;

    @Transactional(readOnly = true)
    public PageResponse<BranchResponse> list(String q, String city, String state, String status, int page, int size) {
        BranchStatus statusEnum = null;
        if (status != null && !status.isBlank()) {
            try {
                statusEnum = BranchStatus.valueOf(status.trim().toUpperCase());
            } catch (IllegalArgumentException ignored) {}
        }
        Pageable pageable = PageRequest.of(
                Math.max(0, page),
                Math.min(Math.max(1, size), 200),
                Sort.by(Sort.Direction.DESC, "createdAt")
        );
        Page<Branch> result = branchRepository.findAll(BranchSpecifications.matches(q, city, state, statusEnum), pageable);
        return PageResponse.of(result, BranchResponse::from);
    }

    @Transactional
    public BranchResponse create(BranchRequest req) {
        String soleId = req.soleId().trim();
        if (branchRepository.existsBySoleIdIgnoreCase(soleId)) {
            throw new ApiException(HttpStatus.CONFLICT, "Sole ID '" + soleId + "' is already in use");
        }
        String canonicalState = referenceService.canonicalState(req.state());
        if (canonicalState == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "State '" + req.state() + "' is not a valid Indian state or UT");
        }
        Branch b = Branch.builder()
                .soleId(soleId)
                .branchName(req.branchName().trim())
                .city(req.city().trim())
                .state(canonicalState)
                .pincode(req.pincode().trim())
                .bankRegion(req.bankRegion() == null ? null : req.bankRegion().trim().isEmpty() ? null : req.bankRegion().trim())
                .status(BranchStatus.valueOf(req.status().trim().toUpperCase()))
                .build();
        return BranchResponse.from(branchRepository.save(b));
    }

    @Transactional(readOnly = true)
    public BranchResponse get(Long id) {
        return branchRepository.findById(id)
                .map(BranchResponse::from)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Branch not found"));
    }
}
