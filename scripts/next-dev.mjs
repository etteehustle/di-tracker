import { rmSync } from "node:fs";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const nextBin = require.resolve("next/dist/bin/next");
const major = Number(process.versions.node.split(".")[0]);
const nodeArgs = [];
const env = {
  ...process.env,
  NEXT_DIST_DIR: process.env.NEXT_DIST_DIR || ".next-dev"
};

if (major >= 22) {
  nodeArgs.push("--no-experimental-webstorage");
}

if (env.NEXT_DIST_DIR === ".next-dev") {
  rmSync(env.NEXT_DIST_DIR, { recursive: true, force: true });
}

const child = spawn(process.execPath, [...nodeArgs, nextBin, "dev", ...process.argv.slice(2)], {
  env,
  stdio: "inherit",
  shell: false
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
