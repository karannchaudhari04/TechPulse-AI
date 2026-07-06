package com.techpulse.controller;

import com.techpulse.model.Category;
import com.techpulse.repository.CategoryRepository;
import com.techpulse.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/categories")
@RequiredArgsConstructor
public class CategoryController {

    private final CategoryRepository categoryRepository;

    @GetMapping
    public ResponseEntity<ApiResponse<List<Category>>> getAllCategories() {
        List<Category> categories = categoryRepository.findAllByOrderByNameAsc();
        return ResponseEntity.ok(ApiResponse.success(categories, "Categories fetched successfully"));
    }
}
