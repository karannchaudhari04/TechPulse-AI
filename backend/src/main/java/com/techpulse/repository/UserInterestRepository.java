package com.techpulse.repository;

import com.techpulse.model.UserInterest;
import com.techpulse.model.UserInterestId;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface UserInterestRepository extends JpaRepository<UserInterest, UserInterestId> {
    List<UserInterest> findByUserId(Long userId);
}
