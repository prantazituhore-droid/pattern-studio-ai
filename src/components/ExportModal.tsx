import React, { useState } from 'react';
import { Download, FileCode2, FileImage, FileJson, X } from 'lucide-react';

interface ExportModalProps {
  open: boolean;
  onClose: () => void;
  projectName: string;
  baseWidth: number;
  baseHeight: number;
  hasVectorOnlyContent: boolean;
  defaultQuality: number;
  onExportPng: (multiplier: number, transparent: boolean) => void;
  onExportJpg: (multiplier: number, quality: number) => void;
  onExportSvg: () => void;
  onExportProjectJson: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  open,
  onClose,
  projectName,
  baseWidth,
  baseHeight,
  hasVectorOnlyContent,
  defaultQuality,
  onExportPng,
  onExportJpg,
  onExportSvg,
  onExportProjectJson,
}) => {
  const [format, setFormat] = useState<'png' | 'jpg' | 'svg' | 'json'>('png');
  const [scale, setScale] = useState<1 | 2 | 4>(2);
  const [quality, setQuality] = useState(Math.round(defaultQuality * 100));
  const [transparentBg, setTransparentBg] = useState(false);

  if (!open) return null;

  const outWidth = Math.round(baseWidth * scale);
  const outHeight = Math.round(baseHeight * scale);

  const handleDownload = () => {
    if (format === 'png') {
      onExportPng(scale, transparentBg);
    } else if (format === 'jpg') {
      onExportJpg(scale, quality / 100);
    } else if (format === 'svg') {
      onExportSvg();
    } else {
      onExportProjectJson();
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <div>
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Export Design & Production Files
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 truncate max-w-sm">
              {projectName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5 text-sm">
          {/* Format Selection */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
              File Format
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setFormat('png')}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border text-xs font-medium transition-colors ${
                  format === 'png'
                    ? 'border-violet-600 bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300'
                    : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                }`}
              >
                <FileImage className="w-4 h-4" />
                <span>PNG Raster</span>
              </button>
              <button
                type="button"
                onClick={() => setFormat('jpg')}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border text-xs font-medium transition-colors ${
                  format === 'jpg'
                    ? 'border-violet-600 bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300'
                    : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                }`}
              >
                <FileImage className="w-4 h-4" />
                <span>JPG Print</span>
              </button>
              <button
                type="button"
                disabled={!hasVectorOnlyContent}
                onClick={() => hasVectorOnlyContent && setFormat('svg')}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border text-xs font-medium transition-colors ${
                  !hasVectorOnlyContent
                    ? 'opacity-45 cursor-not-allowed border-zinc-200 dark:border-zinc-800'
                    : format === 'svg'
                      ? 'border-violet-600 bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300'
                      : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                }`}
              >
                <FileCode2 className="w-4 h-4" />
                <span>SVG Vector</span>
              </button>
              <button
                type="button"
                onClick={() => setFormat('json')}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border text-xs font-medium transition-colors ${
                  format === 'json'
                    ? 'border-violet-600 bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300'
                    : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                }`}
              >
                <FileJson className="w-4 h-4" />
                <span>Editable Project</span>
              </button>
            </div>
            {!hasVectorOnlyContent && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                SVG export is enabled strictly for pure vector designs. This canvas includes raster
                layers, so PNG/JPG or Editable Project JSON are available.
              </p>
            )}
          </div>

          {/* Resolution Scale for PNG/JPG */}
          {(format === 'png' || format === 'jpg') && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Export Resolution
                </label>
                <span className="font-mono text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
                  {outWidth} × {outHeight} px
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {([1, 2, 4] as const).map((mult) => (
                  <button
                    key={mult}
                    type="button"
                    onClick={() => setScale(mult)}
                    className={`py-2 px-3 rounded-lg border text-xs font-medium tabular-nums ${
                      scale === mult
                        ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300'
                        : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                    }`}
                  >
                    {mult}× ({baseWidth * mult}px)
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quality Slider for JPG */}
          {format === 'jpg' && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  JPEG Compression Quality
                </label>
                <span className="font-mono text-xs tabular-nums text-zinc-500">{quality}%</span>
              </div>
              <input
                type="range"
                min={30}
                max={100}
                value={quality}
                onChange={(e) => setQuality(Number(e.target.value))}
                className="w-full accent-violet-600"
              />
            </div>
          )}

          {/* Transparency Option for PNG */}
          {format === 'png' && (
            <label className="flex items-center justify-between p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 cursor-pointer">
              <div>
                <span className="text-xs font-medium text-zinc-800 dark:text-zinc-200 block">
                  Transparent Background
                </span>
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  Omits solid canvas background fill on export
                </span>
              </div>
              <input
                type="checkbox"
                checked={transparentBg}
                onChange={(e) => setTransparentBg(e.target.checked)}
                className="h-4 w-4 accent-violet-600 rounded"
              />
            </label>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-violet-600 text-white hover:bg-violet-700"
          >
            <Download className="w-3.5 h-3.5" />
            Download {format.toUpperCase()}
          </button>
        </div>
      </div>
    </div>
  );
};
