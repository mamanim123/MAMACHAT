import { buildWorkflowPrompt, getWorkflowTemplate } from "../../../../lib/workflowTemplates.js";

async function getTemplateId(context) {
  const params = await context.params;
  return params.templateId || "";
}

export async function GET(request, context) {
  try {
    const templateId = await getTemplateId(context);
    const template = getWorkflowTemplate(templateId);

    if (!template) {
      return Response.json({ ok: false, error: "workflow template not found" }, { status: 404 });
    }

    return Response.json({ ok: true, template });
  } catch (error) {
    return Response.json({ ok: false, error: error?.message || String(error) }, { status: 500 });
  }
}

export async function POST(request, context) {
  try {
    const templateId = await getTemplateId(context);
    const body = await request.json().catch(() => ({}));
    return Response.json({ ok: true, prompt: buildWorkflowPrompt(templateId, body) });
  } catch (error) {
    return Response.json({ ok: false, error: error?.message || String(error) }, { status: 400 });
  }
}
