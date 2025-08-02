package com.myfi.repository;

import com.myfi.model.Tag;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TagRepository extends JpaRepository<Tag, Long> {

    Optional<Tag> findByName(String name);

    // Find top-level tags (those without a parent) ordered by orderIndex
    List<Tag> findByParentTagIdIsNullOrderByOrderIndexAsc();

    // Find direct children of a specific tag ordered by orderIndex
    List<Tag> findByParentTagIdOrderByOrderIndexAsc(Long parentTagId);

    // Find all tags ordered by orderIndex
    List<Tag> findAllByOrderByOrderIndexAsc();
} 