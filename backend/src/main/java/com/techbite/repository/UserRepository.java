package com.techbite.repository;

import com.techbite.model.User;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.Optional;
import java.util.Set;

public interface UserRepository extends JpaRepository<User, Long> {
    
    @EntityGraph(attributePaths = {"preferences"})
    Optional<User> findByFirebaseUid(String firebaseUid);
    
    @EntityGraph(attributePaths = {"preferences"})
    Optional<User> findByEmail(String email);

    @Query("SELECT b.id FROM User u JOIN u.likedBites b WHERE u.id = :userId")
    Set<Long> findLikedBiteIdsByUserId(@Param("userId") Long userId);

    @Query("SELECT COUNT(b) FROM User u JOIN u.likedBites b WHERE u.id = :userId")
    long countLikedBitesByUserId(@Param("userId") Long userId);
}
