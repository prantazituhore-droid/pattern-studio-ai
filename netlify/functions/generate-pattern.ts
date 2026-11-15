import {
  formatGeminiError,
  generateRasterPattern,
  generateVectorPatterns,
} from '../../server/gemini';
import { handlePreflight, jsonResponse, readJsonBody } from '../../server/netlifyHttp';

export default async function handler(req: Request): Promise<Response> {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const body = await readJsonBody<Record<string, unknown>>(req);
    const prompt = body.prompt;

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return jsonResponse({ error: 'Please provide a design description prompt.' }, 400);
    }

    if (body.engine === 'raster-image') {
      const result = await generateRasterPattern({
        prompt,
        category: String(body.category ?? 'Textile and Fabric'),
        style: String(body.style ?? 'Royal Mughal & Silk Brocade'),
        mainColor: String(body.mainColor ?? '#7C3AED'),
        secondaryColor: String(body.secondaryColor ?? '#D4AF37'),
        backgroundColor: String(body.backgroundColor ?? '#0F172A'),
        aspectRatio: String(body.aspectRatio ?? '1:1'),
        referenceImageDataUrl:
          typeof body.referenceImageDataUrl === 'string' ? body.referenceImageDataUrl : undefined,
      });
      return jsonResponse({ patterns: [result], model: 'gemini-3.1-flash-lite-image' });
    }

    const patterns = await generateVectorPatterns({
      prompt,
      category: String(body.category ?? 'Textile and Fabric'),
      style: String(body.style ?? 'Royal Mughal & Silk Brocade'),
      mainColor: String(body.mainColor ?? '#7C3AED'),
      secondaryColor: String(body.secondaryColor ?? '#D4AF37'),
      backgroundColor: String(body.backgroundColor ?? '#0F172A'),
      density: String(body.density ?? 'balanced'),
      scale: String(body.scale ?? 'medium'),
      spacing: String(body.spacing ?? 'comfortable'),
      symmetry: String(body.symmetry ?? '4-way'),
      texture: String(body.texture ?? 'smooth-vector'),
      complexity: String(body.complexity ?? 'rich'),
      detailLevel: String(body.detailLevel ?? 'detailed'),
      orientation: String(body.orientation ?? 'upright'),
      repetitionMethod: String(body.repetitionMethod ?? 'grid'),
      width: Number(body.width) || 800,
      height: Number(body.height) || 800,
      variations: Number(body.variations) || 1,
      referenceImageDataUrl:
        typeof body.referenceImageDataUrl === 'string' ? body.referenceImageDataUrl : undefined,
    });

    return jsonResponse({ patterns, model: 'gemini-4-hydrogen' });
  } catch (err) {
    const formatted = formatGeminiError(err);
    return jsonResponse({ error: formatted.message }, formatted.status);
  }
}
