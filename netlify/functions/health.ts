import { hasConfiguredApiKey } from '../../server/gemini';
import { handlePreflight, jsonResponse } from '../../server/netlifyHttp';

export default async function handler(req: Request): Promise<Response> {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;

  if (req.method !== 'GET') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  return jsonResponse({
    ok: true,
    hasApiKey: hasConfiguredApiKey(),
    vectorModel: process.env.GEMINI_TEXT_MODEL?.trim() || 'gemini-4-hydrogen',
    rasterModel: 'gemini-3.1-flash-lite-image',
    rasterRequiresPaidKey: true,
    runtime: 'netlify-functions',
  });
}
