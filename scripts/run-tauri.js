import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { buildEnvWithCargoPath, checkBuildPrereqs, getVcVarsPath, hasCommand } from "./check-build-prereqs.js";

const command = process.argv[2];
const allowedCommands = new Set(["build", "dev"]);

if (!allowedCommands.has(command)) {
  console.error("Usage: node scripts/run-tauri.js <build|dev>");
  process.exit(1);
}

const missing = checkBuildPrereqs();
if (missing.length > 0) {
  console.error("\nAnswerPace cannot build the Windows app yet. Missing prerequisite:\n");
  for (const item of missing) {
    console.error(`- ${item.label}: ${item.installHint}`);
  }
  console.error("\nAfter installing Rust, close and reopen PowerShell, then run:");
  console.error("  cargo --version");
  console.error("  npm run check:build-prereqs");
  console.error("  npm run tauri:build\n");
  process.exit(1);
}

const tauriBinary = getTauriBinary();
const env = buildEnvWithCargoPath();
const result = runTauri(tauriBinary, command, env);

process.exit(result.status ?? 1);

function getTauriBinary() {
  const extension = process.platform === "win32" ? ".cmd" : "";
  const localBinary = join(process.cwd(), "node_modules", ".bin", `tauri${extension}`);
  return existsSync(localBinary) ? localBinary : "tauri";
}

function runTauri(tauriBinary, command, env) {
  const vcVarsPath = getVcVarsPath();
  if (process.platform === "win32" && vcVarsPath && !hasCommand("link", env)) {
    const launcherPath = createWindowsBuildLauncher(vcVarsPath, tauriBinary);
    return spawnSync(launcherPath, [command], { env, shell: true, stdio: "inherit" });
  }

  return spawnSync(tauriBinary, [command], {
    env,
    shell: true,
    stdio: "inherit",
  });
}

function createWindowsBuildLauncher(vcVarsPath, tauriBinary) {
  const tempDir = join(process.cwd(), ".tmp");
  mkdirSync(tempDir, { recursive: true });

  const launcherPath = join(tempDir, "run-tauri.cmd");
  const contents = [
    "@echo off",
    `call "${vcVarsPath}"`,
    "if errorlevel 1 exit /b %errorlevel%",
    `"${tauriBinary}" %*`,
    "exit /b %errorlevel%",
    "",
  ].join("\r\n");

  writeFileSync(launcherPath, contents, "utf8");
  return launcherPath;
}
