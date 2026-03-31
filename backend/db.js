const Database = require("better-sqlite3");
const path = require("path");

const DB_PATH = process.env.DB_PATH || path.join(__dirname, "treasure_hunt.db");

let db;

function getDB() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL"); // faster writes
    db.pragma("foreign_keys = ON");
  }
  return db;
}

function initDB() {
  const db = getDB();

  db.exec(`
    CREATE TABLE IF NOT EXISTS teams (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      name            TEXT    UNIQUE NOT NULL COLLATE NOCASE,
      password_hash   TEXT    NOT NULL,
      current_question INTEGER DEFAULT 1,
      is_finished     INTEGER DEFAULT 0,
      finish_time     TEXT,
      started_at      TEXT,
      registered_at   TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS submissions (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      team_id             INTEGER NOT NULL,
      question_number     INTEGER NOT NULL,
      solved_at           TEXT    DEFAULT (datetime('now')),
      time_taken_seconds  INTEGER NOT NULL,
      FOREIGN KEY (team_id) REFERENCES teams(id),
      UNIQUE(team_id, question_number)
    );

    CREATE TABLE IF NOT EXISTS attempts (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      team_id          INTEGER NOT NULL,
      question_number  INTEGER NOT NULL,
      attempted_answer TEXT    NOT NULL,
      is_correct       INTEGER NOT NULL DEFAULT 0,
      attempted_at     TEXT    DEFAULT (datetime('now')),
      FOREIGN KEY (team_id) REFERENCES teams(id)
    );
  `);

  console.log("✅ Database initialized at:", DB_PATH);
}

module.exports = { getDB, initDB };
