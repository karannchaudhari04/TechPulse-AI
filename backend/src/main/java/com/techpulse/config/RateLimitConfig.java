package com.techpulse.config;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.BucketConfiguration;
import io.github.bucket4j.distributed.ExpirationAfterWriteStrategy;
import io.github.bucket4j.distributed.proxy.ProxyManager;
import io.github.bucket4j.distributed.proxy.RemoteBucketBuilder;
import io.github.bucket4j.redis.lettuce.cas.LettuceBasedProxyManager;
import io.lettuce.core.RedisClient;
import io.lettuce.core.api.StatefulRedisConnection;
import io.lettuce.core.codec.ByteArrayCodec;
import io.lettuce.core.codec.RedisCodec;
import io.lettuce.core.codec.StringCodec;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;

import java.time.Duration;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Supplier;

@Configuration
@Profile("!test")
public class RateLimitConfig {

    private static final Logger log = LoggerFactory.getLogger(RateLimitConfig.class);

    @Bean
    @SuppressWarnings("unchecked")
    public ProxyManager<String> proxyManager(RedisConnectionFactory connectionFactory) {
        try {
            if (connectionFactory instanceof LettuceConnectionFactory lettuceFactory) {
                RedisClient redisClient = (RedisClient) lettuceFactory.getNativeClient();
                if (redisClient != null) {
                    StatefulRedisConnection<String, byte[]> connection = redisClient.connect(
                            RedisCodec.of(StringCodec.UTF8, ByteArrayCodec.INSTANCE)
                    );
                    log.info("[RateLimitConfig] Successfully connected to Redis for distributed rate limiting.");
                    return LettuceBasedProxyManager.builderFor(connection)
                            .withExpirationStrategy(ExpirationAfterWriteStrategy.basedOnTimeForRefillingBucketUpToMax(Duration.ofMinutes(10)))
                            .build();
                }
            }
        } catch (Exception e) {
            log.warn("[RateLimitConfig] Redis server unavailable ({}). Falling back to In-Memory rate limiting for local development.", e.getMessage());
        }

        log.info("[RateLimitConfig] Initializing In-Memory Fallback ProxyManager.");
        ConcurrentHashMap<String, Bucket> localBuckets = new ConcurrentHashMap<>();

        return (ProxyManager<String>) java.lang.reflect.Proxy.newProxyInstance(
                ProxyManager.class.getClassLoader(),
                new Class<?>[]{ProxyManager.class},
                (proxy, method, args) -> {
                    String methodName = method.getName();
                    if ("builder".equals(methodName)) {
                        return createLocalBucketBuilder(localBuckets);
                    }
                    if ("hashCode".equals(methodName)) {
                        return System.identityHashCode(proxy);
                    }
                    if ("equals".equals(methodName)) {
                        return proxy == (args != null && args.length > 0 ? args[0] : null);
                    }
                    if ("toString".equals(methodName)) {
                        return "InMemoryFallbackProxyManager@" + Integer.toHexString(System.identityHashCode(proxy));
                    }
                    return null;
                }
        );
    }

    @SuppressWarnings("unchecked")
    private RemoteBucketBuilder<String> createLocalBucketBuilder(ConcurrentHashMap<String, Bucket> localBuckets) {
        return (RemoteBucketBuilder<String>) java.lang.reflect.Proxy.newProxyInstance(
                RemoteBucketBuilder.class.getClassLoader(),
                new Class<?>[]{RemoteBucketBuilder.class},
                (proxy, method, args) -> {
                    String methodName = method.getName();
                    if ("build".equals(methodName) && args != null && args.length >= 2) {
                        String key = (String) args[0];
                        BucketConfiguration config = null;
                        if (args[1] instanceof Supplier<?> supplier) {
                            config = (BucketConfiguration) supplier.get();
                        } else if (args[1] instanceof BucketConfiguration bc) {
                            config = bc;
                        }
                        
                        final BucketConfiguration finalConfig = config;
                        return localBuckets.computeIfAbsent(key, k -> {
                            if (finalConfig != null && finalConfig.getBandwidths().length > 0) {
                                return Bucket.builder().addLimit(finalConfig.getBandwidths()[0]).build();
                            }
                            return Bucket.builder().addLimit(Bandwidth.simple(100, Duration.ofMinutes(1))).build();
                        });
                    }
                    if ("hashCode".equals(methodName)) {
                        return System.identityHashCode(proxy);
                    }
                    if ("equals".equals(methodName)) {
                        return proxy == (args != null && args.length > 0 ? args[0] : null);
                    }
                    if ("toString".equals(methodName)) {
                        return "InMemoryFallbackRemoteBucketBuilder@" + Integer.toHexString(System.identityHashCode(proxy));
                    }
                    return proxy;
                }
        );
    }
}
