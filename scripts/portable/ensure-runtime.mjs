import fs from "fs";
import path from "path";

const root = process.env.PORTABLE_ROOT || process.cwd();
const cliRoot = path.join(root, "runtime", "cli");
const logDir = path.join(root, "logs");
const logFile = path.join(logDir, "runtime-check.log");

fs.mkdirSync(cliRoot, { recursive: true });
fs.mkdirSync(logDir, { recursive: true });

function log(message) {
  const line = "[" + new Date().toISOString() + "] " + message;
  console.log(line);
  fs.appendFileSync(logFile, line + "\n", "utf8");
}

const packageJsonPath = path.join(cliRoot, "package.json");

if (!fs.existsSync(packageJsonPath)) {
  const packageJson = {
    name: "mamabot-portable-cli-runtime",
    version: "0.1.0",
    private: true,
    dependencies: {}
  };

  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2), "utf8");
  log("Created runtime/cli/package.json");
} else {
  log("runtime/cli/package.json already exists");
}

log("Portable CLI runtime prepared");