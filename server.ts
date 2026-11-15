import 'dotenv/config';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import {
  enhancePatternPrompt,
  formatGeminiError,
  generateRasterPattern,
  generateVectorPatterns,
  runDesignAssistant,
} from './server/gemini';

const PORT = Number(process.env.PORT) || 3000;

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '15mb' }));

  // Health & capabilities check (never returns secrets)
  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      hasApiKey: Boolean(process.env.GEMINI_API_KEY),
      vectorModel: 'gemini-4-hydrogen',
      rasterModel: 'gemini-3.1-flash-lite-image',
      rasterRequiresPaidKey: true,
    });
  });

  // Enhance user prompt
  app.post('/api/ai/enhance-prompt', async (req, res) => {
    try {
      const { prompt, category, style, mainColor, secondaryColor, backgroundColor } = req.body ?? {};
      const enhanced = await enhancePatternPrompt({
        prompt: String(prompt ?? ''),
        category: String(category ?? 'Textile and Fabric'),
        style: String(style ?? 'Royal Mughal & Silk Brocade'),
        mainColor: String(mainColor ?? '#7C3AED'),
        secondaryColor: String(secondaryColor ?? '#D4AF37'),
        backgroundColor: String(backgroundColor ?? '#0F172A'),
      });
      res.json({ enhancedPrompt: enhanced, model: 'gemini-4-hydrogen' });
    } catch (err) {
      const formatted = formatGeminiError(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  // Generate pattern (Vector SVG via Gemini 4 Hydrogen, or Raster Image if paid key is configured)
  app.post('/api/ai/generate-pattern', async (req, res) => {
    try {
      const body = req.body ?? {};
      if (!body.prompt || typeof body.prompt !== 'string' || !body.prompt.trim()) {
        res.status(400).json({ error: 'Please provide a design description prompt.' });
        return;
      }

      if (body.engine === 'raster-image') {
        const result = await generateRasterPattern({
          prompt: body.prompt,
          category: body.category ?? 'Textile and Fabric',
          style: body.style ?? 'Royal Mughal & Silk Brocade',
          mainColor: body.mainColor ?? '#7C3AED',
          secondaryColor: body.secondaryColor ?? '#D4AF37',
          backgroundColor: body.backgroundColor ?? '#0F172A',
          aspectRatio: body.aspectRatio ?? '1:1',
          referenceImageDataUrl: body.referenceImageDataUrl,
        });
        res.json({ patterns: [result], model: 'gemini-3.1-flash-lite-image' });
        return;
      }

      const patterns = await generateVectorPatterns({
        prompt: body.prompt,
        category: body.category ?? 'Textile and Fabric',
        style: body.style ?? 'Royal Mughal & Silk Brocade',
        mainColor: body.mainColor ?? '#7C3AED',
        secondaryColor: body.secondaryColor ?? '#D4AF37',
        backgroundColor: body.backgroundColor ?? '#0F172A',
        density: body.density ?? 'balanced',
        scale: body.scale ?? 'medium',
        spacing: body.spacing ?? 'comfortable',
        symmetry: body.symmetry ?? '4-way',
        texture: body.texture ?? 'smooth-vector',
        complexity: body.complexity ?? 'rich',
        detailLevel: body.detailLevel ?? 'detailed',
        orientation: body.orientation ?? 'upright',
        repetitionMethod: body.repetitionMethod ?? 'grid',
        width: Number(body.width) || 800,
        height: Number(body.height) || 800,
        variations: Number(body.variations) || 1,
        referenceImageDataUrl: body.referenceImageDataUrl,
      });

      res.json({ patterns, model: 'gemini-4-hydrogen' });
    } catch (err) {
      const formatted = formatGeminiError(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  // Conversational AI Design Assistant
  app.post('/api/ai/assistant', async (req, res) => {
    try {
      const { message, canvasSummary, canvasPreviewDataUrl } = req.body ?? {};
      if (!message || typeof message !== 'string') {
        res.status(400).json({ error: 'Instruction message is required.' });
        return;
      }
      const result = await runDesignAssistant({
        message,
        canvasSummary: canvasSummary ?? {
          width: 800,
          height: 800,
          backgroundColor: '#FFFFFF',
          objectCount: 0,
          objects: [],
          palette: [],
        },
        canvasPreviewDataUrl,
      });
      res.json(result);
    } catch (err) {
      const formatted = formatGeminiError(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  // Vite dev middleware or production static assets
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Pattern Studio AI server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
