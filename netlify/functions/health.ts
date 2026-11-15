import { handlePreflight, jsonResponse } from '../../server/netlifyHttp';

export default async function handler(req: Request): Promise<Response> {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;

  if (req.method !== 'GET') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  return jsonResponse({
    ok: true,
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
    vectorModel: 'gemini-4-hydrogen',
    rasterModel: 'gemini-3.1-flash-lite-image',
    rasterRequiresPaidKey: true,
    runtime: 'netlify-functions',
  });
}
