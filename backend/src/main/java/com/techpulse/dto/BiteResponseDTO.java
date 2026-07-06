package com.techpulse.dto;

import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class BiteResponseDTO {
    private Long id;
    private String title;
    private String contentSummary;
    private String originalSourceUrl;
    private String authorAttribution;
    private String thumbnailUrl;
    private String categoryName;
    private LocalDateTime publishedAt;
    private Integer engagementCount;
    private Boolean isLiked;
}
