CREATE TABLE branches (
    id           BIGINT NOT NULL AUTO_INCREMENT,
    sole_id      VARCHAR(20)  NOT NULL,
    branch_name  VARCHAR(150) NOT NULL,
    city         VARCHAR(100) NOT NULL,
    state        VARCHAR(100) NOT NULL,
    pincode      VARCHAR(6)   NOT NULL,
    status       VARCHAR(20)  NOT NULL,
    created_at   TIMESTAMP(6) NOT NULL,
    updated_at   TIMESTAMP(6) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_branches_sole_id (sole_id),
    KEY idx_branches_state (state),
    KEY idx_branches_city (city),
    KEY idx_branches_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
