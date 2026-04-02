const express = require("express");
const { requireAdmin } = require("../middleware/auth");
const { getDB } = require("../db");
const { TOTAL_QUESTIONS } = require("../questions");

const router = express.Router();

// ── GET /api/admin/leaderboard ── (admin only) ───────────────
router.get("/leaderboard", requireAdmin, async (req, res) => {
  const db = getDB();

  try {
    const { rows: teams } = await db.query(`
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
    `);

    // Postgres SUM returns a string/BigInt sometimes, ensure it is numbered.
    // Also postgres returns 'is_finished' as integers here because it was an integer column.
    
    // Postgres COUNT() returns BigInt string, parse to int
    const formattedTeams = teams.map(t => ({
      ...t,
      questions_solved: Number(t.questions_solved),
      total_time_seconds: Number(t.total_time_seconds)
    }));

    return res.json({ teams: formattedTeams, totalQuestions: TOTAL_QUESTIONS });
  } catch (err) {
    console.error("Leaderboard error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ── GET /api/admin/team/:teamId ── (admin only) ──────────────
router.get("/team/:teamId", requireAdmin, async (req, res) => {
  const db = getDB();
  try {
    const { rows: teamRows } = await db.query(
      "SELECT id, name, current_question, is_finished, finish_time, started_at, registered_at FROM teams WHERE id = $1",
      [req.params.teamId]
    );
    const team = teamRows[0];

    if (!team) return res.status(404).json({ error: "Team not found." });

    const { rows: submissions } = await db.query(
      "SELECT question_number, solved_at, time_taken_seconds FROM submissions WHERE team_id = $1 ORDER BY question_number",
      [req.params.teamId]
    );

    return res.json({ team, submissions });
  } catch (err) {
    console.error("Team detail error:", err);
    res.status(500).json({ error: "Server error" });
  }
});


// ── GET /api/admin/public-leaderboard ── (admin only) ─────────
// Kept for backward compatibility, but now requires admin key.
router.get("/public-leaderboard", requireAdmin, async (req, res) => {
  const db = getDB();

  try {
    const { rows: teams } = await db.query(`
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
    `);

    const formattedTeams = teams.map(t => ({
      ...t,
      questions_solved: Number(t.questions_solved),
      total_time_seconds: Number(t.total_time_seconds)
    }));

    return res.json({ teams: formattedTeams, totalQuestions: TOTAL_QUESTIONS });
  } catch (err) {
    console.error("Public leaderboard error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ── POST /api/admin/reset-competition ── (admin only) ────────
// ⚠️  Wipes all progress — use only before re-running the event
router.post("/reset-competition", requireAdmin, async (req, res) => {
  const { confirm } = req.body;
  if (confirm !== "RESET_ALL_DATA") {
    return res.status(400).json({
      error: 'Send { "confirm": "RESET_ALL_DATA" } to confirm the reset.',
    });
  }
  const db = getDB();
  try {
    await db.query("DELETE FROM submissions");
    await db.query(
      "UPDATE teams SET current_question = 1, is_finished = 0, finish_time = NULL, started_at = NULL"
    );
    return res.json({ message: "Competition reset successfully." });
  } catch (err) {
    console.error("Reset error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
