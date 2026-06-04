ALTER TABLE branches
    ADD COLUMN bank_region VARCHAR(50) NULL AFTER pincode;

CREATE INDEX idx_branches_bank_region ON branches (bank_region);
