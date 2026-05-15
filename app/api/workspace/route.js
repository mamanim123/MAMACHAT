export const runtime = "nodejs";

import { NextResponse } from "next/server";
import {
readWorkspaceConfig,
writeWorkspaceConfig,
ensureHermesWorkspace,
addRecentWorkspace
} from "../../lib/workspaceManager.js";

export async function GET() {
const config = readWorkspaceConfig();
return NextResponse.json({ ok: true, config });
}

export async function POST(request) {
const body = await request.json();
const workspacePath = body.workspacePath;

if (!workspacePath) {
return NextResponse.json(
{ ok: false, error: "workspacePath is required" },
{ status: 400 }
);
}

const hermesWorkspacePath = ensureHermesWorkspace(workspacePath);

const config = {
currentWorkspace: workspacePath,
lastOpenedAt: new Date().toISOString(),
mode: "portable",
createHermesWorkspace: true,
workspaceFolderName: ".hermes-workspace"
};

writeWorkspaceConfig(config);
addRecentWorkspace(workspacePath);

return NextResponse.json({
ok: true,
config,
hermesWorkspacePath
});
}