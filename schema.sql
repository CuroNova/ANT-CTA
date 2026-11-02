CREATE DATABASE IF NOT EXISTS guild_matching DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE guild_matching;

CREATE TABLE IF NOT EXISTS party_slots (
  slot_id VARCHAR(20) PRIMARY KEY,       -- 예: P1U01, P2U13
  party_num INT NOT NULL,                -- 파티 번호 (1, 2, 3...)
  guild VARCHAR(50) DEFAULT 'ANT',       -- 선택된 길드
  nickname VARCHAR(50) DEFAULT '',       -- 닉네임 (최대 30자)
  comment VARCHAR(200) DEFAULT '',       -- 코멘트
  attendance TINYINT(1) DEFAULT 0,       -- 출결 (0 또는 1)
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);