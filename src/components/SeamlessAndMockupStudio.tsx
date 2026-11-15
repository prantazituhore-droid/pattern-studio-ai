import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Eye,
  Grid,
  Layers,
  RefreshCw,
  Shirt,
  Sparkles,
  Upload,
} from 'lucide-react';
import { RepeatMethod } from '../types/studio';
import {
  analyzeSeamlessEdges,
  createSeamlessTileDataUrl,
  renderRepeatGridToCanvas,
  SeamlessValidationResult,
} from '../utils/seamlessAnalyzer';
import {
  MOCKUP_PRODUCTS,
  MockupProductId,
  renderProductMockup,
} from '../utils/mockupRenderer';

interface SeamlessAndMockupStudioProps {
  sourceImageUrl: string;
  sourceTitle: string;
  initialRepeatMethod: RepeatMethod;
  initialSubTab?: 'seamless' | 'mockups';
  onSendTileToEditor: (tileDataUrl: string, title: string) => void;
}

export const SeamlessAndMockupStudio: React.FC<SeamlessAndMockupStudioProps> = ({
  sourceImageUrl,
  sourceTitle,
  initialRepeatMethod,
  initialSubTab = 'seamless',
  onSendTileToEditor,
}) => {
  const [subTab, setSubTab] = useState<'seamless' | 'mockups'>(initialSubTab);
  const [tileUrl, setTileUrl] = useState(sourceImageUrl);
  const [repeatMethod, setRepeatMethod] = useState<RepeatMethod>(initialRepeatMethod);
  const [gridCount, setGridCount] = useState<2 | 3 | 4>(3);
  const [showBoundaries, setShowBoundaries] = useState(true);
  const [tileRotation, setTileRotation] = useState(0);
  const [tileGap, setTileGap] = useState(0);

  const [validation, setValidation] = useState<SeamlessValidationResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  // Mockup controls
  const [selectedProduct, setSelectedProduct] = useState<MockupProductId>('saree');
  const [mockupScale, setMockupScale] = useState(0.55);
  const [mockupRotation, setMockupRotation] = useState(0);
  const [darkBackdrop, setDarkBackdrop] = useState(false);

  const repeatCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const mockupCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const uploadTileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setTileUrl(sourceImageUrl);
  }, [sourceImageUrl]);

  useEffect(() => {
    setSubTab(initialSubTab);
  }, [initialSubTab]);

  // Render seamless repeat grid & run genuine edge verification
  useEffect(() => {
    if (subTab !== 'seamless' || !repeatCanvasRef.current || !tileUrl) return;
    renderRepeatGridToCanvas(repeatCanvasRef.current, tileUrl, {
      gridCount,
      repeatMethod,
      showBoundaries,
      tileRotationDeg: tileRotation,
      tileGapPx: tileGap,
    });
  }, [subTab, tileUrl, gridCount, repeatMethod, showBoundaries, tileRotation, tileGap]);

  useEffect(() => {
    if (!tileUrl) return;
    let cancelled = false;
    setAnalyzing(true);
    analyzeSeamlessEdges(tileUrl, repeatMethod)
      .then((res) => {
        if (!cancelled) setValidation(res);
      })
      .catch(() => {
        if (!cancelled) setValidation(null);
      })
      .finally(() => {
        if (!cancelled) setAnalyzing(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tileUrl, repeatMethod]);

  // Render mockup canvas
  useEffect(() => {
    if (subTab !== 'mockups' || !mockupCanvasRef.current || !tileUrl) return;
    renderProductMockup(mockupCanvasRef.current, tileUrl, selectedProduct, {
      tileScale: mockupScale,
      rotationDeg: mockupRotation,
      darkBackdrop,
    });
  }, [subTab, tileUrl, selectedProduct, mockupScale, mockupRotation, darkBackdrop]);

  const handleUploadTile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setTileUrl(String(reader.result));
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleMakeSeamless = async (mode: 'mirror-4way' | 'offset-blend') => {
    const fixedUrl = await createSeamlessTileDataUrl(tileUrl, mode, 800);
    setTileUrl(fixedUrl);
  };

  const handleExportTile = () => {
    const a = document.createElement('a');
    a.href = tileUrl;
    a.download = `${sourceTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-tile.png`;
    a.click();
  };

  const handleExportRepeatSheet = () => {
    if (!repeatCanvasRef.current) return;
    const a = document.createElement('a');
    a.href = repeatCanvasRef.current.toDataURL('image/png');
    a.download = `${sourceTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${gridCount}x${gridCount}-repeat.png`;
    a.click();
  };

  const handleDownloadMockup = () => {
    if (!mockupCanvasRef.current) return;
    const a = document.createElement('a');
    a.href = mockupCanvasRef.current.toDataURL('image/png');
    a.download = `${sourceTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${selectedProduct}-mockup.png`;
    a.click();
  };

  return (
    <div className="space-y-5">
      {/* Top Studio Mode Switcher + Upload Tile */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-3">
        <div className="flex items-center gap-1 p-1 rounded-lg bg-zinc-100 dark:bg-zinc-950">
          <button
            type="button"
            onClick={() => setSubTab('seamless')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              subTab === 'seamless'
                ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-xs'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            Seamless Repeat Studio
          </button>
          <button
            type="button"
            onClick={() => setSubTab('mockups')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              subTab === 'mockups'
                ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-xs'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            <Shirt className="w-3.5 h-3.5" />
            Product Mockups (13)
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <input
            ref={uploadTileRef}
            type="file"
            accept="image/*"
            onChange={handleUploadTile}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => uploadTileRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 whitespace-nowrap"
          >
            <Upload className="w-3.5 h-3.5" />
            Upload Tile
          </button>
          <button
            type="button"
            onClick={() => onSendTileToEditor(tileUrl, `${sourceTitle} Seamless`)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-violet-600 text-white hover:bg-violet-700 whitespace-nowrap"
          >
            <Layers className="w-3.5 h-3.5" />
            Edit Tile in Pro Editor
          </button>
        </div>
      </div>

      {/* SEAMLESS REPEAT STUDIO */}
      {subTab === 'seamless' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-5 text-xs">
            {/* Active Single Tile Preview */}
            <div className="flex items-center gap-3">
              <img
                src={tileUrl}
                alt="Active repeat tile"
                referrerPolicy="no-referrer"
                className="w-16 h-16 rounded-lg object-cover border border-zinc-200 dark:border-zinc-700 checkerboard-bg"
              />
              <div className="min-w-0">
                <div className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 truncate">
                  {sourceTitle}
                </div>
                <div className="text-zinc-500 mt-0.5">Active Pattern Tile</div>
              </div>
            </div>

            {/* Repeat Mode */}
            <div className="space-y-1.5">
              <label className="font-medium text-zinc-700 dark:text-zinc-300 block">
                Repetition Method
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {(
                  [
                    { id: 'grid', label: 'Grid Repeat' },
                    { id: 'brick', label: 'Brick Repeat' },
                    { id: 'half-drop', label: 'Half-Drop' },
                    { id: 'mirror', label: 'Mirror Repeat' },
                    { id: 'horizontal', label: 'Horizontal Strip' },
                    { id: 'vertical', label: 'Vertical Strip' },
                  ] as Array<{ id: RepeatMethod; label: string }>
                ).map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setRepeatMethod(m.id)}
                    className={`py-2 px-2.5 rounded-lg border text-left font-medium transition-colors ${
                      repeatMethod === m.id
                        ? 'border-violet-600 bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300'
                        : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Preview Matrix Size */}
            <div className="space-y-1.5">
              <label className="font-medium text-zinc-700 dark:text-zinc-300 block">
                Repeat Grid Size
              </label>
              <div className="grid grid-cols-3 gap-2">
                {([2, 3, 4] as const).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGridCount(g)}
                    className={`py-2 rounded-lg border font-mono font-medium ${
                      gridCount === g
                        ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300'
                        : 'border-zinc-200 dark:border-zinc-800'
                    }`}
                  >
                    {g}×{g}
                  </button>
                ))}
              </div>
            </div>

            {/* Tile Rotation & Spacing */}
            <div className="space-y-3 pt-1 border-t border-zinc-200 dark:border-zinc-800">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-zinc-600 dark:text-zinc-400">Tile Rotation</span>
                  <span className="font-mono tabular-nums">{tileRotation}°</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={180}
                  step={15}
                  value={tileRotation}
                  onChange={(e) => setTileRotation(Number(e.target.value))}
                  className="w-full accent-violet-600"
                />
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-zinc-600 dark:text-zinc-400">Grout / Tile Gap</span>
                  <span className="font-mono tabular-nums">{tileGap}px</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={24}
                  value={tileGap}
                  onChange={(e) => setTileGap(Number(e.target.value))}
                  className="w-full accent-violet-600"
                />
              </div>
              <label className="flex items-center justify-between cursor-pointer pt-1">
                <span className="inline-flex items-center gap-1.5 font-medium text-zinc-700 dark:text-zinc-300">
                  <Eye className="w-3.5 h-3.5" />
                  Inspect Tile Boundaries
                </span>
                <input
                  type="checkbox"
                  checked={showBoundaries}
                  onChange={(e) => setShowBoundaries(e.target.checked)}
                  className="h-4 w-4 accent-violet-600 rounded"
                />
              </label>
            </div>

            {/* Real Seamless Verification Status */}
            <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                  Seamless Edge Verification
                </span>
                {analyzing && <RefreshCw className="w-3.5 h-3.5 animate-spin text-zinc-400" />}
              </div>

              {validation && (
                <>
                  <div
                    className={`flex items-start gap-2 font-medium ${
                      validation.isSeamless
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    {validation.isSeamless ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    )}
                    <span>{validation.verdict}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-1 font-mono text-[11px] tabular-nums text-zinc-500">
                    <div>
                      <span className="block text-[10px]">H-Delta</span>
                      <strong className="text-zinc-900 dark:text-zinc-100">
                        {validation.horizontalEdgeDelta}
                      </strong>
                    </div>
                    <div>
                      <span className="block text-[10px]">V-Delta</span>
                      <strong className="text-zinc-900 dark:text-zinc-100">
                        {validation.verticalEdgeDelta}
                      </strong>
                    </div>
                    <div>
                      <span className="block text-[10px]">Continuity</span>
                      <strong className="text-zinc-900 dark:text-zinc-100">
                        {validation.continuityScore}%
                      </strong>
                    </div>
                  </div>
                </>
              )}

              <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 space-y-1.5">
                <span className="text-[11px] text-zinc-500 block">Edge Alignment Assistance</span>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleMakeSeamless('mirror-4way')}
                    className="inline-flex items-center justify-center gap-1 py-1.5 px-2 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 font-medium"
                  >
                    <Sparkles className="w-3 h-3 text-violet-600" />
                    4-Way Mirror Tile
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMakeSeamless('offset-blend')}
                    className="inline-flex items-center justify-center gap-1 py-1.5 px-2 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 font-medium"
                  >
                    Offset Blend Tile
                  </button>
                </div>
              </div>
            </div>

            {/* Export Seamless Assets */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleExportTile}
                className="inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-medium"
              >
                <Download className="w-3.5 h-3.5" />
                Export Tile
              </button>
              <button
                type="button"
                onClick={handleExportRepeatSheet}
                className="inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg bg-violet-600 text-white hover:bg-violet-700 font-medium"
              >
                <Download className="w-3.5 h-3.5" />
                Export {gridCount}×{gridCount}
              </button>
            </div>
          </div>

          {/* Large Repeat Canvas Stage */}
          <div className="lg:col-span-8 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 flex flex-col items-center justify-center">
            <canvas
              ref={repeatCanvasRef}
              width={900}
              height={900}
              className="w-full max-w-[740px] aspect-square rounded-lg border border-zinc-200 dark:border-zinc-800 checkerboard-bg"
            />
          </div>
        </div>
      )}

      {/* PRODUCT MOCKUP STUDIO (13 Products) */}
      {subTab === 'mockups' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-4 text-xs">
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Select Product Surface (13)
              </h3>
              <p className="text-zinc-500 mt-0.5">
                Preview fabric drape, tile perspective, and interior scale
              </p>
            </div>

            <div className="grid grid-cols-2 gap-1.5 max-h-72 overflow-y-auto pr-1">
              {MOCKUP_PRODUCTS.map((prod) => (
                <button
                  key={prod.id}
                  type="button"
                  onClick={() => setSelectedProduct(prod.id)}
                  className={`p-2.5 rounded-lg border text-left transition-colors ${
                    selectedProduct === prod.id
                      ? 'border-violet-600 bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300'
                      : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                  }`}
                >
                  <div className="font-medium truncate">{prod.label}</div>
                  <div className="text-[10px] text-zinc-400">{prod.category}</div>
                </button>
              ))}
            </div>

            <div className="space-y-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-zinc-600 dark:text-zinc-400">Pattern Scale</span>
                  <span className="font-mono tabular-nums">{Math.round(mockupScale * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0.18}
                  max={1.4}
                  step={0.04}
                  value={mockupScale}
                  onChange={(e) => setMockupScale(Number(e.target.value))}
                  className="w-full accent-violet-600"
                />
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-zinc-600 dark:text-zinc-400">Pattern Angle</span>
                  <span className="font-mono tabular-nums">{mockupRotation}°</span>
                </div>
                <input
                  type="range"
                  min={-90}
                  max={90}
                  step={5}
                  value={mockupRotation}
                  onChange={(e) => setMockupRotation(Number(e.target.value))}
                  className="w-full accent-violet-600"
                />
              </div>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="font-medium text-zinc-700 dark:text-zinc-300">
                  Dark Studio Backdrop
                </span>
                <input
                  type="checkbox"
                  checked={darkBackdrop}
                  onChange={(e) => setDarkBackdrop(e.target.checked)}
                  className="h-4 w-4 accent-violet-600 rounded"
                />
              </label>
            </div>

            <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-[11px] text-zinc-500 leading-relaxed">
              Visual Mockup Preview — Designed for client presentation. Use Seamless Repeat Studio or
              Pro Editor Export for print-ready production tiles.
            </div>

            <button
              type="button"
              onClick={handleDownloadMockup}
              className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-lg bg-violet-600 text-white hover:bg-violet-700 font-medium"
            >
              <Download className="w-4 h-4" />
              Download Mockup Preview
            </button>
          </div>

          <div className="lg:col-span-8 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 flex flex-col items-center justify-center">
            <canvas
              ref={mockupCanvasRef}
              width={900}
              height={760}
              className="w-full max-w-[780px] rounded-lg border border-zinc-200 dark:border-zinc-800"
            />
          </div>
        </div>
      )}
    </div>
  );
};
