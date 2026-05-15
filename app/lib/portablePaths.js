import path from "path";

export function getPortableRoot() {
return process.env.PORTABLE_ROOT || process.cwd();
}

export function getRuntimeRoot() {
return path.join(getPortableRoot(), "runtime");
}

export function getCliRoot() {
return path.join(getPortableRoot(), "runtime", "cli");
}

export function getCliBinPath() {
return path.join(getCliRoot(), "node_modules", ".bin");
}

export function getConfigRoot() {
return path.join(getPortableRoot(), "config");
}

export function getSecretsRoot() {
return path.join(getPortableRoot(), "secrets");
}

export function getMemoryRoot() {
return path.join(getPortableRoot(), "memory");
}

export function getSkillsRoot() {
return path.join(getPortableRoot(), "skills");
}

export function getLogsRoot() {
return path.join(getPortableRoot(), "logs");
}

export function getBackupsRoot() {
return path.join(getPortableRoot(), "backups");
}

export function getWorkspacesRoot() {
return path.join(getPortableRoot(), "workspaces");
}