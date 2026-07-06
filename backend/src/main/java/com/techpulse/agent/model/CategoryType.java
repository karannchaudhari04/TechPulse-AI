package com.techpulse.agent.model;

/**
 * Enumeration representing the 12 core category domains.
 */
public enum CategoryType {
    DSA_PROBLEM_SOLVING("DSA & Problem Solving"),
    WEB_DEVELOPMENT("Web Development"),
    MOBILE_DEVELOPMENT("Mobile Development"),
    AI_MACHINE_LEARNING("AI & Machine Learning"),
    CLOUD_DEVOPS("Cloud & DevOps"),
    SYSTEM_DESIGN_BACKEND("System Design & Backend"),
    CYBERSECURITY("Cybersecurity"),
    DATA_SCIENCE_ANALYTICS("Data Science & Analytics"),
    PRODUCT_UI_UX("Product & UI/UX"),
    OPEN_SOURCE_GITHUB("Open Source & GitHub"),
    CAREER_PLACEMENTS("Career & Placements"),
    EMERGING_TECH("Emerging Tech");

    private final String dbName;

    CategoryType(String dbName) {
        this.dbName = dbName;
    }

    public String getDbName() {
        return dbName;
    }

    public static CategoryType fromDbName(String name) {
        for (CategoryType type : values()) {
            if (type.name().equalsIgnoreCase(name) || type.getDbName().equalsIgnoreCase(name)) {
                return type;
            }
        }
        throw new IllegalArgumentException("Unknown category: " + name);
    }
}
