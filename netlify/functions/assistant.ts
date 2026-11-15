import { formatGeminiError, runDesignAssistant } from '../../server/gemini';
import { handlePreflight, jsonResponse, readJsonBody } from '../../server/netlifyHttp';

export default async function handler(req: Request): Promise<Response> {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const body = await readJsonBody<{
      message?: string;
      canvasSummary?: {
        width: number;
        height: number;
        backgroundColor: string;
        objectCount: number;
        objects: Array<{ name: string; type: string; fill?: string; stroke?: string }>;
        palette: string[];
      };
      canvasPreviewDataUrl?: string;
    }>(req);

    if (!body.message || typeof body.message !== 'string') {
      return jsonResponse({ error: 'Instruction message is required.' }, 400);
    }

    const result = await runDesignAssistant({
      message: body.message,
      canvasSummary: body.canvasSummary ?? {
        width: 800,
        height: 800,
        backgroundColor: '#FFFFFF',
        objectCount: 0,
        objects: [],
        palette: [],
      },
      canvasPreviewDataUrl: body.canvasPreviewDataUrl,
    });

    return jsonResponse(result);
  } catch (err) {
    const formatted = formatGeminiError(err);
    return jsonResponse({ error: formatted.message }, formatted.status);
  }
}
