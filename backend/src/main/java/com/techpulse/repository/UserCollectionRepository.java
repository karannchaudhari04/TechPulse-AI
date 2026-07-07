package com.techpulse.repository;

import com.techpulse.model.UserCollection;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface UserCollectionRepository extends JpaRepository<UserCollection, Long> {
    List<UserCollection> findByUserId(Long userId);
}
