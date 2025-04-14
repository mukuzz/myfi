package com.myfi.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.myfi.model.Tag;
import com.myfi.service.TagService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Arrays;
import java.util.Collections;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.hamcrest.Matchers.*;

@WebMvcTest(TagController.class)
class TagControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private TagService tagService;

    @Autowired
    private ObjectMapper objectMapper;

    private Tag tag1;
    private Tag tag2;
    private Tag childTag;

    @BeforeEach
    void setUp() {
        tag1 = new Tag();
        tag1.setId(1L);
        tag1.setName("Food");
        tag1.setParentTagId(null);

        tag2 = new Tag();
        tag2.setId(2L);
        tag2.setName("Travel");
        tag2.setParentTagId(null);

        childTag = new Tag();
        childTag.setId(3L);
        childTag.setName("Groceries");
        childTag.setParentTagId(1L); // Child of Food
    }

    @Test
    void getAllTags_shouldReturnAllTagsWhenNoParam() throws Exception {
        given(tagService.getAllTags()).willReturn(Arrays.asList(tag1, tag2, childTag));

        mockMvc.perform(get("/api/v1/tags"))
               .andExpect(status().isOk())
               .andExpect(content().contentType(MediaType.APPLICATION_JSON))
               .andExpect(jsonPath("$", hasSize(3)))
               .andExpect(jsonPath("$[0].name", is("Food")))
               .andExpect(jsonPath("$[2].name", is("Groceries")));
    }

    @Test
    void getAllTags_shouldReturnTopLevelTagsWhenParamIsTrue() throws Exception {
        given(tagService.getTopLevelTags()).willReturn(Arrays.asList(tag1, tag2));

        mockMvc.perform(get("/api/v1/tags").param("topLevel", "true"))
               .andExpect(status().isOk())
               .andExpect(content().contentType(MediaType.APPLICATION_JSON))
               .andExpect(jsonPath("$", hasSize(2)))
               .andExpect(jsonPath("$[0].name", is("Food")))
               .andExpect(jsonPath("$[1].name", is("Travel")));
    }

    @Test
    void getAllTags_shouldReturnAllTagsWhenParamIsFalse() throws Exception {
        given(tagService.getAllTags()).willReturn(Arrays.asList(tag1, tag2, childTag));

        mockMvc.perform(get("/api/v1/tags").param("topLevel", "false"))
               .andExpect(status().isOk())
               .andExpect(content().contentType(MediaType.APPLICATION_JSON))
               .andExpect(jsonPath("$", hasSize(3)));
    }

    @Test
    void getTagById_shouldReturnTagWhenFound() throws Exception {
        given(tagService.getTagById(1L)).willReturn(Optional.of(tag1));

        mockMvc.perform(get("/api/v1/tags/{id}", 1L))
               .andExpect(status().isOk())
               .andExpect(content().contentType(MediaType.APPLICATION_JSON))
               .andExpect(jsonPath("$.id", is(1)))
               .andExpect(jsonPath("$.name", is("Food")));
    }

    @Test
    void getTagById_shouldReturnNotFoundWhenMissing() throws Exception {
        given(tagService.getTagById(99L)).willReturn(Optional.empty());

        mockMvc.perform(get("/api/v1/tags/{id}", 99L))
               .andExpect(status().isNotFound());
    }

    @Test
    void getChildTags_shouldReturnChildrenWhenParentFound() throws Exception {
        given(tagService.getTagById(1L)).willReturn(Optional.of(tag1)); // Parent exists
        given(tagService.getChildTags(1L)).willReturn(Collections.singletonList(childTag));

        mockMvc.perform(get("/api/v1/tags/{id}/children", 1L))
               .andExpect(status().isOk())
               .andExpect(content().contentType(MediaType.APPLICATION_JSON))
               .andExpect(jsonPath("$", hasSize(1)))
               .andExpect(jsonPath("$[0].id", is(3)))
               .andExpect(jsonPath("$[0].name", is("Groceries")));
    }

    @Test
    void getChildTags_shouldReturnNotFoundWhenParentMissing() throws Exception {
        given(tagService.getTagById(99L)).willReturn(Optional.empty()); // Parent doesn't exist

        mockMvc.perform(get("/api/v1/tags/{id}/children", 99L))
               .andExpect(status().isNotFound());
    }

    @Test
    void createTag_shouldReturnCreatedTag() throws Exception {
        Tag newTag = new Tag();
        newTag.setName("Entertainment");
        newTag.setParentTagId(null);

        Tag savedTag = new Tag(); // What service returns
        savedTag.setId(4L);
        savedTag.setName(newTag.getName());
        savedTag.setParentTagId(newTag.getParentTagId());

        given(tagService.createTag(any(Tag.class))).willReturn(savedTag);

        mockMvc.perform(post("/api/v1/tags")
                       .contentType(MediaType.APPLICATION_JSON)
                       .content(objectMapper.writeValueAsString(newTag)))
               .andExpect(status().isCreated())
               .andExpect(content().contentType(MediaType.APPLICATION_JSON))
               .andExpect(jsonPath("$.id", is(4)))
               .andExpect(jsonPath("$.name", is("Entertainment")));
    }

     @Test
    void createTag_shouldReturnBadRequestOnIllegalArgument() throws Exception {
        Tag newTag = new Tag();
        newTag.setName("Food"); // Duplicate name
        String errorMessage = "Tag with name 'Food' already exists.";

        given(tagService.createTag(any(Tag.class))).willThrow(new IllegalArgumentException(errorMessage));

        mockMvc.perform(post("/api/v1/tags")
                       .contentType(MediaType.APPLICATION_JSON)
                       .content(objectMapper.writeValueAsString(newTag)))
               .andExpect(status().isBadRequest())
               .andExpect(content().string(errorMessage));
    }

    @Test
    void updateTag_shouldReturnUpdatedTag() throws Exception {
        Tag updatedDetails = new Tag();
        updatedDetails.setName("Dining Out");
        updatedDetails.setParentTagId(1L);

        Tag savedUpdate = new Tag(); // What service returns
        savedUpdate.setId(3L);
        savedUpdate.setName(updatedDetails.getName());
        savedUpdate.setParentTagId(updatedDetails.getParentTagId());

        given(tagService.updateTag(eq(3L), any(Tag.class))).willReturn(Optional.of(savedUpdate));

        mockMvc.perform(put("/api/v1/tags/{id}", 3L)
                       .contentType(MediaType.APPLICATION_JSON)
                       .content(objectMapper.writeValueAsString(updatedDetails)))
               .andExpect(status().isOk())
               .andExpect(content().contentType(MediaType.APPLICATION_JSON))
               .andExpect(jsonPath("$.id", is(3)))
               .andExpect(jsonPath("$.name", is("Dining Out")))
               .andExpect(jsonPath("$.parentTagId", is(1)));
    }

    @Test
    void updateTag_shouldReturnNotFoundWhenMissing() throws Exception {
        Tag details = new Tag();
        given(tagService.updateTag(eq(99L), any(Tag.class))).willReturn(Optional.empty());

        mockMvc.perform(put("/api/v1/tags/{id}", 99L)
                       .contentType(MediaType.APPLICATION_JSON)
                       .content(objectMapper.writeValueAsString(details)))
               .andExpect(status().isNotFound());
    }

    @Test
    void updateTag_shouldReturnBadRequestOnIllegalArgument() throws Exception {
        Tag details = new Tag();
        details.setName("Travel"); // Duplicate name
        String errorMessage = "Tag with name 'Travel' already exists.";

        given(tagService.updateTag(eq(1L), any(Tag.class))).willThrow(new IllegalArgumentException(errorMessage));

        mockMvc.perform(put("/api/v1/tags/{id}", 1L)
                       .contentType(MediaType.APPLICATION_JSON)
                       .content(objectMapper.writeValueAsString(details)))
               .andExpect(status().isBadRequest())
               .andExpect(content().string(errorMessage));
    }

    @Test
    void deleteTag_shouldReturnNoContentWhenSuccessful() throws Exception {
        given(tagService.deleteTag(1L)).willReturn(true);

        mockMvc.perform(delete("/api/v1/tags/{id}", 1L))
               .andExpect(status().isNoContent());
    }

    @Test
    void deleteTag_shouldReturnNotFoundWhenMissing() throws Exception {
        given(tagService.deleteTag(99L)).willReturn(false);

        mockMvc.perform(delete("/api/v1/tags/{id}", 99L))
               .andExpect(status().isNotFound());
    }
} 