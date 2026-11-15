import { GoogleGenAI, Type, ThinkingLevel, GenerateContentParameters } from '@google/genai';

const PRIMARY_TEXT_MODEL = process.env.GEMINI_TEXT_MODEL?.trim() || 'gemini-4-hydrogen';
const PUBLIC_FALLBACK_MODEL = 'gemini-2.5-flash';

const SUPPORTED_RASTER_MIMES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
]);

export function getSanitizedApiKey(): string {
  const raw = process.env.GEMINI_API_KEY ?? '';
  return raw.trim().replace(/^['"]+|['"]+$/g, '');
}

export function hasConfiguredApiKey(): boolean {
  return getSanitizedApiKey().length > 0;
}

function createClient() {
  const apiKey = getSanitizedApiKey();
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY is not configured on the server. Add GEMINI_API_KEY in Netlify Site configuration > Environment variables (Functions scope) or AI Studio Secrets, then redeploy.'
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function sanitizeSvg(rawSvg: string, width: number, height: number): string {
  let svg = rawSvg.trim();
  const startIdx = svg.indexOf('<svg');
  const endIdx = svg.lastIndexOf('</svg>');
  if (startIdx === -1 || endIdx === -1) {
    throw new Error('Model returned invalid SVG markup.');
  }
  svg = svg.slice(startIdx, endIdx + 6);
  svg = svg
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/\son\w+="[^"]*"/gi, '')
    .replace(/\son\w+='[^']*'/gi, '')
    .replace(/javascript:/gi, '');

  if (!svg.includes('xmlns=')) {
    svg = svg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
  }
  if (!svg.includes('viewBox=')) {
    svg = svg.replace('<svg', `<svg viewBox="0 0 ${width} ${height}"`);
  }
  return svg;
}

function parseDataUrl(dataUrl: string): { mimeType: string; data: string } | null {
  if (!dataUrl || typeof dataUrl !== 'string') return null;
  const match = dataUrl.match(/^data:([^;]+);base64,([\s\S]+)$/);
  if (!match) return null;
  let mimeType = match[1].toLowerCase().trim();
  if (mimeType === 'image/jpg') mimeType = 'image/jpeg';
  // Gemini multimodal inlineData only supports raster image MIME types, never image/svg+xml
  if (!SUPPORTED_RASTER_MIMES.has(mimeType)) {
    return null;
  }
  const data = match[2].replace(/\s+/g, '');
  if (!data) return null;
  return { mimeType, data };
}

function extractReadableErrorMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  // @google/genai often wraps JSON error payloads inside Error.message
  const jsonStart = raw.indexOf('{');
  if (jsonStart !== -1) {
    try {
      const parsed = JSON.parse(raw.slice(jsonStart)) as {
        error?: { message?: string; status?: string };
      };
      if (parsed?.error?.message) {
        return parsed.error.message;
      }
    } catch {
      // Fall through to raw string
    }
  }
  return raw;
}

function shouldFallbackToPublicModel(err: unknown): boolean {
  const msg = extractReadableErrorMessage(err).toLowerCase();
  // Never fallback on authentication/key/quota errors
  if (
    msg.includes('api_key_invalid') ||
    msg.includes('api key not valid') ||
    msg.includes('permission_denied') ||
    msg.includes('resource_exhausted')
  ) {
    return false;
  }
  return (
    msg.includes('not found') ||
    msg.includes('is not supported') ||
    msg.includes('not_found') ||
    msg.includes('thinkinglevel') ||
    msg.includes('thinking_level') ||
    msg.includes('thinkingconfig') ||
    msg.includes('invalid value at \'model\'') ||
    msg.includes('models/gemini-4')
  );
}

async function generateContentWithFallback(
  ai: GoogleGenAI,
  request: Omit<GenerateContentParameters, 'model'>,
  useLowThinking = true
) {
  const supportsThinkingLevel =
    PRIMARY_TEXT_MODEL.startsWith('gemini-3') || PRIMARY_TEXT_MODEL.startsWith('gemini-4');

  const primaryConfig =
    useLowThinking && supportsThinkingLevel
      ? {
          ...request.config,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        }
      : request.config;

  const attemptCall = async (modelName: string, configObj: GenerateContentParameters['config']) => {
    try {
      return await ai.models.generateContent({
        model: modelName,
        contents: request.contents,
        config: configObj,
      });
    } catch (err) {
      const msg = extractReadableErrorMessage(err).toLowerCase();
      if (msg.includes('503') || msg.includes('unavailable') || msg.includes('high demand')) {
        await new Promise((r) => setTimeout(r, 800));
        return await ai.models.generateContent({
          model: modelName,
          contents: request.contents,
          config: configObj,
        });
      }
      throw err;
    }
  };

  try {
    const response = await attemptCall(PRIMARY_TEXT_MODEL, primaryConfig);
    return { response, model: PRIMARY_TEXT_MODEL };
  } catch (primaryErr) {
    if (PRIMARY_TEXT_MODEL !== PUBLIC_FALLBACK_MODEL && shouldFallbackToPublicModel(primaryErr)) {
      const response = await attemptCall(PUBLIC_FALLBACK_MODEL, request.config);
      return { response, model: PUBLIC_FALLBACK_MODEL };
    }
    throw primaryErr;
  }
}

export function formatGeminiError(err: unknown): { status: number; message: string } {
  const raw = err instanceof Error ? err.message : String(err);
  const readable = extractReadableErrorMessage(err);
  const lower = `${raw} ${readable}`.toLowerCase();

  if (lower.includes('gemini_api_key is not configured')) {
    return { status: 500, message: readable };
  }
  if (lower.includes('api_key_invalid') || lower.includes('api key not valid')) {
    return {
      status: 401,
      message:
        'Gemini API rejected GEMINI_API_KEY as invalid. Verify the key in Netlify Site configuration > Environment variables (ensure no surrounding quotes, spaces, or HTTP referrer restrictions).',
    };
  }
  if (lower.includes('permission_denied') || lower.includes('403')) {
    return {
      status: 403,
      message: `Gemini API permission denied: ${readable}`,
    };
  }
  if (lower.includes('resource_exhausted') || lower.includes('429')) {
    return {
      status: 429,
      message: `Gemini API quota or billing limit reached: ${readable}`,
    };
  }
  if (lower.includes('not_found') || lower.includes('404')) {
    return {
      status: 404,
      message: `Requested Gemini model unavailable: ${readable}`,
    };
  }
  if (lower.includes('invalid_argument') || lower.includes('400')) {
    return {
      status: 400,
      message: `Gemini API request rejected: ${readable}`,
    };
  }
  return { status: 500, message: readable || 'Unexpected AI service error.' };
}

export async function enhancePatternPrompt(input: {
  prompt: string;
  category: string;
  style: string;
  mainColor: string;
  secondaryColor: string;
  backgroundColor: string;
}) {
  const ai = createClient();
  const { response, model } = await generateContentWithFallback(ai, {
    contents: `Transform the user's brief pattern idea into a rich, production-grade surface & textile pattern design prompt (2-3 crisp sentences, no markdown, no bullets).
User brief: "${input.prompt || 'Luxury botanical motif'}"
Category: ${input.category}
Style: ${input.style}
Colors: primary ${input.mainColor}, secondary ${input.secondaryColor}, background ${input.backgroundColor}.
Specify motif anatomy, symmetry, line quality, spacing, and tactile fabric/surface inspiration.`,
  });

  const enhanced = response.text?.trim();
  if (!enhanced) {
    throw new Error('Could not generate an enhanced prompt.');
  }
  return { enhancedPrompt: enhanced, model };
}

export async function generateVectorPatterns(params: {
  prompt: string;
  category: string;
  style: string;
  mainColor: string;
  secondaryColor: string;
  backgroundColor: string;
  density: string;
  scale: string;
  spacing: string;
  symmetry: string;
  texture: string;
  complexity: string;
  detailLevel: string;
  orientation: string;
  repetitionMethod: string;
  width: number;
  height: number;
  variations: number;
  referenceImageDataUrl?: string;
}) {
  const ai = createClient();
  const count = Math.min(Math.max(params.variations || 1, 1), 4);
  const w = Math.min(Math.max(params.width || 800, 256), 2048);
  const h = Math.min(Math.max(params.height || 800, 256), 2048);

  const systemInstruction = `You are a master textile, surface, and vector SVG pattern designer.
Generate ${count} distinct, gallery-quality, genuinely intricate SVG vector pattern variation(s) inside a JSON object.
CRITICAL SVG RULES:
1. Every svgMarkup MUST be complete, self-contained valid XML SVG with xmlns="http://www.w3.org/2000/svg" and viewBox="0 0 ${w} ${h}" width="${w}" height="${h}".
2. Never output trivial 2-3 shape placeholders. Craft layered, balanced, ornate or architectural compositions with 18–55+ well-structured vector elements (<path>, <circle>, <ellipse>, <polygon>, <line>, <rect>) grouped in semantic <g> layers (e.g. id="background", id="primary-motifs", id="secondary-foliage", id="ornamental-accents").
3. First element inside <svg> MUST be <rect x="0" y="0" width="${w}" height="${h}" fill="${params.backgroundColor}"/> (unless backgroundColor is 'transparent').
4. Use rich bezier curves (C, Q, S) for petals, paisley, leaves, arabesques, and medallions; or crisp geometric math for Islamic girih stars, tiles, and Bauhaus curves.
5. Respect symmetry "${params.symmetry}" (for 4-way or radial, mirror or rotate motifs cleanly around center ${w / 2},${h / 2}) and edge continuity for "${params.repetitionMethod}" repeat (place complementary half-motifs on opposite edges x=0 & x=${w}, y=0 & y=${h} when appropriate so tiles align seamlessly!).
6. Strictly use the requested palette (${params.mainColor}, ${params.secondaryColor}, ${params.backgroundColor}) plus tasteful tonal tints/shades of them.
7. Each of the ${count} variations must explore a genuinely distinct compositional layout or motif rhythm.`;

  const textPrompt = `Create ${count} SVG vector pattern variation(s) for:
Prompt: ${params.prompt}
Category: ${params.category}
Style: ${params.style}
Colors: Main ${params.mainColor}, Secondary ${params.secondaryColor}, Background ${params.backgroundColor}
Density: ${params.density} | Scale: ${params.scale} | Spacing: ${params.spacing}
Symmetry: ${params.symmetry} | Texture aesthetic: ${params.texture}
Complexity: ${params.complexity} | Detail level: ${params.detailLevel}
Orientation: ${params.orientation} | Repetition method: ${params.repetitionMethod}
Canvas viewBox: 0 0 ${w} ${h}
${params.referenceImageDataUrl ? 'Analyze the attached reference image for motif structure, proportions, and visual rhythm, and reinterpret it into clean editable vector SVG patterns matching the prompt and style.' : ''}`;

  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];
  if (params.referenceImageDataUrl) {
    const parsed = parseDataUrl(params.referenceImageDataUrl);
    if (parsed) {
      parts.push({
        inlineData: {
          mimeType: parsed.mimeType,
          data: parsed.data,
        },
      });
    }
  }
  parts.push({ text: textPrompt });

  const { response, model } = await generateContentWithFallback(ai, {
    contents: { parts },
    config: {
      systemInstruction,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          variations: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                designNotes: { type: Type.STRING },
                paletteUsed: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                seamlessEdgeReady: { type: Type.BOOLEAN },
                svgMarkup: { type: Type.STRING },
              },
              required: ['title', 'designNotes', 'paletteUsed', 'seamlessEdgeReady', 'svgMarkup'],
            },
          },
        },
        required: ['variations'],
      },
    },
  });

  const rawJson = response.text?.trim();
  if (!rawJson) {
    throw new Error('AI returned an empty response.');
  }

  const parsed = JSON.parse(rawJson) as {
    variations: Array<{
      title: string;
      designNotes: string;
      paletteUsed: string[];
      seamlessEdgeReady: boolean;
      svgMarkup: string;
    }>;
  };

  if (!Array.isArray(parsed.variations) || parsed.variations.length === 0) {
    throw new Error('No pattern variations were produced.');
  }

  const patterns = parsed.variations.slice(0, count).map((item, idx) => {
    const cleanSvg = sanitizeSvg(item.svgMarkup, w, h);
    const dataUrl = `data:image/svg+xml;base64,${Buffer.from(cleanSvg, 'utf-8').toString('base64')}`;
    return {
      id: `pat-${Date.now()}-${idx}`,
      title: item.title || `${params.category} Variation ${idx + 1}`,
      designNotes: item.designNotes || `${params.style} vector composition.`,
      paletteUsed:
        Array.isArray(item.paletteUsed) && item.paletteUsed.length > 0
          ? item.paletteUsed
          : [params.mainColor, params.secondaryColor, params.backgroundColor],
      seamlessEdgeReady: Boolean(item.seamlessEdgeReady),
      isVector: true,
      svgMarkup: cleanSvg,
      dataUrl,
      width: w,
      height: h,
    };
  });

  return { patterns, model };
}

export async function generateRasterPattern(params: {
  prompt: string;
  category: string;
  style: string;
  mainColor: string;
  secondaryColor: string;
  backgroundColor: string;
  aspectRatio: string;
  referenceImageDataUrl?: string;
}) {
  const ai = createClient();
  const validAspectRatios = ['1:1', '3:4', '4:3', '9:16', '16:9'];
  const aspectRatio = validAspectRatios.includes(params.aspectRatio)
    ? params.aspectRatio
    : '1:1';

  const fullPrompt = `Seamless flat-lay textile and surface pattern print: ${params.prompt}. Category: ${params.category}. Style: ${params.style}. Colors: primary ${params.mainColor}, secondary ${params.secondaryColor}, background ${params.backgroundColor}. Crisp top-down studio scan, repeatable tile aesthetic.`;

  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];
  if (params.referenceImageDataUrl) {
    const parsed = parseDataUrl(params.referenceImageDataUrl);
    if (parsed) {
      parts.push({ inlineData: { mimeType: parsed.mimeType, data: parsed.data } });
    }
  }
  parts.push({ text: fullPrompt });

  const response = await ai.models.generateContent({
    model: 'gemini-3.1-flash-lite-image',
    contents: { parts },
    config: {
      imageConfig: {
        aspectRatio,
      },
    },
  });

  const outParts = response.candidates?.[0]?.content?.parts ?? [];
  for (const part of outParts) {
    if (part.inlineData?.data) {
      const mime = part.inlineData.mimeType ?? 'image/png';
      return {
        id: `ras-${Date.now()}`,
        title: `${params.category} Raster Print`,
        designNotes: 'Generated with Gemini Flash Image.',
        paletteUsed: [params.mainColor, params.secondaryColor, params.backgroundColor],
        seamlessEdgeReady: false,
        isVector: false,
        dataUrl: `data:${mime};base64,${part.inlineData.data}`,
        width: 1024,
        height: 1024,
      };
    }
  }

  throw new Error('Image model did not return valid image data.');
}

export async function runDesignAssistant(input: {
  message: string;
  canvasSummary: {
    width: number;
    height: number;
    backgroundColor: string;
    objectCount: number;
    objects: Array<{ name: string; type: string; fill?: string; stroke?: string }>;
    palette: string[];
  };
  canvasPreviewDataUrl?: string;
}) {
  const ai = createClient();

  const systemInstruction = `You are the Pattern Studio AI Design Assistant embedded inside a live Fabric.js graphic pattern editor.
Analyze the user's editing instruction and the current canvas state, and return:
1. A helpful, concise "reply" explaining the concrete visual adjustments.
2. An "operations" array of executable canvas operations that the editor will apply immediately!

Supported operations:
- set_background: { type: "set_background", color: "#hex" }
- recolor_objects: { type: "recolor_objects", fromColor?: "#hex" (optional), toColor: "#hex", target?: "all" | "primary" | "accent" }
- apply_palette: { type: "apply_palette", background: "#hex", colors: ["#hex1", "#hex2", "#hex3"] }
- add_svg_motif: { type: "add_svg_motif", name: string, svgMarkup: "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'>...</svg>", scale?: number, opacity?: number } (Use valid self-contained SVG with crisp ornamental filigree, golden borders, floral corners, or geometric accents!)
- adjust_filters: { type: "adjust_filters", brightness?: number (-0.5..0.5), contrast?: number (-0.5..0.5), saturation?: number (-0.5..0.5), hue?: number (-1..1) }
- make_symmetrical: { type: "make_symmetrical", mode: "mirror-x" | "mirror-y" | "4-way" }
- set_style_preset: { type: "set_style_preset", preset: "minimalist" | "luxury" | "silk-sheen" }
- generate_color_variations: { type: "generate_color_variations", variations: [{ name: string, background: string, colors: string[] }] } (Provide 4 distinct curated palettes!)

Only include operations that directly satisfy the user's request. If the user asks to "make it more luxurious" or "add golden decorative elements", include real golden border/corner/filigree add_svg_motif + rich palette adjustments! If they ask for "4 color variations", return generate_color_variations with 4 palettes.`;

  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];
  if (input.canvasPreviewDataUrl) {
    const parsed = parseDataUrl(input.canvasPreviewDataUrl);
    if (parsed) {
      parts.push({ inlineData: { mimeType: parsed.mimeType, data: parsed.data } });
    }
  }
  parts.push({
    text: `User instruction: "${input.message}"
Current canvas state:
${JSON.stringify(input.canvasSummary, null, 2)}`,
  });

  const { response } = await generateContentWithFallback(ai, {
    contents: { parts },
    config: {
      systemInstruction,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          reply: { type: Type.STRING },
          operations: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                type: { type: Type.STRING },
                color: { type: Type.STRING },
                fromColor: { type: Type.STRING },
                toColor: { type: Type.STRING },
                target: { type: Type.STRING },
                background: { type: Type.STRING },
                colors: { type: Type.ARRAY, items: { type: Type.STRING } },
                name: { type: Type.STRING },
                svgMarkup: { type: Type.STRING },
                scale: { type: Type.NUMBER },
                opacity: { type: Type.NUMBER },
                brightness: { type: Type.NUMBER },
                contrast: { type: Type.NUMBER },
                saturation: { type: Type.NUMBER },
                hue: { type: Type.NUMBER },
                mode: { type: Type.STRING },
                preset: { type: Type.STRING },
                variations: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                      background: { type: Type.STRING },
                      colors: { type: Type.ARRAY, items: { type: Type.STRING } },
                    },
                  },
                },
              },
              required: ['type'],
            },
          },
        },
        required: ['reply', 'operations'],
      },
    },
  });

  const text = response.text?.trim();
  if (!text) {
    throw new Error('Assistant returned an empty response.');
  }
  const parsed = JSON.parse(text);
  if (Array.isArray(parsed.operations)) {
    parsed.operations = parsed.operations.map((op: Record<string, unknown>) => {
      if (op.type === 'add_svg_motif' && typeof op.svgMarkup === 'string') {
        try {
          op.svgMarkup = sanitizeSvg(op.svgMarkup, 200, 200);
        } catch {
          op.svgMarkup =
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><path d="M100 10 L120 80 L190 100 L120 120 L100 190 L80 120 L10 100 L80 80 Z" fill="#D4AF37" opacity="0.9"/></svg>';
        }
      }
      return op;
    });
  }
  return parsed;
}
