package com.techpulse.agent.config;

import com.techpulse.agent.model.CategoryType;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

import java.util.List;
import java.util.Map;

/**
 * Binds category keyword rules configured in application.yml.
 */
@Configuration
@ConfigurationProperties(prefix = "app.classification")
public class ClassificationProperties {

    private Map<CategoryType, List<String>> keywords;

    public Map<CategoryType, List<String>> getKeywords() {
        return keywords;
    }

    public void setKeywords(Map<CategoryType, List<String>> keywords) {
        this.keywords = keywords;
    }
}
