package com.bijlipay.iob.user;

import org.springframework.data.jpa.domain.Specification;

import java.util.Collection;

public final class UserSpecifications {

    private UserSpecifications() {}

    public static Specification<User> matches(String q, Collection<String> soleIds, Role role) {
        Specification<User> spec = Specification.where(null);
        if (q != null && !q.isBlank()) {
            String like = "%" + q.trim().toLowerCase() + "%";
            spec = spec.and((root, query, cb) -> cb.or(
                    cb.like(cb.lower(root.get("email")), like),
                    cb.like(cb.lower(root.get("displayName")), like),
                    cb.like(cb.lower(root.get("mobile")), like),
                    cb.like(cb.lower(root.get("soleId")), like)
            ));
        }
        if (soleIds != null && !soleIds.isEmpty()) {
            spec = spec.and((root, query, cb) -> root.get("soleId").in(soleIds));
        }
        if (role != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("role"), role));
        }
        return spec;
    }
}
