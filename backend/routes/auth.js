const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { getDB } = require("../db");

const router = express.Router();

function buildQuickStartTeamName(hostelName, candidates) {
  const hostelPart = hostelName.trim().replace(/\s+/g, " ");
  const candidatePart = candidates.map((name) => name.trim().replace(/\s+/g, " ")).join(", ");
  const base = `${hostelPart} | ${candidatePart}`;
  const suffix = crypto.randomBytes(2).toString("hex").toUpperCase();
  return `${base} [${suffix}]`.slice(0, 50);
}

// ── POST /api/auth/register ──────────────────────────────────
router.post("/register", async (req, res) => {
  const { teamName, password } = req.body;

  if (!teamName || !password) {
    return res.status(400).json({ error: "Team name and password are required." });
  }
  const name = teamName.trim();
  if (name.length < 2 || name.length > 50) {
    return res.status(400).json({ error: "Team name must be 2–50 characters." });
  }
  if (password.length < 4 || password.length > 100) {
    return res.status(400).json({ error: "Password must be 4–100 characters." });
  }

  // Optionally lock registration
  if (process.env.REGISTRATION_OPEN === "false") {
    return res.status(403).json({ error: "Registration is currently closed." });
  }

  try {
    const db = getDB();
    const hash = await bcrypt.hash(password, 12);

    try {
      const result = await db.query(
        "INSERT INTO teams (name, password_hash) VALUES ($1, $2) RETURNING id",
        [name, hash]
      );

      const token = jwt.sign(
        { teamId: result.rows[0].id, teamName: name },
        process.env.JWT_SECRET,
        { expiresIn: "24h" }
      );
      return res.status(201).json({ token, teamName: name });
    } catch (err) {
      if (err.message.includes("unique") || err.code === '23505') {
        return res.status(409).json({ error: "That team name is already taken." });
      }
      throw err;
    }
  } catch (err) {
    console.error("Register error:", err);
    return res.status(500).json({ error: "Server error." });
  }
});

// ── POST /api/auth/login ─────────────────────────────────────
router.post("/login", async (req, res) => {
  const { teamName, password } = req.body;

  if (!teamName || !password) {
    return res.status(400).json({ error: "Team name and password are required." });
  }

  try {
    const db = getDB();
    const result = await db.query(
      "SELECT * FROM teams WHERE LOWER(name) = LOWER($1)",
      [teamName.trim()]
    );
    const team = result.rows[0];

    // Constant-time comparison to avoid timing attacks
    const dummyHash = "$2a$12$invalidhashfortimingprotection000000000000000000000";
    const valid = team
      ? await bcrypt.compare(password, team.password_hash)
      : await bcrypt.compare(password, dummyHash).then(() => false);

    if (!team || !valid) {
      return res.status(401).json({ error: "Invalid team name or password." });
    }

    const token = jwt.sign(
      { teamId: team.id, teamName: team.name },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    return res.json({
      token,
      teamName: team.name,
      currentQuestion: team.current_question,
      isFinished: team.is_finished === 1,
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ error: "Server error." });
  }
});

// ── POST /api/auth/quick-start ──────────────────────────────
router.post("/quick-start", async (req, res) => {
  const { hostelName, candidates } = req.body;

  if (!hostelName || typeof hostelName !== "string") {
    return res.status(400).json({ error: "Hostel name is required." });
  }

  if (!Array.isArray(candidates)) {
    return res.status(400).json({ error: "Candidates must be an array." });
  }

  const cleanedCandidates = candidates
    .map((name) => (typeof name === "string" ? name.trim() : ""))
    .filter(Boolean);

  if (cleanedCandidates.length !== 3) {
    return res.status(400).json({ error: "Please provide all 3 candidate names." });
  }

  const cleanHostel = hostelName.trim();
  if (cleanHostel.length < 2 || cleanHostel.length > 30) {
    return res.status(400).json({ error: "Hostel name must be 2–30 characters." });
  }

  if (cleanedCandidates.some((name) => name.length < 2 || name.length > 25)) {
    return res.status(400).json({ error: "Each candidate name must be 2–25 characters." });
  }

  try {
    const db = getDB();
    const generatedPassword = crypto.randomBytes(12).toString("base64url");
    const hash = await bcrypt.hash(generatedPassword, 12);

    let inserted;
    for (let attempt = 0; attempt < 5; attempt++) {
      const teamName = buildQuickStartTeamName(cleanHostel, cleanedCandidates);
      try {
        inserted = await db.query(
          "INSERT INTO teams (name, password_hash) VALUES ($1, $2) RETURNING id",
          [teamName, hash]
        );

        const token = jwt.sign(
          { teamId: inserted.rows[0].id, teamName },
          process.env.JWT_SECRET,
          { expiresIn: "24h" }
        );

        return res.status(201).json({
          token,
          teamName,
        });
      } catch (err) {
        if (!err.message.includes("unique") && err.code !== '23505') {
          throw err;
        }
      }
    }

    return res.status(500).json({ error: "Could not create team. Please try again." });
  } catch (err) {
    console.error("Quick start error:", err);
    return res.status(500).json({ error: "Server error." });
  }
});

module.exports = router;
