import { listWorkflowTemplates } from "../../../lib/workflowTemplates.js";

export async function GET() {
  try {
    return Response.json({ ok: true, items: listWorkflowTemplates() });
  } catch (error) {
    return Response.json({ ok: false, error: error?.message || String(error) }, { status: 500 });
  }
}
