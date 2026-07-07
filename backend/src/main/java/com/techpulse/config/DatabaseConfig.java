package com.techpulse.config;

import com.zaxxer.hikari.HikariDataSource;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.jdbc.datasource.LazyConnectionDataSourceProxy;
import org.springframework.jdbc.datasource.lookup.AbstractRoutingDataSource;
import org.springframework.orm.jpa.JpaTransactionManager;
import org.springframework.orm.jpa.LocalContainerEntityManagerFactoryBean;
import org.springframework.orm.jpa.vendor.HibernateJpaVendorAdapter;
import org.springframework.transaction.PlatformTransactionManager;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.HashMap;
import java.util.Map;
import java.util.Properties;

@Configuration
public class DatabaseConfig {

    @Value("${DATABASE_WRITER_URL:${spring.datasource.writer.url:}}")
    private String writerUrl;

    @Value("${DATABASE_WRITER_USER:${spring.datasource.writer.username:}}")
    private String writerUser;

    @Value("${DATABASE_WRITER_PASSWORD:${spring.datasource.writer.password:}}")
    private String writerPassword;

    @Value("${DATABASE_REPLICA_URL:${spring.datasource.replica.url:}}")
    private String replicaUrl;

    @Value("${DATABASE_REPLICA_USER:${spring.datasource.replica.username:}}")
    private String replicaUser;

    @Value("${DATABASE_REPLICA_PASSWORD:${spring.datasource.replica.password:}}")
    private String replicaPassword;

    @Value("${spring.jpa.hibernate.ddl-auto:update}")
    private String ddlAuto;

    @Bean
    public DataSource writerDataSource() {
        HikariDataSource ds = new HikariDataSource();
        if (writerUrl == null || writerUrl.trim().isEmpty() || writerUrl.startsWith("jdbc:h2:")) {
            ds.setJdbcUrl(writerUrl != null && !writerUrl.trim().isEmpty() ? writerUrl : "jdbc:h2:mem:techpulse;DB_CLOSE_DELAY=-1;MODE=MySQL");
            ds.setUsername(writerUser != null && !writerUser.trim().isEmpty() ? writerUser : "sa");
            ds.setPassword(writerPassword != null ? writerPassword : "");
            ds.setDriverClassName("org.h2.Driver");
        } else {
            ds.setJdbcUrl(writerUrl);
            ds.setUsername(writerUser);
            ds.setPassword(writerPassword);
            ds.setDriverClassName("com.mysql.cj.jdbc.Driver");
            ds.setMaximumPoolSize(10);
            ds.setMaxLifetime(300000);
            ds.setConnectionInitSql("SET SESSION tidb_enable_noop_functions = 1");
        }
        return ds;
    }

    @Bean
    public DataSource replicaDataSource() {
        HikariDataSource ds = new HikariDataSource();
        if (writerUrl == null || writerUrl.trim().isEmpty() || writerUrl.startsWith("jdbc:h2:")) {
            ds.setJdbcUrl(writerUrl != null && !writerUrl.trim().isEmpty() ? writerUrl : "jdbc:h2:mem:techpulse;DB_CLOSE_DELAY=-1;MODE=MySQL");
            ds.setUsername(writerUser != null && !writerUser.trim().isEmpty() ? writerUser : "sa");
            ds.setPassword(writerPassword != null ? writerPassword : "");
            ds.setDriverClassName("org.h2.Driver");
        } else {
            ds.setJdbcUrl(replicaUrl != null && !replicaUrl.isEmpty() ? replicaUrl : writerUrl);
            ds.setUsername(replicaUser != null && !replicaUser.isEmpty() ? replicaUser : writerUser);
            ds.setPassword(replicaPassword != null && !replicaPassword.isEmpty() ? replicaPassword : writerPassword);
            ds.setDriverClassName("com.mysql.cj.jdbc.Driver");
            ds.setMaximumPoolSize(20);
            ds.setMaxLifetime(300000);
            ds.setConnectionInitSql("SET SESSION tidb_enable_noop_functions = 1, tidb_replica_read = 'leader-and-follower'");
        }
        return ds;
    }

    @Bean
    public DataSource routingDataSource(
            @Qualifier("writerDataSource") DataSource writer,
            @Qualifier("replicaDataSource") DataSource replica) {
        AbstractRoutingDataSource routingDataSource = new AbstractRoutingDataSource() {
            @Override
            protected Object determineCurrentLookupKey() {
                return DbContextHolder.getDbType();
            }
        };
        Map<Object, Object> targetDataSources = new HashMap<>();
        targetDataSources.put(DbContextHolder.DbType.PRIMARY, writer);
        targetDataSources.put(DbContextHolder.DbType.REPLICA, replica);
        routingDataSource.setTargetDataSources(targetDataSources);
        routingDataSource.setDefaultTargetDataSource(writer);
        return routingDataSource;
    }

    @Bean
    @Primary
    public DataSource dataSource(@Qualifier("routingDataSource") DataSource routingDataSource) {
        return new LazyConnectionDataSourceProxy(routingDataSource);
    }

    @Bean
    public LocalContainerEntityManagerFactoryBean entityManagerFactory(DataSource dataSource) {
        LocalContainerEntityManagerFactoryBean em = new LocalContainerEntityManagerFactoryBean();
        em.setDataSource(dataSource);
        em.setPackagesToScan("com.techpulse.model");

        HibernateJpaVendorAdapter vendorAdapter = new HibernateJpaVendorAdapter();
        em.setJpaVendorAdapter(vendorAdapter);

        Properties properties = new Properties();
        if (writerUrl == null || writerUrl.trim().isEmpty() || writerUrl.startsWith("jdbc:h2:")) {
            properties.setProperty("hibernate.dialect", "org.hibernate.dialect.H2Dialect");
        } else {
            properties.setProperty("hibernate.dialect", "org.hibernate.dialect.MySQLDialect");
        }
        properties.setProperty("hibernate.temp.use_jdbc_metadata_defaults", "false");
        properties.setProperty("hibernate.hbm2ddl.auto", ddlAuto);
        properties.setProperty("hibernate.show_sql", "false");
        
        em.setJpaProperties(properties);
        return em;
    }

    @Bean
    public PlatformTransactionManager transactionManager(LocalContainerEntityManagerFactoryBean entityManagerFactory) {
        JpaTransactionManager transactionManager = new JpaTransactionManager();
        transactionManager.setEntityManagerFactory(entityManagerFactory.getObject());
        return transactionManager;
    }

    @Bean
    public org.flywaydb.core.Flyway flyway(@Qualifier("writerDataSource") DataSource writerDataSource) {
        boolean isH2 = writerUrl == null || writerUrl.trim().isEmpty() || writerUrl.startsWith("jdbc:h2:");

        if (!isH2) {
            // Pre-create flyway schema history table for TiDB/MySQL to avoid incompatible "CREATE TABLE ... SELECT" statement
            try (Connection conn = writerDataSource.getConnection()) {
                boolean hasHistoryTable = false;
                try (ResultSet rs = conn.getMetaData().getTables(null, null, "flyway_schema_history", null)) {
                    if (rs.next()) {
                        hasHistoryTable = true;
                    }
                }
                if (!hasHistoryTable) {
                    try (ResultSet rs = conn.getMetaData().getTables(null, null, "FLYWAY_SCHEMA_HISTORY", null)) {
                        if (rs.next()) {
                            hasHistoryTable = true;
                        }
                    }
                }
                if (!hasHistoryTable) {
                    try (Statement stmt = conn.createStatement()) {
                        stmt.execute("CREATE TABLE flyway_schema_history (" +
                                "installed_rank INT NOT NULL," +
                                "version VARCHAR(50)," +
                                "description VARCHAR(200) NOT NULL," +
                                "type VARCHAR(20) NOT NULL," +
                                "script VARCHAR(1000) NOT NULL," +
                                "checksum INT," +
                                "installed_by VARCHAR(100) NOT NULL," +
                                "installed_on TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP," +
                                "execution_time INT NOT NULL," +
                                "success TINYINT(1) NOT NULL," +
                                "CONSTRAINT flyway_schema_history_pk PRIMARY KEY (installed_rank)" +
                                ")");
                        
                        boolean hasLegacyTables = false;
                        try (ResultSet rs = conn.getMetaData().getTables(null, null, "users", null)) {
                            if (rs.next()) {
                                hasLegacyTables = true;
                            }
                        }
                        if (!hasLegacyTables) {
                            try (ResultSet rs = conn.getMetaData().getTables(null, null, "USERS", null)) {
                                if (rs.next()) {
                                    hasLegacyTables = true;
                                }
                            }
                        }
                        if (hasLegacyTables) {
                            stmt.execute("INSERT INTO flyway_schema_history " +
                                    "(installed_rank, version, description, type, script, installed_by, execution_time, success) " +
                                    "VALUES (1, '1', '<< Flyway Baseline >>', 'BASELINE', '<< Flyway Baseline >>', 'system', 0, 1)");
                        }
                    }
                }
            } catch (Exception e) {
                System.err.println("[Flyway-PreInit] Warning: " + e.getMessage());
            }
        }

        org.flywaydb.core.Flyway flyway = org.flywaydb.core.Flyway.configure()
                .dataSource(writerDataSource)
                .baselineOnMigrate(isH2)
                .locations("classpath:db/migration")
                .load();
        flyway.migrate();
        return flyway;
    }
}
