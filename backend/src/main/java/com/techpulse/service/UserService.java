package com.techpulse.service;

import com.techpulse.model.User;
import com.techpulse.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.dao.DataIntegrityViolationException;

import java.util.Optional;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.CacheEvict;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final Map<String, UserCacheEntry> userCache = new ConcurrentHashMap<>();
    private static final long CACHE_TTL_MS = 60000; // 1 minute TTL to absorb concurrent startup requests

    private static class UserCacheEntry {
        final User user;
        final long timestamp;
        UserCacheEntry(User user) {
            this.user = user;
            this.timestamp = System.currentTimeMillis();
        }
        boolean isExpired() {
            return System.currentTimeMillis() - timestamp > CACHE_TTL_MS;
        }
    }

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    /**
     * Retrieves a user by Firebase UID using an in-memory cache to absorb concurrent request bursts.
     */
    public Optional<User> getUserByFirebaseUid(String firebaseUid) {
        if (firebaseUid == null) {
            return Optional.empty();
        }
        UserCacheEntry entry = userCache.get(firebaseUid);
        if (entry != null && !entry.isExpired()) {
            return Optional.of(entry.user);
        }
        Optional<User> userOpt = userRepository.findByFirebaseUid(firebaseUid);
        userOpt.ifPresent(user -> userCache.put(firebaseUid, new UserCacheEntry(user)));
        return userOpt;
    }

    /**
     * Retrieves and caches the user's role in Redis to secure multi-instance scalability.
     */
    @Cacheable(value = "userRoles", key = "#firebaseUid")
    public String getUserRole(String firebaseUid) {
        if (firebaseUid == null) {
            return "USER";
        }
        return userRepository.findByFirebaseUid(firebaseUid)
                .map(user -> user.getRole().name())
                .orElse("USER");
    }

    /**
     * Explicitly evicts a user from the cache upon write operations.
     */
    @CacheEvict(value = "userRoles", key = "#firebaseUid")
    public void evictUserCache(String firebaseUid) {
        if (firebaseUid != null) {
            userCache.remove(firebaseUid);
        }
    }

    /**
     * Periodically sweeps the cache to actively prune expired entries from memory.
     * Prevents memory leaks by ensuring inactive user entries are purged.
     */
    @org.springframework.scheduling.annotation.Scheduled(fixedRate = 60000)
    public void cleanupExpiredCache() {
        userCache.values().removeIf(UserCacheEntry::isExpired);
    }

    /**
     * Atomically ensures a user exists by UID or Email.
     * Uses REQUIRES_NEW to ensure the record is committed immediately,
     * preventing race conditions with parallel requests.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public User syncUserWithBackend(String firebaseUid, String email, String displayName, String photoUrl) {
        evictUserCache(firebaseUid);
        // 1. Try to find by UID
        Optional<User> existingUser = userRepository.findByFirebaseUid(firebaseUid);
        if (existingUser.isPresent()) {
            User user = updateAndSave(existingUser.get(), email, displayName, photoUrl);
            evictUserCache(firebaseUid);
            return user;
        }

        // 2. Try to find by Email for recovery
        if (email != null) {
            Optional<User> existingByEmail = userRepository.findByEmail(email);
            if (existingByEmail.isPresent()) {
                User recoveredUser = existingByEmail.get();
                recoveredUser.setFirebaseUid(firebaseUid);
                User user = updateAndSave(recoveredUser, email, displayName, photoUrl);
                evictUserCache(firebaseUid);
                return user;
            }
        }

        // 3. Create brand new user
        try {
            User newUser = new User();
            newUser.setFirebaseUid(firebaseUid);
            newUser.setEmail(email != null ? email : firebaseUid + "@unknown.com");
            newUser.setDisplayName(displayName);
            newUser.setProfilePictureUrl(photoUrl);
            User saved = userRepository.saveAndFlush(newUser);
            evictUserCache(firebaseUid);
            return saved;
        } catch (DataIntegrityViolationException e) {
            // Someone else created it in the last millisecond
            User existing = userRepository.findByFirebaseUid(firebaseUid)
                    .or(() -> userRepository.findByEmail(email))
                    .orElseThrow(() -> new RuntimeException("Race condition during user creation."));
            evictUserCache(firebaseUid);
            return existing;
        }
    }

    private User updateAndSave(User user, String email, String displayName, String photoUrl) {
        if (displayName != null) user.setDisplayName(displayName);
        if (photoUrl != null) user.setProfilePictureUrl(photoUrl);
        if (email != null) user.setEmail(email);
        User saved = userRepository.save(user);
        evictUserCache(user.getFirebaseUid());
        return saved;
    }
}
