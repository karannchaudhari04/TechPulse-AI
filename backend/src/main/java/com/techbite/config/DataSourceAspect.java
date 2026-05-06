package com.techbite.config;

import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Aspect
@Component
@Order(1) // Run before Spring's transaction manager interceptor
@Slf4j
public class DataSourceAspect {

    @Around("@annotation(transactional)")
    public Object proceed(ProceedingJoinPoint proceedingJoinPoint, Transactional transactional) throws Throwable {
        try {
            if (transactional.readOnly()) {
                DbContextHolder.setDbType(DbContextHolder.DbType.REPLICA);
                log.debug("Routing database call to REPLICA");
            } else {
                DbContextHolder.setDbType(DbContextHolder.DbType.PRIMARY);
                log.debug("Routing database call to PRIMARY");
            }
            return proceedingJoinPoint.proceed();
        } finally {
            DbContextHolder.clearDbType();
        }
    }
}
