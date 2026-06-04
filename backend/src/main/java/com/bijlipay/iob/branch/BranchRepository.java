package com.bijlipay.iob.branch;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.Optional;

public interface BranchRepository extends JpaRepository<Branch, Long>, JpaSpecificationExecutor<Branch> {
    Optional<Branch> findBySoleIdIgnoreCase(String soleId);
    boolean existsBySoleIdIgnoreCase(String soleId);
}
