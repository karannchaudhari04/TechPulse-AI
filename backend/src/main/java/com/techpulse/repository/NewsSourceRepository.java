package com.techpulse.repository;

import com.techpulse.model.NewsSource;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface NewsSourceRepository extends JpaRepository<NewsSource, Long> {
    List<NewsSource> findByActiveTrue();
}
