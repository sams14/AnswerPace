import { existsSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const requiredCommands = [
  {
    command: "cargo",
    label: "Rust Cargo",
    installHint: "Install Rust from https://rustup.rs/ or run: winget install --id Rustlang.Rustup -e",
  },
];

const linkerPrereq = {
  label: "Microsoft C++ linker",
  installHint:
    "Install Visual Studio Build Tools with the C++ workload: winget install --id Microsoft.VisualStudio.2022.BuildTools -e",
};

export function getCargoBinPath() {
  const home = process.env.USERPROFILE || process.env.HOME;
  if (!home) {
    return null;
  }

  const cargoPath = join(home, ".cargo", "bin");
  return existsSync(join(cargoPath, process.platform === "win32" ? "cargo.exe" : "cargo")) ? cargoPath : null;
}

export function buildEnvWithCargoPath() {
  const cargoBinPath = getCargoBinPath();
  const currentPath = process.env.PATH ?? process.env.Path ?? "";

  if (!cargoBinPath || currentPath.includes(cargoBinPath)) {
    return { ...process.env };
  }

  return {
    ...process.env,
    PATH: `${cargoBinPath}${process.platform === "win32" ? ";" : ":"}${currentPath}`,
  };
}

export function checkBuildPrereqs() {
  const env = buildEnvWithCargoPath();
  const missing = requiredCommands.filter(({ command }) => {
    const result = spawnSync(command, ["--version"], { encoding: "utf8", shell: true, env });
    return result.error || result.status !== 0;
  });

  if (!hasCommand("link", env) && !getVcVarsPath()) {
    missing.push(linkerPrereq);
  }

  return missing;
}

export function getVcVarsPath() {
  if (process.platform !== "win32") {
    return null;
  }

  const vswherePath = join(
    process.env["ProgramFiles(x86)"] ?? "C:\\Program Files (x86)",
    "Microsoft Visual Studio",
    "Installer",
    "vswhere.exe",
  );

  if (existsSync(vswherePath)) {
    const result = spawnSync(
      vswherePath,
      ["-latest", "-products", "*", "-requires", "Microsoft.VisualStudio.Component.VC.Tools.x86.x64", "-property", "installationPath"],
      { encoding: "utf8" },
    );

    const installPath = result.stdout.trim();
    if (installPath) {
      const vcVarsPath = join(installPath, "VC", "Auxiliary", "Build", "vcvars64.bat");
      if (existsSync(vcVarsPath)) {
        return vcVarsPath;
      }
    }
  }

  const fallbackPaths = [
    "C:\\Program Files\\Microsoft Visual Studio\\2022\\BuildTools\\VC\\Auxiliary\\Build\\vcvars64.bat",
    "C:\\Program Files (x86)\\Microsoft Visual Studio\\2022\\BuildTools\\VC\\Auxiliary\\Build\\vcvars64.bat",
  ];

  return fallbackPaths.find((path) => existsSync(path)) ?? null;
}

export function hasCommand(command, env = process.env) {
  const result = spawnSync(command, ["/?"], { encoding: "utf8", shell: true, env });
  return !result.error && result.status === 0;
}

const missing = checkBuildPrereqs();

if (process.argv[1]?.endsWith("check-build-prereqs.js") && missing.length > 0) {
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
