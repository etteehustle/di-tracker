import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const nextBin = require.resolve("next/dist/bin/next");
const major = Number(process.versions.node.split(".")[0]);
const nodeArgs = [];

if (major >= 22) {
  nodeArgs.push("--no-experimental-webstorage");
}

const child = spawn(process.execPath, [...nodeArgs, nextBin, "dev", ...process.argv.slice(2)], {
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
