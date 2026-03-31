const express = require("express");
const rateLimit = require("express-rate-limit");
const { requireAuth } = require("../middleware/auth");
const { getQuestionForClient, validateAnswer, TOTAL_QUESTIONS } = require("../questions");
const { getDB } = require("../db");

const router = express.Router();

// Rate-limit answer submissions to prevent brute-force
// 5 attempts per minute per team
const submitLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  keyGenerator: (req) => String(req.team?.teamId ?? req.ip),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts. Please wait a minute before trying again." },
  skipSuccessfulRequests: false,
});

// ── POST /api/game/start ─────────────────────────────────────
// Called once when the team first opens the game page. Starts their timer.
router.post("/start", requireAuth, (req, res) => {
  const db = getDB();
  const team = db.prepare("SELECT * FROM teams WHERE id = ?").get(req.team.teamId);
  if (!team) return res.status(404).json({ error: "Team not found." });

  if (!team.started_at) {
    db.prepare("UPDATE teams SET started_at = datetime('now') WHERE id = ?").run(team.id);
  }

  const q = getQuestionForClient(team.current_question);
  return res.json({
    started: true,
    currentQuestion: team.current_question,
    question: q,
    isFinished: team.is_finished === 1,
    total: TOTAL_QUESTIONS,
  });
});

// ── GET /api/game/question ───────────────────────────────────
// Returns the team's current question — NO answer included.
router.get("/question", requireAuth, (req, res) => {
  const db = getDB();
  const team = db.prepare("SELECT * FROM teams WHERE id = ?").get(req.team.teamId);
  if (!team) return res.status(404).json({ error: "Team not found." });

  if (team.is_finished) {
    return res.json({ finished: true, message: "You have completed the treasure hunt! 🎉" });
  }

  const question = getQuestionForClient(team.current_question);
  if (!question) return res.status(500).json({ error: "Question not found." });

  return res.json({
    question,
    currentQuestion: team.current_question,
    total: TOTAL_QUESTIONS,
    isFinished: false,
  });
});

// ── POST /api/game/submit ────────────────────────────────────
// Validates the answer server-side only. NEVER sends the answer to the client.
router.post("/submit", requireAuth, submitLimiter, (req, res) => {
  const { answer } = req.body;

  if (!answer || typeof answer !== "string") {
    return res.status(400).json({ error: "Answer is required." });
  }
  if (answer.length > 300) {
    return res.status(400).json({ error: "Answer is too long." });
  }

  const db = getDB();
  const team = db.prepare("SELECT * FROM teams WHERE id = ?").get(req.team.teamId);
  if (!team) return res.status(404).json({ error: "Team not found." });
  if (team.is_finished) return res.json({ finished: true, correct: false });

  // Ensure timer has started
  if (!team.started_at) {
    db.prepare("UPDATE teams SET started_at = datetime('now') WHERE id = ?").run(team.id);
  }

  const questionNumber = team.current_question;
  const isCorrect = validateAnswer(questionNumber, answer);

  // Log every attempt (including wrong ones) for admin visibility
  db.prepare(
    "INSERT INTO attempts (team_id, question_number, attempted_answer, is_correct) VALUES (?, ?, ?, ?)"
  ).run(team.id, questionNumber, answer.trim(), isCorrect ? 1 : 0);

  if (!isCorrect) {
    return res.json({ correct: false, message: "Incorrect answer. Keep thinking! 🧭" });
  }

  // ── Correct answer: calculate time taken ──────────────────
  let startTime;
  if (questionNumber === 1) {
    const t = db.prepare("SELECT started_at FROM teams WHERE id = ?").get(team.id);
    startTime = t.started_at ? new Date(t.started_at + "Z") : new Date();
  } else {
    const prev = db.prepare(
      "SELECT solved_at FROM submissions WHERE team_id = ? AND question_number = ?"
    ).get(team.id, questionNumber - 1);
    startTime = prev ? new Date(prev.solved_at + "Z") : new Date();
  }

  const timeTakenSeconds = Math.max(0, Math.floor((Date.now() - startTime.getTime()) / 1000));

  // Record the submission (IGNORE if somehow duplicate)
  db.prepare(
    "INSERT OR IGNORE INTO submissions (team_id, question_number, time_taken_seconds) VALUES (?, ?, ?)"
  ).run(team.id, questionNumber, timeTakenSeconds);

  const isLastQuestion = questionNumber === TOTAL_QUESTIONS;

  if (isLastQuestion) {
    db.prepare(
      "UPDATE teams SET is_finished = 1, finish_time = datetime('now'), current_question = ? WHERE id = ?"
    ).run(TOTAL_QUESTIONS, team.id);

    return res.json({
      correct: true,
      finished: true,
      message: "🎉 Congratulations! You have completed the Treasure Hunt!",
      timeTakenSeconds,
    });
  }

  // Advance to next question
  const nextQuestion = questionNumber + 1;
  db.prepare("UPDATE teams SET current_question = ? WHERE id = ?").run(nextQuestion, team.id);

  const nextQ = getQuestionForClient(nextQuestion);
  return res.json({
    correct: true,
    finished: false,
    message: `✅ Correct! Moving to question ${nextQuestion}...`,
    nextQuestion: nextQ,
    currentQuestion: nextQuestion,
    timeTakenSeconds,
    total: TOTAL_QUESTIONS,
  });
});

module.exports = router;
