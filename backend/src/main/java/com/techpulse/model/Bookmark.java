package com.techpulse.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "bookmarks", indexes = {
    @Index(name = "idx_bookmarks_user_id", columnList = "user_id"),
    @Index(name = "idx_bookmarks_bite_id", columnList = "bite_id"),
    @Index(name = "idx_bookmarks_user_bite", columnList = "user_id, bite_id")
})
@Getter
@Setter
@NoArgsConstructor
public class Bookmark {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "bite_id", nullable = false)
    private Bite bite;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
}
