package com.myfi.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

@Entity
@Table(name = "tags")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Tag {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Column(nullable = false, unique = true)
    private String name;

    // Store the ID of the parent tag directly
    @Column(name = "parent_tag_id")
    private Long parentTagId;

    // Order index for displaying tags in custom order
    @Column(name = "order_index")
    private Integer orderIndex;

    // Note: Child tags are implicitly defined by other tags referencing this tag's ID 
    // in their parentTagId field. We don't store a list of children here.

} 