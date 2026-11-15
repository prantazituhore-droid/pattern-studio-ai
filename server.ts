import 'dotenv/config';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import {
  enhancePatternPrompt,
  formatGeminiError,
  generateRasterPattern,
  generateVectorPatterns,
  hasConfiguredApiKey,
  runDesignAssistant,
} from './server/gemini';

const PORT = Number(process.env.PORT) || 3000;

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '15mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      hasApiKey: hasConfiguredApiKey(),
      vectorModel: process.env.GEMINI_TEXT_MODEL?.trim() || 'gemini-4-hydrogen',
      rasterModel: 'gemini-3.1-flash-lite-image',
      rasterRequiresPaidKey: true,
      runtime: 'express',
    });
  });

  app.post('/api/ai/enhance-prompt', async (req, res) => {
    try {
      const { prompt, category, style, mainColor, secondaryColor, backgroundColor } = req.body ?? {};
      const result = await enhancePatternPrompt({
        prompt: String(prompt ?? ''),
        category: String(category ?? 'Textile and Fabric'),
        style: String(style ?? 'Royal Mughal & Silk Brocade'),
        mainColor: String(mainColor ?? '#7C3AED'),
        secondaryColor: String(secondaryColor ?? '#D4AF37'),
        backgroundColor: String(backgroundColor ?? '#0F172A'),
      });
      res.json(result);
    } catch (err) {
      const formatted = formatGeminiError(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

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

      const result = await generateVectorPatterns({
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

      res.json(result);
    } catch (err) {
      const formatted = formatGeminiError(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

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
