package com.techbite.repository;

import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.Optional;
import java.util.Set;

public interface UserRepository extends JpaRepository<User, Long> {
    @Cacheable(value = "users", key = "#firebaseUid")
    Optional<User> findByFirebaseUid(String firebaseUid);
    Optional<User> findByEmail(String email);

    @Query("SELECT b.id FROM User u JOIN u.likedBites b WHERE u.id = :userId")
    Set<Long> findLikedBiteIdsByUserId(@Param("userId") Long userId);
}
