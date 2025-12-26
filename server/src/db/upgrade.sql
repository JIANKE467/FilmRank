SET @db_name = DATABASE();

SET @col_exists = (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = @db_name
    AND table_name = 'movies'
    AND column_name = 'backdrop_url'
);
SET @sql = IF(@col_exists = 0, 'ALTER TABLE movies ADD COLUMN backdrop_url VARCHAR(500) NULL', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = @db_name
    AND table_name = 'movies'
    AND column_name = 'tmdb_vote_average'
);
SET @sql = IF(@col_exists = 0, 'ALTER TABLE movies ADD COLUMN tmdb_vote_average DECIMAL(3,1) NULL', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = @db_name
    AND table_name = 'movies'
    AND column_name = 'tmdb_vote_count'
);
SET @sql = IF(@col_exists = 0, 'ALTER TABLE movies ADD COLUMN tmdb_vote_count INT NULL', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = @db_name
    AND table_name = 'movies'
    AND column_name = 'tmdb_revenue'
);
SET @sql = IF(@col_exists = 0, 'ALTER TABLE movies ADD COLUMN tmdb_revenue BIGINT NULL', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS movie_keywords (
  movie_id BIGINT NOT NULL,
  keyword_id BIGINT NOT NULL,
  name VARCHAR(100) NOT NULL,
  PRIMARY KEY (movie_id, keyword_id),
  INDEX idx_movie_keywords_name(name),
  CONSTRAINT fk_movie_keywords_movie FOREIGN KEY (movie_id) REFERENCES movies(movie_id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS movie_cast (
  movie_id BIGINT NOT NULL,
  cast_id BIGINT NOT NULL,
  name VARCHAR(100) NOT NULL,
  character_name VARCHAR(200) NULL,
  profile_url VARCHAR(500) NULL,
  cast_order INT NULL,
  PRIMARY KEY (movie_id, cast_id),
  INDEX idx_movie_cast_order(movie_id, cast_order),
  CONSTRAINT fk_movie_cast_movie FOREIGN KEY (movie_id) REFERENCES movies(movie_id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS movie_crew (
  movie_id BIGINT NOT NULL,
  crew_id BIGINT NOT NULL,
  name VARCHAR(100) NOT NULL,
  job VARCHAR(100) NULL,
  profile_url VARCHAR(500) NULL,
  PRIMARY KEY (movie_id, crew_id),
  INDEX idx_movie_crew_job(movie_id, job),
  CONSTRAINT fk_movie_crew_movie FOREIGN KEY (movie_id) REFERENCES movies(movie_id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS bookmarks (
  bookmark_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  movie_id BIGINT NOT NULL,
  note VARCHAR(500) NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_user_bookmark(user_id, movie_id),
  INDEX idx_bookmarks_user(user_id, created_at),
  CONSTRAINT fk_bookmarks_user FOREIGN KEY (user_id) REFERENCES users(user_id),
  CONSTRAINT fk_bookmarks_movie FOREIGN KEY (movie_id) REFERENCES movies(movie_id)
) ENGINE=InnoDB;

SET @col_exists = (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = @db_name
    AND table_name = 'bookmarks'
    AND column_name = 'kind'
);
SET @sql = IF(@col_exists = 0, 'ALTER TABLE bookmarks ADD COLUMN kind ENUM(\"favorite\",\"note\") DEFAULT \"favorite\"', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE bookmarks
SET kind = CASE
  WHEN note IS NULL OR note = '' THEN 'favorite'
  ELSE 'note'
END
WHERE kind IS NULL;

SET @col_exists = (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = @db_name
    AND table_name = 'users'
    AND column_name = 'bio'
);
SET @sql = IF(@col_exists = 0, 'ALTER TABLE users ADD COLUMN bio VARCHAR(500) NULL', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
