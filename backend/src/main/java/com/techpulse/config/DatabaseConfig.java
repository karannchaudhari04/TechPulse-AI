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
        ds.setJdbcUrl(writerUrl);
        ds.setUsername(writerUser);
        ds.setPassword(writerPassword);
        ds.setDriverClassName("com.mysql.cj.jdbc.Driver");
        ds.setMaximumPoolSize(10);
        ds.setMaxLifetime(300000); // 5 minutes to prevent connection pool validation warnings
        ds.setConnectionInitSql("SET SESSION tidb_enable_noop_functions = 1");
        return ds;
    }

    @Bean
    public DataSource replicaDataSource() {
        HikariDataSource ds = new HikariDataSource();
        ds.setJdbcUrl(replicaUrl != null && !replicaUrl.isEmpty() ? replicaUrl : writerUrl);
        ds.setUsername(replicaUser != null && !replicaUser.isEmpty() ? replicaUser : writerUser);
        ds.setPassword(replicaPassword != null && !replicaPassword.isEmpty() ? replicaPassword : writerPassword);
        ds.setDriverClassName("com.mysql.cj.jdbc.Driver");
        ds.setMaximumPoolSize(20);
        ds.setMaxLifetime(300000); // 5 minutes to prevent connection pool validation warnings
        
        ds.setConnectionInitSql("SET SESSION tidb_enable_noop_functions = 1, tidb_replica_read = 'leader-and-follower'");
        
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
        properties.setProperty("hibernate.dialect", "org.hibernate.dialect.MySQLDialect");
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
}
