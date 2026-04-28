package com.techbite.dto;

import lombok.Data;

@Data
public class AdminSummarizeRequestDTO {
    private String longText;
    private String sourceUrl;
    private String fallbackTitle;
    private Long categoryId;
}
