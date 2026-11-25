import mysql from 'mysql2/promise'
import { AUTH_TABLES } from './auth.js'

/**
 * The witch, plus users and sessions from auth.js:
 * - clients: one row per data key; each account owns one (users.device_id);
 * - witches: the progress of that key: level, XP, points, the five stats, settings, the Hydra's falls;
 * - witch_upgrades: the skill upgrades bought in the Ledger, one row each;
 * - shadows: the Shadow Room, one row per raised shadow;
 * - witch_altars: the altars she has lit, and which one she rises at (`last`).
 * v2 has no Rifts, so v1's rift_runs and tier_clears are not here. Times are stored in UTC.
 */
const TABLES = [
  `CREATE TABLE IF NOT EXISTS clients (
    id CHAR(12) PRIMARY KEY,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_seen DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS witches (
    client_id CHAR(12) PRIMARY KEY,
    level TINYINT UNSIGNED NOT NULL,
    xp INT UNSIGNED NOT NULL,
    stat_points SMALLINT UNSIGNED NOT NULL,
    skill_points SMALLINT UNSIGNED NOT NULL,
    hex SMALLINT UNSIGNED NOT NULL,
    spr SMALLINT UNSIGNED NOT NULL,
    vit SMALLINT UNSIGNED NOT NULL,
    agi SMALLINT UNSIGNED NOT NULL,
    umb SMALLINT UNSIGNED NOT NULL,
    next_shadow_id INT UNSIGNED NOT NULL,
    boss_kills INT UNSIGNED NOT NULL DEFAULT 0,
    settings JSON NOT NULL,
    updated_at DATETIME(3) NOT NULL,
    CONSTRAINT witches_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS witch_upgrades (
    client_id CHAR(12) NOT NULL,
    skill VARCHAR(16) NOT NULL,
