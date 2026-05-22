package com.WizardFrac.WizardFrac.config;

import com.zaxxer.hikari.HikariDataSource;
import jakarta.annotation.PostConstruct;
import javax.sql.DataSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

import java.sql.Connection;
import java.sql.DriverManager;

@Configuration
public class DataSourceConfig {

    private final Logger log = LoggerFactory.getLogger(DataSourceConfig.class);

    @Value("${spring.datasource.url:}")
    private String dbUrl;

    @Value("${spring.datasource.username:}")
    private String dbUser;

    @Value("${spring.datasource.password:}")
    private String dbPass;

    @Bean
    @Primary
    public DataSource dataSource() {
        if (isExternalDbReachable()) {
            log.info("Using external datasource: {}", obfuscateUrl(dbUrl));
            HikariDataSource ds = new HikariDataSource();
            ds.setJdbcUrl(dbUrl);
            if (dbUser != null) ds.setUsername(dbUser);
            if (dbPass != null) ds.setPassword(dbPass);
            return ds;
        }

        log.warn("External DB not reachable; falling back to in-memory H2 datasource for local development");
        HikariDataSource ds = new HikariDataSource();
        ds.setJdbcUrl("jdbc:h2:mem:wizardfrac;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE");
        ds.setUsername("sa");
        ds.setPassword("");
        return ds;
    }

    private boolean isExternalDbReachable() {
        try {
            if (dbUrl == null || dbUrl.isBlank()) {
                log.debug("No external DB URL configured");
                return false;
            }
            // Set a short login timeout and try to open a connection
            DriverManager.setLoginTimeout(5);
            try (Connection c = DriverManager.getConnection(dbUrl, dbUser, dbPass)) {
                log.debug("Successfully connected to external DB");
                return true;
            }
        } catch (Exception e) {
            log.error("External DB reachability check failed: {}", e.getMessage(), e);
            return false;
        }
    }

    private String obfuscateUrl(String url) {
        if (url == null) return "<none>";
        int q = url.indexOf('?');
        String base = q > 0 ? url.substring(0, q) : url;
        return base.replaceAll("(//).*:(.*)@", "$1****:****@");
    }
}
