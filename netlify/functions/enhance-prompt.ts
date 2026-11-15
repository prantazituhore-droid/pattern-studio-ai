import { enhancePatternPrompt, formatGeminiError } from '../../server/gemini';
import { handlePreflight, jsonResponse, readJsonBody } from '../../server/netlifyHttp';

export default async function handler(req: Request): Promise<Response> {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const body = await readJsonBody<{
      prompt?: string;
      category?: string;
      style?: string;
      mainColor?: string;
      secondaryColor?: string;
      backgroundColor?: string;
    }>(req);

    const enhanced = await enhancePatternPrompt({
      prompt: String(body.prompt ?? ''),
      category: String(body.category ?? 'Textile and Fabric'),
      style: String(body.style ?? 'Royal Mughal & Silk Brocade'),
      mainColor: String(body.mainColor ?? '#7C3AED'),
      secondaryColor: String(body.secondaryColor ?? '#D4AF37'),
      backgroundColor: String(body.backgroundColor ?? '#0F172A'),
    });

    return jsonResponse({ enhancedPrompt: enhanced, model: 'gemini-4-hydrogen' });
  } catch (err) {
    const formatted = formatGeminiError(err);
    return jsonResponse({ error: formatted.message }, formatted.status);
  }
}
