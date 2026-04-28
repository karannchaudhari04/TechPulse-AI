package com.techbite.repository;

import com.techbite.model.Category;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Set;

public interface CategoryRepository extends JpaRepository<Category, Long> {
    Set<Category> findByNameIn(Set<String> names);
}
