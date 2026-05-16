import { compressCommandOutput } from "../../../lib/commandOutputCompressor.js";

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const result = compressCommandOutput({
      command: body.command || "",
      stdout: body.stdout || body.output || "",
      stderr: body.stderr || ""
    });

    return Response.json({
      ok: true,
      ...result
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: error?.message || String(error)
      },
      { status: 500 }
    );
  }
}
