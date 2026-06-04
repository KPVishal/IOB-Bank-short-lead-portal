package com.bijlipay.iob.branch;

import org.springframework.data.jpa.domain.Specification;

public final class BranchSpecifications {

    private BranchSpecifications() {}

    public static Specification<Branch> matches(String q, String city, String state, BranchStatus status) {
        Specification<Branch> spec = Specification.where(null);
        if (q != null && !q.isBlank()) {
            String like = "%" + q.trim().toLowerCase() + "%";
            spec = spec.and((root, query, cb) -> cb.or(
                    cb.like(cb.lower(root.get("soleId")), like),
                    cb.like(cb.lower(root.get("branchName")), like)
            ));
        }
        if (city != null && !city.isBlank()) {
            String c = city.trim().toLowerCase();
            spec = spec.and((root, query, cb) -> cb.equal(cb.lower(root.get("city")), c));
        }
        if (state != null && !state.isBlank()) {
            String s = state.trim().toLowerCase();
            spec = spec.and((root, query, cb) -> cb.equal(cb.lower(root.get("state")), s));
        }
        if (status != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("status"), status));
        }
        return spec;
    }
}
