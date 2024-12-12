import { Database } from "bun:sqlite";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";

async function askQuestion(
  rl: readline.Interface,
  question: string,
): Promise<string> {
  return await rl.question(question);
}

async function resetDatabase() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log(
    "\x1b[31m%s\x1b[0m",
    "WARNING: This will delete all data in the database!",
  );
  console.log("This action will:");
  console.log("1. Drop all existing tables");
  console.log("2. Recreate tables from schema");
  console.log("3. Remove all existing data");

  const confirm1 = await askQuestion(
    rl,
    "Are you sure you want to continue? (yes/no): ",
  );
  if (confirm1.toLowerCase() !== "yes") {
    console.log("Database reset cancelled.");
    rl.close();
    return;
  }

  const confirm2 = await askQuestion(rl, 'Type "RESET" to confirm: ');
  if (confirm2 !== "RESET") {
    console.log("Database reset cancelled.");
    rl.close();
    return;
  }

  rl.close();

  // Open database connection
  const db = new Database("chat.db");

  try {
    // Read the schema file
    const schema = fs.readFileSync(
      path.join(process.cwd(), "src/db/schema.sql"),
      "utf-8",
    );

    console.log("Dropping existing tables...");
    db.run("DROP TABLE IF EXISTS messages");
    db.run("DROP TABLE IF EXISTS users");

    console.log("Recreating tables from schema...");
    db.run(schema);

    console.log("\x1b[32m%s\x1b[0m", "Database reset successfully!");
  } catch (error) {
    console.error("\x1b[31m%s\x1b[0m", "Error resetting database:", error);
    throw error;
  } finally {
    db.close();
  }
}

// Only run if this file is being executed directly
if (import.meta.main) {
  resetDatabase();
}
