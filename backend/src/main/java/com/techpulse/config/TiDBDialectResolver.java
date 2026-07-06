package com.techpulse.config;

import org.hibernate.dialect.MySQLDialect;
import org.hibernate.engine.jdbc.dialect.spi.DialectResolutionInfo;
import org.hibernate.engine.jdbc.dialect.spi.DialectResolver;

public class TiDBDialectResolver implements DialectResolver {
    @Override
    public org.hibernate.dialect.Dialect resolveDialect(DialectResolutionInfo info) {
        // Using the standard MySQLDialect which is fully compatible with TiDB 
        // and guaranteed to be available in hibernate-core.
        return new MySQLDialect();
    }
}
