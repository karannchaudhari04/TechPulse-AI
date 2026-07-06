package com.techpulse.agent.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

import java.util.List;
import java.util.Map;

/**
 * Binds baseline source weights and clickbait patterns from application.yml configuration.
 */
@Configuration
@ConfigurationProperties(prefix = "app.credibility")
public class CredibilityProperties {

    private Map<String, SourceMetadata> sources;
    private List<String> clickbaitKeywords;

    public Map<String, SourceMetadata> getSources() {
        return sources;
    }

    public void setSources(Map<String, SourceMetadata> sources) {
        this.sources = sources;
    }

    public List<String> getClickbaitKeywords() {
        return clickbaitKeywords;
    }

    public void setClickbaitKeywords(List<String> clickbaitKeywords) {
        this.clickbaitKeywords = clickbaitKeywords;
    }

    /**
     * Source metadata fields used for credibility judge heuristics.
     */
    public static class SourceMetadata {
        private String organization;
        private String type;
        private double baselineWeight;
        private boolean official;

        public String getOrganization() {
            return organization;
        }

        public void setOrganization(String organization) {
            this.organization = organization;
        }

        public String getType() {
            return type;
        }

        public void setType(String type) {
            this.type = type;
        }

        public double getBaselineWeight() {
            return baselineWeight;
        }

        public void setBaselineWeight(double baselineWeight) {
            this.baselineWeight = baselineWeight;
        }

        public boolean isOfficial() {
            return official;
        }

        public void setOfficial(boolean official) {
            this.official = official;
        }
    }
}
