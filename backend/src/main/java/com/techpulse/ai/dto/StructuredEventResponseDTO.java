package com.techpulse.ai.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class StructuredEventResponseDTO {
    private String title;
    private String summary;
    private String category;
    private List<String> topics;
    private Double importanceScore;
    private Double credibilityScore;
    private String versionString;
    private String lifecycleStatus;
    private String technicalImpact;
    private String developerImpact;
    private String enterpriseImpact;
    private String migrationNotes;
    private String breakingChanges;
    private String securityNotes;
    private List<String> officialLinks;
}
