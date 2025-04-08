package com.myfi.repository;

import com.myfi.model.SystemStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Spring Data JPA repository for {@link SystemStatus} entities.
 */
@Repository
public interface SystemStatusRepository extends JpaRepository<SystemStatus, Long> {
    // Standard CRUD methods are inherited.
    // Custom query methods can be added here if needed in the future.
}