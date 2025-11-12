-- Use a dedicated database if you like:
-- CREATE DATABASE IF NOT EXISTS academy_portal CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- USE academy_portal;

SET NAMES utf8mb4;
SET time_zone = '+00:00';

/* =========================================================
   1) Authentication
========================================================= */
CREATE TABLE users (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  username      VARCHAR(150) NOT NULL UNIQUE,
  password      VARCHAR(255) NOT NULL,           -- store hashed passwords (bcrypt/argon2)
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/* =========================================================
   2) Homepage Management
========================================================= */
CREATE TABLE homepage_officials (
  id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name           VARCHAR(255) NOT NULL,
  title          VARCHAR(255) NOT NULL,
  image_url      VARCHAR(2048) NOT NULL,
  link_url       VARCHAR(2048) NULL,
  display_order  INT NOT NULL DEFAULT 0,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_homepage_officials_order (display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE homepage_carousel (
  id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  alt_text       VARCHAR(255) NOT NULL,
  image_url      VARCHAR(2048) NOT NULL,
  display_order  INT NOT NULL DEFAULT 0,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_homepage_carousel_order (display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE sidebar_links (
  id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name           VARCHAR(255) NOT NULL,
  url            VARCHAR(2048) NOT NULL,
  type           ENUM('update','quicklink') NOT NULL,
  display_order  INT NOT NULL DEFAULT 0,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_sidebar_links_type (type),
  KEY idx_sidebar_links_order (display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/* =========================================================
   3) "About" Section
========================================================= */
CREATE TABLE about_content (
  id                   TINYINT UNSIGNED NOT NULL PRIMARY KEY DEFAULT 1,
  vision_statement     LONGTEXT NOT NULL,
  mission_statements   LONGTEXT NOT NULL,
  updated_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT chk_about_content_single CHECK (id = 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE about_organisation (
  id               TINYINT UNSIGNED NOT NULL PRIMARY KEY DEFAULT 1,
  description      LONGTEXT NOT NULL,
  chart_image_url  VARCHAR(2048) NOT NULL,
  updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT chk_about_org_single CHECK (id = 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE about_rti (
  id               TINYINT UNSIGNED NOT NULL PRIMARY KEY DEFAULT 1,
  pio_name         VARCHAR(255) NOT NULL,
  pio_phone        VARCHAR(50)  NOT NULL,
  apio_name        VARCHAR(255) NOT NULL,
  apio_phone       VARCHAR(50)  NOT NULL,
  appellate_name   VARCHAR(255) NOT NULL,
  appellate_phone  VARCHAR(50)  NOT NULL,
  pdf_english_url  VARCHAR(2048) NOT NULL,
  pdf_telugu_url   VARCHAR(2048) NOT NULL,
  updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT chk_about_rti_single CHECK (id = 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE chairmans (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  s_no          INT NOT NULL,
  name          VARCHAR(255) NOT NULL,
  service_years VARCHAR(100) NOT NULL,
  KEY idx_chairmans_sno (s_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/* =========================================================
   4) News & Articles
========================================================= */
CREATE TABLE articles (
  id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  headline       VARCHAR(500) NOT NULL,
  summary        VARCHAR(1000) NOT NULL,
  full_content   LONGTEXT NOT NULL,
  article_types  SET('news','external','fact-check') NOT NULL,
  image_url      VARCHAR(2048) NOT NULL,
  date           DATETIME NOT NULL,
  author         VARCHAR(255) NULL,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_articles_date (date),
  KEY idx_articles_types (article_types)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/* =========================================================
   5) Gallery
========================================================= */
CREATE TABLE gallery_photos (
  id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title      VARCHAR(255) NOT NULL,
  date       DATE NOT NULL,
  image_url  VARCHAR(2048) NOT NULL,
  KEY idx_gallery_photos_date (date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE gallery_videos (
  id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title          VARCHAR(255) NOT NULL,
  date           DATE NOT NULL,
  video_id       VARCHAR(50) NOT NULL,
  thumbnail_url  VARCHAR(2048) NULL,
  KEY idx_gallery_videos_date (date),
  KEY idx_gallery_videos_vid (video_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/* =========================================================
   6) Publications
========================================================= */
CREATE TABLE publications (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title           VARCHAR(500) NOT NULL,
  description     TEXT NOT NULL,
  cover_image_url VARCHAR(2048) NOT NULL,
  pdf_file_url    VARCHAR(2048) NOT NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/* =========================================================
   7) Files (Circulars & Archives)
========================================================= */
CREATE TABLE circulars (
  id        BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  s_no      INT NOT NULL,
  number    VARCHAR(255) NOT NULL,
  date      DATE NOT NULL,
  subject   LONGTEXT NOT NULL,
  file_url  VARCHAR(2048) NOT NULL,
  KEY idx_circulars_sno (s_no),
  KEY idx_circulars_date (date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE archives (
  id        BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title     VARCHAR(500) NOT NULL,
  date      DATE NOT NULL,
  type      VARCHAR(100) NOT NULL,
  file_url  VARCHAR(2048) NOT NULL,
  KEY idx_archives_date (date),
  KEY idx_archives_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/* =========================================================
   8) Activities
========================================================= */
CREATE TABLE activities (
  id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title          VARCHAR(500) NOT NULL,
  description    TEXT NOT NULL,
  activity_type  ENUM('class','seminar','course') NOT NULL,
  duration       VARCHAR(100) NULL,
  date           DATE NULL,
  image_url      VARCHAR(2048) NOT NULL,
  is_active      TINYINT(1) NOT NULL DEFAULT 0,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_activities_type (activity_type),
  KEY idx_activities_date (date),
  KEY idx_activities_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/* =========================================================
   9) Other Site Links
========================================================= */
CREATE TABLE links (
  id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name           VARCHAR(255) NOT NULL,
  url            VARCHAR(2048) NOT NULL,
  type           ENUM('media-body','portal') NOT NULL,
  display_order  INT NOT NULL DEFAULT 0,
  KEY idx_links_type (type),
  KEY idx_links_order (display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/* =========================================================
   10) Form Submissions & Utility
========================================================= */
CREATE TABLE email_captures (
  id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email      VARCHAR(320) NOT NULL,
  file_name  VARCHAR(500) NOT NULL,
  timestamp  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_email_captures_time (timestamp),
  KEY idx_email_captures_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE contact_submissions (
  id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(255) NOT NULL,
  email      VARCHAR(320) NOT NULL,
  subject    VARCHAR(500) NOT NULL,
  message    LONGTEXT NOT NULL,
  timestamp  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  is_read    TINYINT(1) NOT NULL DEFAULT 0,
  KEY idx_contact_submissions_time (timestamp),
  KEY idx_contact_submissions_isread (is_read)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE blocked_users (
  username VARCHAR(255) PRIMARY KEY,
  failed_attempts INT NOT NULL DEFAULT 0,
  first_attempt_time DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE jwt_blocklist (
    token VARCHAR(512) PRIMARY KEY,
    expiry DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
