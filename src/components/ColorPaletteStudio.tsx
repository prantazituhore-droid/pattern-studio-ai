import React, { useEffect, useRef, useState } from 'react';
import { Check, Heart, Plus, Trash2, Upload } from 'lucide-react';
import { ColorPalette } from '../types/studio';
import {
  extractColorsFromImage,
  generateHarmonyPalette,
  hexToRgb,
  hslToHex,
  normalizeHex,
  rgbToHex,
  rgbToHsl,
} from '../utils/colorMath';

interface ColorPaletteStudioProps {
  activeColor: string;
  onChangeActiveColor: (hex: string) => void;
  palettes: ColorPalette[];
  onSavePalette: (palette: ColorPalette) => void;
  onDeletePalette: (id: string) => void;
  onToggleFavoritePalette: (id: string) => void;
  onApplyPaletteToCanvas: (palette: { background: string; colors: string[] }) => void;
  onApplyGradientToCanvas?: (colorA: string, colorB: string) => void;
}

export const ColorPaletteStudio: React.FC<ColorPaletteStudioProps> = ({
  activeColor,
  onChangeActiveColor,
  palettes,
  onSavePalette,
  onDeletePalette,
  onToggleFavoritePalette,
  onApplyPaletteToCanvas,
  onApplyGradientToCanvas,
}) => {
  const wheelRef = useRef<HTMLCanvasElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [hexInput, setHexInput] = useState(activeColor);
  const [lightness, setLightness] = useState(() => rgbToHsl(hexToRgb(activeColor)).l);
  const [harmonyMode, setHarmonyMode] = useState<
    'complementary' | 'analogous' | 'monochromatic' | 'triadic'
  >('complementary');
  const [gradStart, setGradStart] = useState('#7C3AED');
  const [gradEnd, setGradEnd] = useState('#2563EB');
  const [paletteName, setPaletteName] = useState('Custom Studio Palette');
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);

  useEffect(() => {
    setHexInput(activeColor);
    setLightness(rgbToHsl(hexToRgb(activeColor)).l);
  }, [activeColor]);

  // Draw real HSL color wheel
  useEffect(() => {
    const canvas = wheelRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvas.width;
    const radius = size / 2;
    const img = ctx.createImageData(size, size);

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = x - radius;
        const dy = y - radius;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const idx = (y * size + x) * 4;

        if (dist <= radius) {
          const angle = ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360;
          const sat = Math.min(100, (dist / radius) * 100);
          const hex = hslToHex({ h: angle, s: sat, l: lightness });
          const rgb = hexToRgb(hex);
          img.data[idx] = rgb.r;
          img.data[idx + 1] = rgb.g;
          img.data[idx + 2] = rgb.b;
          img.data[idx + 3] = 255;
        } else {
          img.data[idx + 3] = 0;
        }
      }
    }
    ctx.putImageData(img, 0, 0);
  }, [lightness]);

  const handleWheelPick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = wheelRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;
    const radius = canvas.width / 2;
    const dx = x - radius;
    const dy = y - radius;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > radius) return;
    const angle = ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360;
    const sat = Math.min(100, (dist / radius) * 100);
    const hex = hslToHex({ h: angle, s: sat, l: lightness });
    onChangeActiveColor(hex);
  };

  const rgb = hexToRgb(activeColor);
  const harmony = generateHarmonyPalette(activeColor, harmonyMode);

  const handleRgbChange = (channel: 'r' | 'g' | 'b', val: number) => {
    const next = { ...rgb, [channel]: Math.max(0, Math.min(255, val || 0)) };
    onChangeActiveColor(rgbToHex(next));
  };

  const handleExtractUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setExtracting(true);
    setExtractError(null);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const dataUrl = String(reader.result);
          const extracted = await extractColorsFromImage(dataUrl, 5);
          if (extracted.length > 0) {
            const newPal: ColorPalette = {
              id: `pal-${Date.now()}`,
              name: file.name.replace(/\.[^.]+$/, '').slice(0, 28) || 'Extracted Palette',
              background: extracted[0],
              colors: extracted.slice(1).length > 0 ? extracted.slice(1) : extracted,
              harmony: 'extracted',
              favorite: false,
              createdAt: new Date().toISOString(),
            };
            onSavePalette(newPal);
            onChangeActiveColor(extracted[0]);
          }
        } catch (err) {
          setExtractError(err instanceof Error ? err.message : 'Color extraction failed.');
        } finally {
          setExtracting(false);
        }
      };
      reader.readAsDataURL(file);
    } catch {
      setExtracting(false);
    }
  };

  return (
    <div className="space-y-5 text-sm">
      {/* Color Wheel + HEX/RGB */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-medium text-zinc-900 dark:text-zinc-100">Color Wheel & Picker</span>
          <div className="flex items-center gap-2">
            <span
              className="h-5 w-5 rounded border border-zinc-300 dark:border-zinc-700"
              style={{ backgroundColor: activeColor }}
            />
            <span className="font-mono text-xs tabular-nums text-zinc-600 dark:text-zinc-400">
              {activeColor}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-center gap-3">
          <canvas
            ref={wheelRef}
            width={168}
            height={168}
            onClick={handleWheelPick}
            className="cursor-crosshair rounded-full border border-zinc-200 dark:border-zinc-800"
            title="Click anywhere on wheel to pick color"
          />
          <div className="w-full space-y-1">
            <div className="flex justify-between text-xs text-zinc-500 dark:text-zinc-400">
              <span>Lightness</span>
              <span className="font-mono tabular-nums">{lightness}%</span>
            </div>
            <input
              type="range"
              min={8}
              max={92}
              value={lightness}
              onChange={(e) => {
                const l = Number(e.target.value);
                setLightness(l);
                const hsl = rgbToHsl(hexToRgb(activeColor));
                onChangeActiveColor(hslToHex({ h: hsl.h, s: hsl.s, l }));
              }}
              className="w-full accent-violet-600"
            />
          </div>
        </div>

        {/* HEX + RGB inputs */}
        <div className="grid grid-cols-4 gap-2">
          <div className="col-span-4 sm:col-span-1">
            <label className="block text-[11px] text-zinc-500 dark:text-zinc-400 mb-1">HEX</label>
            <input
              type="text"
              value={hexInput}
              onChange={(e) => setHexInput(e.target.value)}
              onBlur={() => onChangeActiveColor(normalizeHex(hexInput))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onChangeActiveColor(normalizeHex(hexInput));
              }}
              className="w-full px-2 py-1.5 text-xs font-mono uppercase rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900"
            />
          </div>
          {(['r', 'g', 'b'] as const).map((ch) => (
            <div key={ch}>
              <label className="block text-[11px] uppercase text-zinc-500 dark:text-zinc-400 mb-1">
                {ch}
              </label>
              <input
                type="number"
                min={0}
                max={255}
                value={rgb[ch]}
                onChange={(e) => handleRgbChange(ch, Number(e.target.value))}
                className="w-full px-2 py-1.5 text-xs font-mono tabular-nums rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Harmony Generator */}
      <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="font-medium text-zinc-900 dark:text-zinc-100">Harmony Generator</span>
          <select
            value={harmonyMode}
            onChange={(e) =>
              setHarmonyMode(
                e.target.value as 'complementary' | 'analogous' | 'monochromatic' | 'triadic'
              )
            }
            className="text-xs px-2 py-1 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900"
          >
            <option value="complementary">Complementary</option>
            <option value="analogous">Analogous</option>
            <option value="monochromatic">Monochromatic</option>
            <option value="triadic">Triadic</option>
          </select>
        </div>

        <div className="flex items-center gap-1.5">
          {[harmony.background, ...harmony.colors].map((c, idx) => (
            <button
              key={`${c}-${idx}`}
              type="button"
              onClick={() => onChangeActiveColor(c)}
              className="flex-1 h-8 rounded-md border border-black/10 transition-transform hover:scale-105"
              style={{ backgroundColor: c }}
              title={`${idx === 0 ? 'Background' : 'Color'}: ${c}`}
            />
          ))}
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={paletteName}
            onChange={(e) => setPaletteName(e.target.value)}
            placeholder="Palette name..."
            className="flex-1 px-2.5 py-1.5 text-xs rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900"
          />
          <button
            type="button"
            onClick={() =>
              onSavePalette({
                id: `pal-${Date.now()}`,
                name: paletteName.trim() || 'Custom Palette',
                background: harmony.background,
                colors: harmony.colors,
                harmony: harmonyMode,
                favorite: false,
                createdAt: new Date().toISOString(),
              })
            }
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            Save
          </button>
          <button
            type="button"
            onClick={() => onApplyPaletteToCanvas(harmony)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md bg-violet-600 text-white hover:bg-violet-700 whitespace-nowrap"
          >
            <Check className="w-3.5 h-3.5" />
            Apply
          </button>
        </div>
      </div>

      {/* Gradient Creator */}
      {onApplyGradientToCanvas && (
        <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 space-y-2.5">
          <span className="font-medium text-zinc-900 dark:text-zinc-100 block">
            Gradient Creator
          </span>
          <div
            className="h-7 w-full rounded-md border border-zinc-200 dark:border-zinc-800"
            style={{ background: `linear-gradient(90deg, ${gradStart}, ${gradEnd})` }}
          />
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={gradStart}
              onChange={(e) => setGradStart(e.target.value)}
              className="h-8 w-10 rounded cursor-pointer border border-zinc-200 dark:border-zinc-700"
            />
            <input
              type="color"
              value={gradEnd}
              onChange={(e) => setGradEnd(e.target.value)}
              className="h-8 w-10 rounded cursor-pointer border border-zinc-200 dark:border-zinc-700"
            />
            <button
              type="button"
              onClick={() => onApplyGradientToCanvas(gradStart, gradEnd)}
              className="flex-1 px-3 py-1.5 text-xs font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 whitespace-nowrap"
            >
              Apply Gradient to Selection
            </button>
          </div>
        </div>
      )}

      {/* Extract from Image */}
      <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-medium text-zinc-900 dark:text-zinc-100">
            Extract from Image
          </span>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={handleExtractUpload}
            className="hidden"
          />
          <button
            type="button"
            disabled={extracting}
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 whitespace-nowrap"
          >
            <Upload className="w-3.5 h-3.5" />
            {extracting ? 'Extracting...' : 'Upload Image'}
          </button>
        </div>
        {extractError && <p className="text-xs text-red-600 dark:text-red-400">{extractError}</p>}
      </div>

      {/* Saved Palettes */}
      <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 space-y-2">
        <span className="font-medium text-zinc-900 dark:text-zinc-100 block">
          Saved Studio Palettes
        </span>
        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
          {palettes.map((pal) => (
            <div
              key={pal.id}
              className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/60 space-y-1.5"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium truncate text-zinc-800 dark:text-zinc-200">
                  {pal.name}
                </span>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => onToggleFavoritePalette(pal.id)}
                    className={`p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 ${
                      pal.favorite ? 'text-rose-500' : 'text-zinc-400'
                    }`}
                    title="Toggle Favorite"
                  >
                    <Heart className="w-3.5 h-3.5" fill={pal.favorite ? 'currentColor' : 'none'} />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onApplyPaletteToCanvas({ background: pal.background, colors: pal.colors })
                    }
                    className="px-2 py-0.5 text-[11px] font-medium rounded bg-violet-600 text-white hover:bg-violet-700"
                  >
                    Use
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeletePalette(pal.id)}
                    className="p-1 rounded text-zinc-400 hover:text-red-500"
                    title="Delete Palette"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="flex gap-1">
                {[pal.background, ...pal.colors].map((c, idx) => (
                  <button
                    key={`${pal.id}-${idx}`}
                    type="button"
                    onClick={() => onChangeActiveColor(c)}
                    className="flex-1 h-5 rounded border border-black/10"
                    style={{ backgroundColor: c }}
                    title={c}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
