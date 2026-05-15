export const runtime = "nodejs";

import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { getCliRoot, getCliBinPath } from "../../lib/portablePaths.js";

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

export async function GET() {
const cliRoot = getCliRoot();
const cliBin = getCliBinPath();

const status = {
node: checkCommand("node -v"),
npm: checkCommand("npm -v"),
git: checkCommand("git --version"),
cliRoot,
cliBin,
cliPackageJson: fs.existsSync(path.join(cliRoot, "package.json")),
openclaude: fs.existsSync(path.join(cliRoot, "node_modules", "@gitlawb", "openclaude")),
codex: fs.existsSync(path.join(cliRoot, "node_modules", "@openai", "codex")),
claudeCode: fs.existsSync(path.join(cliRoot, "node_modules", "@anthropic-ai", "claude-code"))
};

return NextResponse.json({ ok: true, status });
}