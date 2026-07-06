package com.techpulse.repository;

import com.techpulse.model.Category;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Set;
import java.util.List;

@Repository
public interface CategoryRepository extends JpaRepository<Category, Long> {
    Set<Category> findByNameIgnoreCaseIn(Set<String> names);
    List<Category> findAllByOrderByNameAsc();
}
