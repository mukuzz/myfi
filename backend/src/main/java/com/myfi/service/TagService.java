package com.myfi.service;

import com.myfi.model.Tag;
import com.myfi.repository.TagRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class TagService {

    private final TagRepository tagRepository;

    @Transactional(readOnly = true)
    public List<Tag> getAllTags() {
        // Consider fetching tags hierarchically or providing options for flat/hierarchical fetching
        return tagRepository.findAll(); 
    }

    @Transactional(readOnly = true)
    public List<Tag> getTopLevelTags() {
        return tagRepository.findByParentTagIdIsNull();
    }

    @Transactional(readOnly = true)
    public Optional<Tag> getTagById(Long id) {
        return tagRepository.findById(id);
    }

    @Transactional(readOnly = true)
    public List<Tag> getChildTags(Long parentId) {
        return tagRepository.findByParentTagId(parentId);
    }

    @Transactional
    public Tag createTag(Tag tag) {
        // Prevent duplicate names
        tagRepository.findByName(tag.getName()).ifPresent(existing -> {
            throw new IllegalArgumentException("Tag with name '" + tag.getName() + "' already exists.");
        });

        // Handle setting parent tag relationship using ID
        if (tag.getParentTagId() != null) {
            // Check if the parent ID exists
            tagRepository.findById(tag.getParentTagId())
                .orElseThrow(() -> new IllegalArgumentException("Parent tag with ID " + tag.getParentTagId() + " not found."));
            // No need to set an object, the ID is already on the tag being created
        } else {
            tag.setParentTagId(null); // Ensure it's null if no ID provided
        }
        
        return tagRepository.save(tag);
    }

    @Transactional
    public Optional<Tag> updateTag(Long id, Tag tagDetails) {
        return tagRepository.findById(id)
            .map(existingTag -> {
                // Check for name conflict only if the name is changing
                if (!existingTag.getName().equals(tagDetails.getName())) {
                    tagRepository.findByName(tagDetails.getName()).ifPresent(conflict -> {
                        if (!conflict.getId().equals(id)) { // Ensure it's not conflicting with itself
                           throw new IllegalArgumentException("Tag with name '" + tagDetails.getName() + "' already exists.");
                        }
                    });
                    existingTag.setName(tagDetails.getName());
                }

                // Update parent tag relationship using ID
                Long newParentId = tagDetails.getParentTagId();
                if (newParentId != null) {
                    // Check if trying to set itself as parent
                    if (id.equals(newParentId)) {
                        throw new IllegalArgumentException("Cannot set a tag as its own parent.");
                    }
                    // Basic check for cyclical dependency 
                    if (isDescendant(newParentId, id)) {
                        throw new IllegalArgumentException("Cannot set a descendant tag as a parent.");
                    }
                    
                    // Verify the new parent tag exists
                    tagRepository.findById(newParentId)
                        .orElseThrow(() -> new IllegalArgumentException("Parent tag with ID " + newParentId + " not found."));
                    existingTag.setParentTagId(newParentId);
                } else {
                    existingTag.setParentTagId(null);
                }
                
                return tagRepository.save(existingTag);
            });
    }
    
    // Helper to check for simple cyclical dependencies (tag is descendant of potential parent)
    private boolean isDescendant(Long potentialParentId, Long tagIdToCheck) {
        Optional<Tag> current = tagRepository.findById(tagIdToCheck);
        while(current.isPresent() && current.get().getParentTagId() != null) {
            if(current.get().getParentTagId().equals(potentialParentId)) {
                return true;
            }
            // Fetch the parent tag to continue traversing up the hierarchy
            current = tagRepository.findById(current.get().getParentTagId()); 
        }
        return false;
    }

    @Transactional
    public boolean deleteTag(Long id) {
        return tagRepository.findById(id)
            .map(tag -> {
                // Before deleting the tag, handle its children
                // Option 1: Delete children recursively (if not handled by DB constraints)
                // Option 2: Promote children to top-level (set their parentTagId to null)
                // Option 3: Reassign children to the deleted tag's parent (if it exists)
                
                // Example: Promote children to top-level
                List<Tag> children = tagRepository.findByParentTagId(id);
                for (Tag child : children) {
                    child.setParentTagId(null);
                    tagRepository.save(child); // Save each child explicitly
                }

                // Now delete the tag itself
                tagRepository.delete(tag);
                return true;
            }).orElse(false);
    }
} 