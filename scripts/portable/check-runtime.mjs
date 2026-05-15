import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const root = process.env.PORTABLE_ROOT || process.cwd();
const cliRoot = path.join(root, "runtime", "cli");
const logDir = path.join(root, "logs");
const logFile = path.join(logDir, "runtime-check.log");

fs.mkdirSync(logDir, { recursive: true });

function log(message) {
  const line = "[" + new Date().toISOString() + "] " + message;
  console.log(line);
  fs.appendFileSync(logFile, line + "\n", "utf8");
}

function checkCommand(command) {
  try {
    const result = execSync(command, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    }).trim();

    return { ok: true, result };
  } catch (error) {
    return { ok: false, result: error.message };
  }
}

log("Runtime check started");
log("PORTABLE_ROOT=" + root);
log("CLI_ROOT=" + cliRoot);

const nodeCheck = checkCommand("node -v");
log("Node: " + (nodeCheck.ok ? nodeCheck.result : "NOT FOUND"));

const npmCheck = checkCommand("npm -v");
log("npm: " + (npmCheck.ok ? npmCheck.result : "NOT FOUND"));

const gitCheck = checkCommand("git --version");
log("Git: " + (gitCheck.ok ? gitCheck.result : "NOT FOUND"));

const cliPackageJson = path.join(cliRoot, "package.json");
log("runtime/cli package.json: " + (fs.existsSync(cliPackageJson) ? "FOUND" : "MISSING"));

log("Runtime check finished");