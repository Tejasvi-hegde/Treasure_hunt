const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL
});

function getDB() {
  return pool;
}

async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS teams (
        id              SERIAL PRIMARY KEY,
        name            TEXT    UNIQUE NOT NULL,
        password_hash   TEXT    NOT NULL,
        current_question INTEGER DEFAULT 1,
        is_finished     INTEGER DEFAULT 0,
        finish_time     TIMESTAMP,
        started_at      TIMESTAMP,
        registered_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS submissions (
        id                  SERIAL PRIMARY KEY,
        team_id             INTEGER NOT NULL,
        question_number     INTEGER NOT NULL,
        solved_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        time_taken_seconds  INTEGER NOT NULL,
        FOREIGN KEY (team_id) REFERENCES teams(id),
        UNIQUE(team_id, question_number)
      );

      CREATE TABLE IF NOT EXISTS attempts (
        id               SERIAL PRIMARY KEY,
        team_id          INTEGER NOT NULL,
        question_number  INTEGER NOT NULL,
        attempted_answer TEXT    NOT NULL,
        is_correct       INTEGER NOT NULL DEFAULT 0,
        attempted_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (team_id) REFERENCES teams(id)
      );
    `);
    console.log("✅ Postgres Database initialized");
  } catch (error) {
    console.error("❌ DB Init error:", error);
  }
}

module.exports = { getDB, initDB, pool };
