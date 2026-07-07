package com.techpulse.agent.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

import java.util.Map;

/**
 * Binds importance calculation weights, decay freshness rules, and bonus variables from application.yml.
 */
@Configuration
@ConfigurationProperties(prefix = "app.importance")
public class ImportanceProperties {

    private Map<String, Double> categoryWeights;
    private FreshnessProperties freshness;
    private BonusProperties bonuses;

    public Map<String, Double> getCategoryWeights() {
        return categoryWeights;
    }

    public void setCategoryWeights(Map<String, Double> categoryWeights) {
        this.categoryWeights = categoryWeights;
    }

    public FreshnessProperties getFreshness() {
        return freshness;
    }

    public void setFreshness(FreshnessProperties freshness) {
        this.freshness = freshness;
    }

    public BonusProperties getBonuses() {
        return bonuses;
    }

    public void setBonuses(BonusProperties bonuses) {
        this.bonuses = bonuses;
    }

    /**
     * Configuration properties for event freshness threshold parameters.
     */
    public static class FreshnessProperties {
        private double firstHour;
        private double firstDay;
        private double firstWeek;

        public double getFirstHour() {
            return firstHour;
        }

        public void setFirstHour(double firstHour) {
            this.firstHour = firstHour;
        }

        public double getFirstDay() {
            return firstDay;
        }

        public void setFirstDay(double firstDay) {
            this.firstDay = firstDay;
        }

        public double getFirstWeek() {
            return firstWeek;
        }

        public void setFirstWeek(double firstWeek) {
            this.firstWeek = firstWeek;
        }
    }

    /**
     * Configuration properties for importance ranking heuristic bonuses.
     */
    public static class BonusProperties {
        private double officialRelease;
        private double multipleOrganizations;
        private double majorVersion;
        private double security;
        private double breakingChange;

        public double getOfficialRelease() {
            return officialRelease;
        }

        public void setOfficialRelease(double officialRelease) {
            this.officialRelease = officialRelease;
        }

        public double getMultipleOrganizations() {
            return multipleOrganizations;
        }

        public void setMultipleOrganizations(double multipleOrganizations) {
            this.multipleOrganizations = multipleOrganizations;
        }

        public double getMajorVersion() {
            return majorVersion;
        }

        public void setMajorVersion(double majorVersion) {
            this.majorVersion = majorVersion;
        }

        public double getSecurity() {
            return security;
        }

        public void setSecurity(double security) {
            this.security = security;
        }

        public double getBreakingChange() {
            return breakingChange;
        }

        public void setBreakingChange(double breakingChange) {
            this.breakingChange = breakingChange;
        }
    }
}
