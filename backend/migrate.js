require("dotenv").config();
const { initDB, pool } = require("./db");

async function run() {
  console.log("Connecting and migrating database...");
  await initDB();
  await pool.end();
  console.log("Migration complete!");
}

run().catch(err => {
  console.error("Migration failed:", err);
  process.exit(1);
});
