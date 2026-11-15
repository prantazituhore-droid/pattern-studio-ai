import React, { useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Download,
  Grid,
  Image as ImageIcon,
  Layers,
  Loader2,
  RefreshCw,
  Save,
  Shirt,
  Sparkles,
  Upload,
  Wand2,
  X,
} from 'lucide-react';
import {
  AspectRatioOption,
  DESIGN_STYLES,
  GeneratedPatternResult,
  GenerationParams,
  PATTERN_CATEGORIES,
  PatternCategory,
  RepeatMethod,
  SymmetryMode,
} from '../types/studio';
import { normalizeHex } from '../utils/colorMath';

interface AiPatternGeneratorProps {
  serverHealth: {
    hasApiKey: boolean;
    vectorModel: string;
    rasterModel: string;
    rasterRequiresPaidKey: boolean;
  } | null;
  onOpenInEditor: (pattern: GeneratedPatternResult) => void;
  onOpenInSeamless: (pattern: GeneratedPatternResult) => void;
  onOpenInMockups: (pattern: GeneratedPatternResult) => void;
  onSaveAsProject: (pattern: GeneratedPatternResult) => void;
}

const DEFAULT_PARAMS: GenerationParams = {
  prompt:
    'Create a premium royal floral pattern with golden leaves, delicate flowers, emerald green background and elegant symmetrical details for luxury silk fabric.',
  category: 'Textile and Fabric',
  style: DESIGN_STYLES[0],
  mainColor: '#D4AF37',
  secondaryColor: '#FDE68A',
  backgroundColor: '#064E3B',
  density: 'balanced',
  scale: 'medium',
  spacing: 'comfortable',
  symmetry: '4-way',
  texture: 'silk-sheen',
  complexity: 'rich',
  detailLevel: 'detailed',
  orientation: 'upright',
  repetitionMethod: 'grid',
  aspectRatio: '1:1',
  customWidth: 800,
  customHeight: 800,
  variations: 2,
  engine: 'vector-hydrogen',
};

function resolveDimensions(params: GenerationParams): { width: number; height: number } {
  switch (params.aspectRatio) {
    case '1:1':
      return { width: 800, height: 800 };
    case '3:4':
      return { width: 720, height: 960 };
    case '4:3':
      return { width: 960, height: 720 };
    case '16:9':
      return { width: 1024, height: 576 };
    case '9:16':
      return { width: 576, height: 1024 };
    case 'custom':
      return {
        width: Math.max(256, Math.min(2048, params.customWidth || 800)),
        height: Math.max(256, Math.min(2048, params.customHeight || 800)),
      };
  }
}

export const AiPatternGenerator: React.FC<AiPatternGeneratorProps> = ({
  serverHealth,
  onOpenInEditor,
  onOpenInSeamless,
  onOpenInMockups,
  onSaveAsProject,
}) => {
  const [params, setParams] = useState<GenerationParams>(DEFAULT_PARAMS);
  const [results, setResults] = useState<GeneratedPatternResult[]>([]);
  const [generating, setGenerating] = useState(false);
  const [enhancing, setEnhancing] = useState(false);
  const [progressStage, setProgressStage] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const refInputRef = useRef<HTMLInputElement | null>(null);

  const updateParam = <K extends keyof GenerationParams>(key: K, val: GenerationParams[K]) => {
    setParams((prev) => ({ ...prev, [key]: val }));
  };

  const handleUploadReference = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      updateParam('referenceImageDataUrl', String(reader.result));
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleEnhancePrompt = async () => {
    setEnhancing(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/ai/enhance-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: params.prompt,
          category: params.category,
          style: params.style,
          mainColor: params.mainColor,
          secondaryColor: params.secondaryColor,
          backgroundColor: params.backgroundColor,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to enhance prompt.');
      }
      updateParam('prompt', data.enhancedPrompt);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Prompt enhancement failed.');
    } finally {
      setEnhancing(false);
    }
  };

  const handleGenerate = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!params.prompt.trim()) {
      setErrorMsg('Please enter a pattern description prompt.');
      return;
    }
    setGenerating(true);
    setErrorMsg(null);
    setProgressStage(
      params.engine === 'raster-image'
        ? 'Requesting raster image generation...'
        : `Synthesizing ${params.variations} editable vector pattern variation${params.variations > 1 ? 's' : ''} with Gemini 4 Hydrogen...`
    );

    const dims = resolveDimensions(params);

    try {
      const res = await fetch('/api/ai/generate-pattern', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...params,
          width: dims.width,
          height: dims.height,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Pattern generation failed.');
      }
      if (!Array.isArray(data.patterns) || data.patterns.length === 0) {
        throw new Error('No patterns were returned by the AI model.');
      }

      const formatted: GeneratedPatternResult[] = data.patterns.map(
        (p: GeneratedPatternResult) => ({
          ...p,
          category: params.category,
          style: params.style,
          createdAt: new Date().toISOString(),
        })
      );
      setResults(formatted);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to generate pattern.');
    } finally {
      setGenerating(false);
      setProgressStage('');
    }
  };

  const handleDownloadPattern = (pat: GeneratedPatternResult, asPng: boolean) => {
    if (!asPng && pat.isVector && pat.svgMarkup) {
      const blob = new Blob([pat.svgMarkup], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${pat.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.svg`;
      a.click();
      URL.revokeObjectURL(url);
      return;
    }

    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = pat.width;
      c.height = pat.height;
      const ctx = c.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, pat.width, pat.height);
      const a = document.createElement('a');
      a.href = c.toDataURL('image/png');
      a.download = `${pat.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`;
      a.click();
    };
    img.src = pat.dataUrl;
  };

  const dims = resolveDimensions(params);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
      {/* Left Generation Controls Panel */}
      <form
        onSubmit={handleGenerate}
        className="xl:col-span-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-5"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              AI Pattern Generator
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Text-to-pattern and reference image transformation
            </p>
          </div>
          {serverHealth && !serverHealth.hasApiKey && (
            <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
              API Key Required
            </span>
          )}
        </div>

        {/* Model Engine Capabilities Selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
            Generation Model Engine
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => updateParam('engine', 'vector-hydrogen')}
              className={`p-2.5 rounded-lg border text-left transition-colors ${
                params.engine === 'vector-hydrogen'
                  ? 'border-violet-600 bg-violet-50/70 dark:bg-violet-950/40'
                  : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/60'
              }`}
            >
              <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                Vector SVG Engine
              </div>
              <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                Gemini 4 Hydrogen · 1–4 editable SVG variations
              </div>
            </button>
            <button
              type="button"
              onClick={() => {
                updateParam('engine', 'raster-image');
                updateParam('variations', 1);
                if (params.aspectRatio === 'custom') updateParam('aspectRatio', '1:1');
              }}
              className={`p-2.5 rounded-lg border text-left transition-colors ${
                params.engine === 'raster-image'
                  ? 'border-violet-600 bg-violet-50/70 dark:bg-violet-950/40'
                  : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/60'
              }`}
            >
              <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                Raster Image Model
              </div>
              <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                Requires paid API key in Secrets · 1 image/run
              </div>
            </button>
          </div>
        </div>

        {/* Prompt Input + Enhance */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Design Description Prompt
            </label>
            <button
              type="button"
              disabled={enhancing}
              onClick={handleEnhancePrompt}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-900/50 disabled:opacity-50 whitespace-nowrap"
            >
              {enhancing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Wand2 className="w-3.5 h-3.5" />
              )}
              AI Enhance Prompt
            </button>
          </div>
          <textarea
            rows={3}
            value={params.prompt}
            onChange={(e) => updateParam('prompt', e.target.value)}
            placeholder="Describe motifs, fabric texture, symmetry, and color harmony..."
            className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>

        {/* Reference Image Upload */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Reference Image (Optional Image-to-Pattern)
            </label>
            <input
              ref={refInputRef}
              type="file"
              accept="image/*"
              onChange={handleUploadReference}
              className="hidden"
            />
            {!params.referenceImageDataUrl ? (
              <button
                type="button"
                onClick={() => refInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <Upload className="w-3.5 h-3.5" />
                Upload Reference
              </button>
            ) : (
              <button
                type="button"
                onClick={() => updateParam('referenceImageDataUrl', undefined)}
                className="inline-flex items-center gap-1 text-xs text-red-600 hover:underline"
              >
                <X className="w-3.5 h-3.5" />
                Remove
              </button>
            )}
          </div>
          {params.referenceImageDataUrl && (
            <div className="flex items-center gap-3 p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950">
              <img
                src={params.referenceImageDataUrl}
                alt="Reference pattern input"
                className="w-14 h-14 object-cover rounded-md border border-zinc-200 dark:border-zinc-700"
                referrerPolicy="no-referrer"
              />
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                Reference motif & proportions will guide the generated design transformation.
              </p>
            </div>
          )}
        </div>

        {/* Category & Style */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Design Category
            </label>
            <select
              value={params.category}
              onChange={(e) => updateParam('category', e.target.value as PatternCategory)}
              className="w-full px-2.5 py-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950"
            >
              {PATTERN_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Design Style
            </label>
            <select
              value={params.style}
              onChange={(e) => updateParam('style', e.target.value)}
              className="w-full px-2.5 py-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950"
            >
              {DESIGN_STYLES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Color Controls + Custom HEX */}
        <div className="space-y-2">
          <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
            Color System & Custom HEX
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { key: 'mainColor', label: 'Main' },
              { key: 'secondaryColor', label: 'Secondary' },
              { key: 'backgroundColor', label: 'Background' },
            ].map((item) => {
              const k = item.key as 'mainColor' | 'secondaryColor' | 'backgroundColor';
              return (
                <div
                  key={item.key}
                  className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 space-y-1"
                >
                  <span className="text-[11px] text-zinc-500 block">{item.label}</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="color"
                      value={params[k]}
                      onChange={(e) => updateParam(k, e.target.value.toUpperCase())}
                      className="w-6 h-6 rounded cursor-pointer border border-zinc-300 dark:border-zinc-700 shrink-0"
                    />
                    <input
                      type="text"
                      value={params[k]}
                      onChange={(e) => updateParam(k, e.target.value)}
                      onBlur={(e) => updateParam(k, normalizeHex(e.target.value))}
                      className="w-full min-w-0 text-[11px] font-mono uppercase bg-transparent focus:outline-none"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Advanced Generation Parameters */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
          <div>
            <label className="block text-[11px] text-zinc-500 mb-1">Density</label>
            <select
              value={params.density}
              onChange={(e) => updateParam('density', e.target.value as GenerationParams['density'])}
              className="w-full px-2 py-1.5 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950"
            >
              <option value="sparse">Sparse</option>
              <option value="balanced">Balanced</option>
              <option value="dense">Dense</option>
              <option value="intricate">Intricate</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] text-zinc-500 mb-1">Pattern Scale</label>
            <select
              value={params.scale}
              onChange={(e) => updateParam('scale', e.target.value as GenerationParams['scale'])}
              className="w-full px-2 py-1.5 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950"
            >
              <option value="micro">Micro</option>
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] text-zinc-500 mb-1">Spacing</label>
            <select
              value={params.spacing}
              onChange={(e) => updateParam('spacing', e.target.value as GenerationParams['spacing'])}
              className="w-full px-2 py-1.5 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950"
            >
              <option value="tight">Tight</option>
              <option value="comfortable">Comfortable</option>
              <option value="airy">Airy</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] text-zinc-500 mb-1">Symmetry</label>
            <select
              value={params.symmetry}
              onChange={(e) => updateParam('symmetry', e.target.value as SymmetryMode)}
              className="w-full px-2 py-1.5 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950"
            >
              <option value="4-way">4-Way Mirror</option>
              <option value="8-way">8-Way Mandala</option>
              <option value="radial">Radial</option>
              <option value="bilateral">Bilateral</option>
              <option value="none">Organic / Free</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] text-zinc-500 mb-1">Texture Feel</label>
            <select
              value={params.texture}
              onChange={(e) => updateParam('texture', e.target.value as GenerationParams['texture'])}
              className="w-full px-2 py-1.5 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950"
            >
              <option value="smooth-vector">Crisp Vector</option>
              <option value="silk-sheen">Silk Brocade</option>
              <option value="linen-weave">Linen Weave</option>
              <option value="matte-ceramic">Matte Ceramic</option>
              <option value="gold-foil">Zari Gold Foil</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] text-zinc-500 mb-1">Complexity</label>
            <select
              value={params.complexity}
              onChange={(e) =>
                updateParam('complexity', e.target.value as GenerationParams['complexity'])
              }
              className="w-full px-2 py-1.5 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950"
            >
              <option value="minimal">Minimal</option>
              <option value="moderate">Moderate</option>
              <option value="rich">Rich</option>
              <option value="ornate">Ornate</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] text-zinc-500 mb-1">Detail Level</label>
            <select
              value={params.detailLevel}
              onChange={(e) =>
                updateParam('detailLevel', e.target.value as GenerationParams['detailLevel'])
              }
              className="w-full px-2 py-1.5 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950"
            >
              <option value="clean">Clean</option>
              <option value="detailed">Detailed</option>
              <option value="ultra-fine">Ultra-Fine</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] text-zinc-500 mb-1">Orientation</label>
            <select
              value={params.orientation}
              onChange={(e) =>
                updateParam('orientation', e.target.value as GenerationParams['orientation'])
              }
              className="w-full px-2 py-1.5 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950"
            >
              <option value="upright">Upright</option>
              <option value="diagonal-45">Diagonal 45°</option>
              <option value="omnidirectional">Omnidirectional</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] text-zinc-500 mb-1">Repetition</label>
            <select
              value={params.repetitionMethod}
              onChange={(e) => updateParam('repetitionMethod', e.target.value as RepeatMethod)}
              className="w-full px-2 py-1.5 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950"
            >
              <option value="grid">Grid Repeat</option>
              <option value="brick">Brick Repeat</option>
              <option value="half-drop">Half-Drop</option>
              <option value="mirror">Mirror Repeat</option>
              <option value="horizontal">Horizontal Border</option>
              <option value="vertical">Vertical Stripe</option>
            </select>
          </div>
        </div>

        {/* Dimensions & Variations */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-zinc-200 dark:border-zinc-800">
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              Dimensions ({dims.width}×{dims.height})
            </label>
            <select
              value={params.aspectRatio}
              onChange={(e) => updateParam('aspectRatio', e.target.value as AspectRatioOption)}
              className="w-full px-2.5 py-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950"
            >
              <option value="1:1">1:1 Square (800×800)</option>
              <option value="3:4">3:4 Portrait (720×960)</option>
              <option value="4:3">4:3 Landscape (960×720)</option>
              <option value="16:9">16:9 Wide (1024×576)</option>
              <option value="9:16">9:16 Vertical (576×1024)</option>
              {params.engine === 'vector-hydrogen' && (
                <option value="custom">Custom Dimensions</option>
              )}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              Variations
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {([1, 2, 4] as const).map((v) => {
                const disabled = params.engine === 'raster-image' && v > 1;
                return (
                  <button
                    key={v}
                    type="button"
                    disabled={disabled}
                    onClick={() => updateParam('variations', v)}
                    className={`py-2 text-xs font-medium rounded-lg border tabular-nums transition-colors ${
                      disabled
                        ? 'opacity-40 cursor-not-allowed border-zinc-200 dark:border-zinc-800'
                        : params.variations === v
                          ? 'border-violet-600 bg-violet-600 text-white'
                          : 'border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                    }`}
                  >
                    {v} {v === 1 ? 'Design' : 'Designs'}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {params.aspectRatio === 'custom' && params.engine === 'vector-hydrogen' && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-zinc-500 block mb-1">Custom Width (px)</label>
              <input
                type="number"
                min={256}
                max={2048}
                value={params.customWidth}
                onChange={(e) => updateParam('customWidth', Number(e.target.value))}
                className="w-full px-2.5 py-1.5 text-xs font-mono rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950"
              />
            </div>
            <div>
              <label className="text-[11px] text-zinc-500 block mb-1">Custom Height (px)</label>
              <input
                type="number"
                min={256}
                max={2048}
                value={params.customHeight}
                onChange={(e) => updateParam('customHeight', Number(e.target.value))}
                className="w-full px-2.5 py-1.5 text-xs font-mono rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950"
              />
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="flex items-start gap-2.5 p-3 rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 text-xs text-red-700 dark:text-red-300">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={generating}
          className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 text-white text-sm font-semibold hover:opacity-95 disabled:opacity-60 transition-opacity shadow-sm"
        >
          {generating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{progressStage || 'Generating Pattern...'}</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>
                Generate {params.variations}{' '}
                {params.engine === 'vector-hydrogen' ? 'Vector SVG' : 'Raster'} Pattern
                {params.variations > 1 ? 's' : ''}
              </span>
            </>
          )}
        </button>
      </form>

      {/* Right Generated Patterns Output Canvas */}
      <div className="xl:col-span-7 space-y-4">
        {generating && (
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-10 flex flex-col items-center justify-center text-center gap-3">
            <Loader2 className="w-8 h-8 text-violet-600 animate-spin" />
            <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              {progressStage}
            </div>
            <p className="text-xs text-zinc-500 max-w-md">
              Composing symmetrical motifs, palette stops, and layered geometry for{' '}
              {params.category}.
            </p>
          </div>
        )}

        {!generating && results.length === 0 && (
          <div className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 bg-white/60 dark:bg-zinc-900/40 p-12 flex flex-col items-center justify-center text-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 flex items-center justify-center">
              <ImageIcon className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Ready to Synthesize Original Patterns
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md leading-relaxed">
              Configure your category, palette, symmetry, and dimensions on the left, then generate
              editable SVG vector patterns or transform an uploaded reference image.
            </p>
          </div>
        )}

        {!generating && results.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                  Generated Pattern Variations ({results.length})
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {params.category} · {params.style} · {dims.width}×{dims.height}px
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleGenerate()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Regenerate
              </button>
            </div>

            <div className={`grid gap-4 ${results.length === 1 ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
              {results.map((pat) => {
                const isSaved = savedIds.has(pat.id);
                return (
                  <div
                    key={pat.id}
                    className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden flex flex-col"
                  >
                    <div className="relative aspect-square bg-zinc-100 dark:bg-zinc-950 overflow-hidden checkerboard-bg">
                      <img
                        src={pat.dataUrl}
                        alt={pat.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                      <div className="space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                            {pat.title}
                          </h4>
                          <span className="text-[11px] font-mono text-zinc-500 shrink-0">
                            {pat.isVector ? 'SVG Vector' : 'Raster'}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2">
                          {pat.designNotes}
                        </p>
                        <div className="flex items-center gap-1.5 pt-1">
                          {pat.paletteUsed.slice(0, 5).map((hex, i) => (
                            <span
                              key={`${pat.id}-col-${i}`}
                              className="w-4 h-4 rounded-sm border border-black/15"
                              style={{ backgroundColor: hex }}
                              title={hex}
                            />
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => onOpenInEditor(pat)}
                            className="inline-flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-medium rounded-lg bg-violet-600 text-white hover:bg-violet-700"
                          >
                            <Layers className="w-3.5 h-3.5" />
                            Open in Editor
                          </button>
                          <button
                            type="button"
                            onClick={() => onOpenInSeamless(pat)}
                            className="inline-flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                          >
                            <Grid className="w-3.5 h-3.5" />
                            Seamless Lab
                          </button>
                        </div>
                        <div className="grid grid-cols-3 gap-1.5 text-xs">
                          <button
                            type="button"
                            onClick={() => onOpenInMockups(pat)}
                            className="inline-flex items-center justify-center gap-1 py-1.5 px-2 rounded-md border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                          >
                            <Shirt className="w-3.5 h-3.5" />
                            Mockup
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              onSaveAsProject(pat);
                              setSavedIds((prev) => new Set(prev).add(pat.id));
                            }}
                            className="inline-flex items-center justify-center gap-1 py-1.5 px-2 rounded-md border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                          >
                            <Save className="w-3.5 h-3.5" />
                            {isSaved ? 'Saved' : 'Save'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDownloadPattern(pat, !pat.isVector)}
                            className="inline-flex items-center justify-center gap-1 py-1.5 px-2 rounded-md border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                          >
                            <Download className="w-3.5 h-3.5" />
                            {pat.isVector ? 'SVG' : 'PNG'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
