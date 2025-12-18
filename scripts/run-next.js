#!/usr/bin/env node

/**
 * Small helper to run Next.js with controlled env and memory limits.
 * Forces TURBOPACK=0 to avoid Turbopack panics/OOMs and bumps the max heap.
 */
const { spawn } = require("node:child_process");
const path = require("node:path");

const args = process.argv.slice(2);
const command = args[0] || "dev";
const extraArgs = args.slice(1);

// Prefer webpack by disabling Turbopack explicitly.
process.env.TURBOPACK = process.env.TURBOPACK ?? "0";

const nextBin = require.resolve("next/dist/bin/next");
const memory = command === "build" ? "8192" : "4096";

const child = spawn(
  process.execPath,
  [`--max-old-space-size=${memory}`, nextBin, command, ...extraArgs],
  {
    cwd: path.join(__dirname, ".."),
    stdio: "inherit",
    env: process.env,
  },
);

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
  } else {
    process.exit(code ?? 0);
  }
});
