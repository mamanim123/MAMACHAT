import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const root = process.env.PORTABLE_ROOT || process.cwd();
const cliRoot = path.join(root, "runtime", "cli");

fs.mkdirSync(cliRoot, { recursive: true });

const packageJsonPath = path.join(cliRoot, "package.json");

if (!fs.existsSync(packageJsonPath)) {
  fs.writeFileSync(
    packageJsonPath,
    JSON.stringify({
      name: "mamabot-portable-cli-runtime",
      version: "0.1.0",
      private: true,
      dependencies: {}
    }, null, 2),
    "utf8"
  );
}

const packages = [
  "@gitlawb/openclaude",
  "@openai/codex",
  "@anthropic-ai/claude-code"
];

console.log("Installing portable CLI packages...");
console.log(packages.join("\n"));

execSync("npm install " + packages.join(" "), {
  cwd: cliRoot,
  stdio: "inherit",
  env: process.env
});

console.log("Portable CLI install complete.");