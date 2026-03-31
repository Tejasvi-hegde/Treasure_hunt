const express = require("express");
const { requireAdmin } = require("../middleware/auth");
const { getDB } = require("../db");
const { TOTAL_QUESTIONS } = require("../questions");

const router = express.Router();

// ── GET /api/admin/leaderboard ── (admin only) ───────────────
router.get("/leaderboard", requireAdmin, (req, res) => {
  const db = getDB();

  const teams = db.prepare(`
    SELECT
      t.id,
      t.name,
      t.current_question,
      t.is_finished,
      t.finish_time,
      t.started_at,
      t.registered_at,
      COUNT(s.id)           AS questions_solved,
      COALESCE(SUM(s.time_taken_seconds), 0) AS total_time_seconds
    FROM teams t
    LEFT JOIN submissions s ON s.team_id = t.id
    GROUP BY t.id
    ORDER BY
      t.is_finished DESC,
      questions_solved DESC,
      total_time_seconds ASC
  `).all();

  return res.json({ teams, totalQuestions: TOTAL_QUESTIONS });
});

// ── GET /api/admin/team/:teamId ── (admin only) ──────────────
router.get("/team/:teamId", requireAdmin, (req, res) => {
  const db = getDB();
  const team = db.prepare(
    "SELECT id, name, current_question, is_finished, finish_time, started_at, registered_at FROM teams WHERE id = ?"
  ).get(req.params.teamId);

  if (!team) return res.status(404).json({ error: "Team not found." });

  const submissions = db.prepare(
    "SELECT question_number, solved_at, time_taken_seconds FROM submissions WHERE team_id = ? ORDER BY question_number"
  ).all(req.params.teamId);

  const attempts = db.prepare(
    "SELECT question_number, attempted_answer, is_correct, attempted_at FROM attempts WHERE team_id = ? ORDER BY attempted_at DESC LIMIT 100"
  ).all(req.params.teamId);

  return res.json({ team, submissions, attempts });
});

// ── GET /api/admin/attempts ── (admin only) ──────────────────
router.get("/attempts", requireAdmin, (req, res) => {
  const db = getDB();
  const attempts = db.prepare(`
    SELECT a.id, t.name AS team_name, a.question_number,
           a.attempted_answer, a.is_correct, a.attempted_at
    FROM attempts a
    JOIN teams t ON t.id = a.team_id
    ORDER BY a.attempted_at DESC
    LIMIT 300
  `).all();
  return res.json({ attempts });
});

// ── GET /api/admin/public-leaderboard ── (admin only) ─────────
// Kept for backward compatibility, but now requires admin key.
router.get("/public-leaderboard", requireAdmin, (req, res) => {
  const db = getDB();

  const teams = db.prepare(`
    SELECT
      t.name,
      t.current_question,
      t.is_finished,
      t.finish_time,
      COUNT(s.id)           AS questions_solved,
      COALESCE(SUM(s.time_taken_seconds), 0) AS total_time_seconds
    FROM teams t
    LEFT JOIN submissions s ON s.team_id = t.id
    GROUP BY t.id
    ORDER BY
      t.is_finished DESC,
      questions_solved DESC,
      total_time_seconds ASC
  `).all();

  return res.json({ teams, totalQuestions: TOTAL_QUESTIONS });
});

// ── POST /api/admin/reset-competition ── (admin only) ────────
// ⚠️  Wipes all progress — use only before re-running the event
router.post("/reset-competition", requireAdmin, (req, res) => {
  const { confirm } = req.body;
  if (confirm !== "RESET_ALL_DATA") {
    return res.status(400).json({
      error: 'Send { "confirm": "RESET_ALL_DATA" } to confirm the reset.',
    });
  }
  const db = getDB();
  db.prepare("DELETE FROM attempts").run();
  db.prepare("DELETE FROM submissions").run();
  db.prepare(
    "UPDATE teams SET current_question = 1, is_finished = 0, finish_time = NULL, started_at = NULL"
  ).run();
  return res.json({ message: "Competition reset successfully." });
});

module.exports = router;
