import fs from "fs";
import path from "path";
import { getConfigRoot, getWorkspacesRoot } from "./portablePaths.js";

const WORKSPACE_FOLDER_NAME = ".hermes-workspace";

export function getWorkspaceConfigPath() {
return path.join(getConfigRoot(), "workspace.json");
}

export function readWorkspaceConfig() {
const configPath = getWorkspaceConfigPath();

if (!fs.existsSync(configPath)) {
return {
currentWorkspace: "",
lastOpenedAt: null,
mode: "portable",
createHermesWorkspace: true,
workspaceFolderName: WORKSPACE_FOLDER_NAME
};
}

return JSON.parse(fs.readFileSync(configPath, "utf8"));
}

export function writeWorkspaceConfig(config) {
fs.mkdirSync(getConfigRoot(), { recursive: true });
fs.writeFileSync(getWorkspaceConfigPath(), JSON.stringify(config, null, 2), "utf8");
}

export function getCurrentWorkspace() {
const config = readWorkspaceConfig();
return config.currentWorkspace || "";
}

export function ensureHermesWorkspace(workspacePath) {
if (!workspacePath) {
throw new Error("workspacePath is required");
}

const hermesDir = path.join(workspacePath, WORKSPACE_FOLDER_NAME);

fs.mkdirSync(hermesDir, { recursive: true });
fs.mkdirSync(path.join(hermesDir, "backups"), { recursive: true });
fs.mkdirSync(path.join(hermesDir, ".claude"), { recursive: true });
fs.mkdirSync(path.join(hermesDir, ".codex"), { recursive: true });

const files = {
"workspace.json": JSON.stringify({
name: path.basename(workspacePath),
path: workspacePath,
createdAt: new Date().toISOString()
}, null, 2),
"instructions.md": "# Workspace Instructions\n\n이 프로젝트에서 에이전트가 따라야 할 규칙을 기록합니다.\n",
"memory.md": "# Workspace Memory\n\n이 프로젝트 전용 기억입니다.\n",
"ignored.json": JSON.stringify({
ignore: ["node_modules", ".next", "dist", "build", ".git"]
}, null, 2)
};

for (const [filename, content] of Object.entries(files)) {
const filePath = path.join(hermesDir, filename);
if (!fs.existsSync(filePath)) {
fs.writeFileSync(filePath, content, "utf8");
}
}

return hermesDir;
}

export function addRecentWorkspace(workspacePath) {
fs.mkdirSync(getWorkspacesRoot(), { recursive: true });

const recentPath = path.join(getWorkspacesRoot(), "recent.json");

let data = { recent: [] };

if (fs.existsSync(recentPath)) {
data = JSON.parse(fs.readFileSync(recentPath, "utf8"));
}

data.recent = [
workspacePath,
...data.recent.filter((item) => item !== workspacePath)
].slice(0, 20);

fs.writeFileSync(recentPath, JSON.stringify(data, null, 2), "utf8");
}