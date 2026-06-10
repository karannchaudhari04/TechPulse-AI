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
}
