package com.techpulse.config;

import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.reflect.MethodSignature;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.lang.reflect.Method;

@Aspect
@Component
@Order(1) // Run before Spring's transaction manager interceptor
@Slf4j
public class DataSourceAspect {

    @Around("@annotation(org.springframework.transaction.annotation.Transactional) || @within(org.springframework.transaction.annotation.Transactional)")
    public Object proceed(ProceedingJoinPoint proceedingJoinPoint) throws Throwable {
        MethodSignature signature = (MethodSignature) proceedingJoinPoint.getSignature();
        Method method = signature.getMethod();
        
        // 1. Try to find the annotation on the method level
        Transactional transactional = method.getAnnotation(Transactional.class);
        if (transactional == null) {
            // 2. Fall back to class level
            transactional = proceedingJoinPoint.getTarget().getClass().getAnnotation(Transactional.class);
        }

        try {
            if (transactional != null && transactional.readOnly()) {
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

