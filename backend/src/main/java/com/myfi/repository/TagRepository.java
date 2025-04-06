package com.myfi.repository;

import com.myfi.model.Tag;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TagRepository extends JpaRepository<Tag, Long> {

    Optional<Tag> findByName(String name);

    // Find top-level tags (those without a parent)
    List<Tag> findByParentTagIdIsNull();

    // Find direct children of a specific tag
    List<Tag> findByParentTagId(Long parentTagId);
} 