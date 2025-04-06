package com.myfi.controller;

import com.myfi.model.Tag;
import com.myfi.service.TagService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/tags")
@CrossOrigin(origins = "*", allowedHeaders = "*", methods = {RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT, RequestMethod.DELETE})
@RequiredArgsConstructor
public class TagController {

    private final TagService tagService;

    @GetMapping
    public ResponseEntity<List<Tag>> getAllTags(@RequestParam(required = false) Boolean topLevel) {
        List<Tag> tags;
        if (Boolean.TRUE.equals(topLevel)) {
            tags = tagService.getTopLevelTags();
        } else {
            tags = tagService.getAllTags();
            // TODO: Consider implementing hierarchical fetching/DTOs if needed for frontend
        }
        return ResponseEntity.ok(tags);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Tag> getTagById(@PathVariable Long id) {
        return tagService.getTagById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{id}/children")
    public ResponseEntity<List<Tag>> getChildTags(@PathVariable Long id) {
        // Check if parent exists first
        if (tagService.getTagById(id).isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        List<Tag> childTags = tagService.getChildTags(id);
        return ResponseEntity.ok(childTags);
    }

    @PostMapping
    public ResponseEntity<?> createTag(@RequestBody Tag tag) {
        try {
            // Only expect name and potentially parentTag.id in the request body
            Tag createdTag = tagService.createTag(tag);
            return ResponseEntity.status(HttpStatus.CREATED).body(createdTag);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateTag(@PathVariable Long id, @RequestBody Tag tagDetails) {
         try {
            return tagService.updateTag(id, tagDetails)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTag(@PathVariable Long id) {
        if (tagService.deleteTag(id)) {
            return ResponseEntity.noContent().build();
        } else {
            return ResponseEntity.notFound().build();
        }
    }
} 