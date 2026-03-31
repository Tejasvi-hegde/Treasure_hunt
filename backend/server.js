require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const authRoutes = require("./routes/auth");
const gameRoutes = require("./routes/game");
const adminRoutes = require("./routes/admin");
const { initDB } = require("./db");

// ── Validate critical env vars ────────────────────────────────
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error("❌  JWT_SECRET must be set and at least 32 characters long.");
  process.exit(1);
}
if (!process.env.ADMIN_KEY || process.env.ADMIN_KEY.length < 8) {
  console.error("❌  ADMIN_KEY must be set and at least 8 characters long.");
  process.exit(1);
}

const app = express();

// ── Security middleware ───────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));

app.use(cors({
  origin: process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(",").map((s) => s.trim())
    : "*",
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Admin-Key"],
  credentials: true,
}));

app.use(express.json({ limit: "20kb" }));

// Global rate limit: 300 requests per 15 min per IP
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests. Please slow down." },
  })
);

// Auth rate limit: 20 register/login attempts per 15 min per IP
app.use(
  "/api/auth",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { error: "Too many login attempts. Try again later." },
  })
);

// ── Routes ────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/game", gameRoutes);
app.use("/api/admin", adminRoutes);

// Health check
app.get("/health", (req, res) =>
  res.json({ status: "ok", time: new Date().toISOString() })
);

// 404 handler
app.use((req, res) => res.status(404).json({ error: "Not found." }));

// Global error handler
app.use((err, req, res, _next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error." });
});

// ── Start ─────────────────────────────────────────────────────
initDB();
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Treasure Hunt backend running on port ${PORT}`);
  console.log(`   FRONTEND_URL: ${process.env.FRONTEND_URL || "* (all origins)"}`);
});
