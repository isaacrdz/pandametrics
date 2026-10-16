// Prints the scrypt hash of a password typed into a hidden prompt, in the "salt:hash" (hex) format of
// src/lib/users/password.ts (server-only, so its few lines are repeated here).
//
//   npx tsx scripts/hash-password.ts           → prints a new hash
//   npx tsx scripts/hash-password.ts --verify  → asks for a hash and a password, prints whether they match
//
// The password is never an argument (it would stay in the shell history) and never echoed.
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { createInterface } from "node:readline";
import { Writable } from "node:stream";

const KEY_LENGTH = 64;

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, KEY_LENGTH).toString("hex")}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const expected = Buffer.from(hash, "hex");
  const actual = scryptSync(password, salt, expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

// One readline for every prompt. Lines go through a queue, so input that arrives before a prompt
// (pasted or piped) is not lost. While a hidden prompt waits, typed characters are not echoed
let muted = false;
const output = new Writable({
  write(chunk, encoding, callback) {
    if (!muted) process.stdout.write(chunk, encoding);
    callback();
  },
});
const rl = createInterface({ input: process.stdin, output, terminal: process.stdin.isTTY === true });
const lines: string[] = [];
const waiting: ((line: string) => void)[] = [];
rl.on("line", (line) => {
  const next = waiting.shift();
  if (next) next(line);
  else lines.push(line);
});
rl.on("close", () => waiting.splice(0).forEach((resolve) => resolve("")));

function ask(question: string, hidden: boolean): Promise<string> {
  muted = false;
  process.stdout.write(question);
  muted = hidden;
  return new Promise<string>((resolve) => {
    const queued = lines.shift();
    if (queued !== undefined) resolve(queued);
    else waiting.push(resolve);
  }).then((answer) => {
    muted = false;
    if (hidden) process.stdout.write("\n");
    return answer;
  });
}

async function main() {
  if (process.argv.includes("--verify")) {
    const stored = (await ask("Hash: ", false)).trim();
    const password = await ask("Password (hidden): ", true);
    console.log(verifyPassword(password, stored) ? "Match" : "No match");
    return;
  }

  const password = await ask("Password (hidden): ", true);
  const confirmation = await ask("Repeat it (hidden): ", true);
  if (!password || password !== confirmation) {
    console.error("The passwords are empty or do not match");
    process.exitCode = 1;
    return;
  }
  console.log(hashPassword(password));
}

void main().finally(() => rl.close());
