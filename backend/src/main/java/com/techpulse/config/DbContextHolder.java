package com.techpulse.config;

public class DbContextHolder {

    public enum DbType {
        PRIMARY, REPLICA
    }

    private static final ThreadLocal<DbType> contextHolder = new ThreadLocal<>();

    public static void setDbType(DbType dbType) {
        if (dbType == null) {
            throw new NullPointerException();
        }
        contextHolder.set(dbType);
    }

    public static DbType getDbType() {
        return contextHolder.get() == null ? DbType.PRIMARY : contextHolder.get();
    }

    public static void clearDbType() {
        contextHolder.remove();
    }
}
