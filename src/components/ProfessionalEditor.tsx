import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import {
  Canvas,
  Circle,
  FabricImage,
  FabricObject,
  Gradient,
  Group,
  IText,
  Line,
  PencilBrush,
  Polygon,
  Rect,
  Shadow,
  filters,
  loadSVGFromString,
  util,
} from 'fabric';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDown,
  ArrowUp,
  Bold,
  Circle as CircleIcon,
  Copy,
  Crop,
  Download,
  Eraser,
  Eye,
  EyeOff,
  FlipHorizontal2,
  FlipVertical2,
  Grid3X3,
  History,
  ImagePlus,
  Italic,
  Layers,
  Lock,
  Maximize2,
  Minimize2,
  Minus,
  MousePointer2,
  Move,
  PaintBucket,
  Palette,
  Pencil,
  Pipette,
  Plus,
  Redo2,
  RotateCw,
  Ruler,
  Save,
  Scaling,
  Shapes,
  SlidersHorizontal,
  Square,
  Trash2,
  Type as TypeIcon,
  Undo2,
  Unlock,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import {
  AssistantOperation,
  ColorPalette,
  HistoryEntry,
  LayerItem,
  StudioProject,
} from '../types/studio';
import { ColorPaletteStudio } from './ColorPaletteStudio';

export type EditorTool =
  | 'select'
  | 'move'
  | 'crop'
  | 'resize'
  | 'rotate'
  | 'brush'
  | 'eraser'
  | 'text'
  | 'shape'
  | 'rect'
  | 'circle'
  | 'line'
  | 'eyedropper'
  | 'fill';

export interface EditorHandle {
  loadSvgPattern: (svgMarkup: string, title?: string, bgColor?: string, w?: number, h?: number) => Promise<void>;
  loadRasterPattern: (imageUrl: string, title?: string, w?: number, h?: number) => Promise<void>;
  loadProject: (project: StudioProject) => Promise<void>;
  exportPng: (multiplier: number, transparent: boolean) => string | null;
  exportJpg: (multiplier: number, quality: number) => string | null;
  exportSvg: () => string | null;
  getCanvasSnapshot: () => {
    width: number;
    height: number;
    backgroundColor: string;
    canvasJson: Record<string, unknown>;
    thumbnailDataUrl: string;
    isVectorOnly: boolean;
    summary: {
      width: number;
      height: number;
      backgroundColor: string;
      objectCount: number;
      objects: Array<{ name: string; type: string; fill?: string; stroke?: string }>;
      palette: string[];
    };
  } | null;
  applyAssistantOperations: (ops: AssistantOperation[]) => Promise<string[]>;
}

interface ProfessionalEditorProps {
  isActive?: boolean;
  activeProject: StudioProject;
  palettes: ColorPalette[];
  autoSave: boolean;
  initialShowGrid: boolean;
  initialShowRulers: boolean;
  onSavePalette: (palette: ColorPalette) => void;
  onDeletePalette: (id: string) => void;
  onToggleFavoritePalette: (id: string) => void;
  onPersistProject: (updates: Partial<StudioProject>) => void;
  onOpenExportModal: () => void;
  onSendToSeamless: (dataUrl: string, svgSource?: string) => void;
  onSendToMockups: (dataUrl: string) => void;
}

type MetaObj = FabricObject & {
  id?: string;
  name?: string;
  locked?: boolean;
  customFilters?: {
    brightness: number;
    contrast: number;
    saturation: number;
    hue: number;
    blur: number;
    sharpness: number;
  };
};

const FONT_FAMILIES = [
  'Plus Jakarta Sans',
  'Playfair Display',
  'Cormorant Garamond',
  'Outfit',
  'DM Sans',
  'Lora',
  'Archivo',
  'JetBrains Mono',
];

const EXTRA_PROPS = ['id', 'name', 'locked', 'customFilters'];

function ensureMeta(obj: FabricObject, fallbackName?: string): MetaObj {
  const m = obj as MetaObj;
  if (!m.id) {
    m.id = `layer-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  }
  if (!m.name) {
    m.name = fallbackName || `${obj.type || 'Layer'}`;
  }
  return m;
}

function collectObjectColors(obj: FabricObject, set: Set<string>) {
  if (typeof obj.fill === 'string' && obj.fill.startsWith('#')) {
    set.add(obj.fill.toUpperCase());
  }
  if (typeof obj.stroke === 'string' && obj.stroke.startsWith('#')) {
    set.add(obj.stroke.toUpperCase());
  }
  if (obj instanceof Group) {
    obj.getObjects().forEach((child) => collectObjectColors(child, set));
  }
}

function recolorObjectRecursive(
  obj: FabricObject,
  toColor: string,
  fromColor?: string
) {
  const matchFrom = (c: unknown) =>
    !fromColor ||
    (typeof c === 'string' && c.toLowerCase() === fromColor.toLowerCase());

  if (obj instanceof Group) {
    obj.getObjects().forEach((child) => recolorObjectRecursive(child, toColor, fromColor));
  } else {
    if (typeof obj.fill === 'string' && obj.fill !== 'transparent' && obj.fill !== 'none' && matchFrom(obj.fill)) {
      obj.set('fill', toColor);
    }
    if (typeof obj.stroke === 'string' && obj.stroke !== 'transparent' && obj.stroke !== 'none' && matchFrom(obj.stroke)) {
      obj.set('stroke', toColor);
    }
  }
}

export const ProfessionalEditor = forwardRef<EditorHandle, ProfessionalEditorProps>(
  (
    {
      isActive = true,
      activeProject,
      palettes,
      autoSave,
      initialShowGrid,
      initialShowRulers,
      onSavePalette,
      onDeletePalette,
      onToggleFavoritePalette,
      onPersistProject,
      onOpenExportModal,
      onSendToSeamless,
      onSendToMockups,
    },
    ref
  ) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const canvasElRef = useRef<HTMLCanvasElement | null>(null);
    const fabricRef = useRef<Canvas | null>(null);
    const uploadLayerInputRef = useRef<HTMLInputElement | null>(null);

    const [activeTool, setActiveTool] = useState<EditorTool>('select');
    const [shapeKind, setShapeKind] = useState<'star' | 'diamond' | 'hexagon' | 'triangle'>('star');
    const [zoom, setZoom] = useState(0.75);
    const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showGrid, setShowGrid] = useState(initialShowGrid);
    const [showRulers, setShowRulers] = useState(initialShowRulers);

    const [canvasWidth, setCanvasWidth] = useState(activeProject.width || 800);
    const [canvasHeight, setCanvasHeight] = useState(activeProject.height || 800);
    const [canvasBg, setCanvasBg] = useState(activeProject.backgroundColor || '#FFFFFF');

    const [activeColor, setActiveColor] = useState('#7C3AED');
    const [strokeColor, setStrokeColor] = useState('#1E293B');
    const [strokeWidth, setStrokeWidth] = useState(2);
    const [brushSize, setBrushSize] = useState(10);
    const [eraserMode, setEraserMode] = useState<'paint' | 'object'>('paint');

    const [layers, setLayers] = useState<LayerItem[]>([]);
    const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
    const [selectedObjType, setSelectedObjType] = useState<string | null>(null);
    const [renamingId, setRenamingId] = useState<string | null>(null);
    const [renameDraft, setRenameDraft] = useState('');

    // Selected object inspector states
    const [objOpacity, setObjOpacity] = useState(100);
    const [objAngle, setObjAngle] = useState(0);
    const [objW, setObjW] = useState(100);
    const [objH, setObjH] = useState(100);
    const [objFill, setObjFill] = useState('#7C3AED');

    // Text inspector states
    const [textFont, setTextFont] = useState('Plus Jakarta Sans');
    const [textSize, setTextSize] = useState(42);
    const [textBold, setTextBold] = useState(false);
    const [textItalic, setTextItalic] = useState(false);
    const [textSpacing, setTextSpacing] = useState(0);
    const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right'>('center');
    const [textShadowOn, setTextShadowOn] = useState(false);

    // Image filter states
    const [imgFilters, setImgFilters] = useState({
      brightness: 0,
      contrast: 0,
      saturation: 0,
      hue: 0,
      blur: 0,
      sharpness: 0,
    });
    const [bgReplaceTarget, setBgReplaceTarget] = useState('#FFFFFF');
    const [bgReplaceTolerance, setBgReplaceTolerance] = useState(32);

    // Right panel tab
    const [rightTab, setRightTab] = useState<'layers' | 'inspector' | 'palette' | 'history'>('layers');

    // History stack
    const historyRef = useRef<HistoryEntry[]>([]);
    const historyIndexRef = useRef<number>(-1);
    const isRestoringHistoryRef = useRef(false);
    const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);

    // Crop overlay state
    const cropRectRef = useRef<Rect | null>(null);
    const [isCropping, setIsCropping] = useState(false);

    // Canvas resize modal/popover
    const [showResizeBox, setShowResizeBox] = useState(false);
    const [draftCanvasW, setDraftCanvasW] = useState(canvasWidth);
    const [draftCanvasH, setDraftCanvasH] = useState(canvasHeight);

    const [statusNotice, setStatusNotice] = useState<string | null>(null);

    const flashNotice = (msg: string) => {
      setStatusNotice(msg);
      setTimeout(() => setStatusNotice((prev) => (prev === msg ? null : prev)), 2600);
    };

    const syncLayersFromCanvas = useCallback(() => {
      const canvas = fabricRef.current;
      if (!canvas) return;
      const objs = canvas
        .getObjects()
        .filter((o) => o !== cropRectRef.current);

      const items: LayerItem[] = objs
        .map((obj, idx) => {
          const m = ensureMeta(obj);
          return {
            id: m.id!,
            name: m.name!,
            type: obj.type || 'object',
            visible: obj.visible !== false,
            locked: Boolean(m.locked),
            opacity: Math.round((obj.opacity ?? 1) * 100),
            fill: typeof obj.fill === 'string' ? obj.fill : undefined,
            index: idx,
          };
        })
        .reverse();

      setLayers(items);
    }, []);

    const syncSelectionInspector = useCallback(() => {
      const canvas = fabricRef.current;
      if (!canvas) return;
      const active = canvas.getActiveObject();
      if (!active || active === cropRectRef.current) {
        setSelectedLayerId(null);
        setSelectedObjType(null);
        return;
      }
      const m = ensureMeta(active);
      setSelectedLayerId(m.id ?? null);
      setSelectedObjType(active.type ?? 'object');
      setObjOpacity(Math.round((active.opacity ?? 1) * 100));
      setObjAngle(Math.round(active.angle ?? 0));
      setObjW(Math.round(active.getScaledWidth()));
      setObjH(Math.round(active.getScaledHeight()));
      if (typeof active.fill === 'string' && active.fill.startsWith('#')) {
        setObjFill(active.fill);
      }
      if (active instanceof IText) {
        setTextFont(active.fontFamily || 'Plus Jakarta Sans');
        setTextSize(active.fontSize || 42);
        setTextBold(active.fontWeight === 'bold' || active.fontWeight === 700);
        setTextItalic(active.fontStyle === 'italic');
        setTextSpacing(active.charSpacing || 0);
        setTextAlign((active.textAlign as 'left' | 'center' | 'right') || 'center');
        setTextShadowOn(Boolean(active.shadow));
      }
      if (active instanceof FabricImage) {
        const cf = m.customFilters ?? {
          brightness: 0,
          contrast: 0,
          saturation: 0,
          hue: 0,
          blur: 0,
          sharpness: 0,
        };
        setImgFilters(cf);
      }
    }, []);

    const pushHistory = useCallback(
      (label: string) => {
        const canvas = fabricRef.current;
        if (!canvas || isRestoringHistoryRef.current) return;
        const jsonObj = canvas.toObject(EXTRA_PROPS);
        const serialized = JSON.stringify(jsonObj);
        const current = historyRef.current[historyIndexRef.current];
        if (current && current.json === serialized) return;

        const sliced = historyRef.current.slice(0, historyIndexRef.current + 1);
        const entry: HistoryEntry = {
          id: `hist-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          label,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          json: serialized,
        };
        const next = [...sliced, entry].slice(-35);
        historyRef.current = next;
        historyIndexRef.current = next.length - 1;
        setHistoryEntries(next);
        setHistoryIndex(historyIndexRef.current);

        if (autoSave) {
          const thumb = canvas.toDataURL({ format: 'png', multiplier: 0.35 });
          const objs = canvas.getObjects();
          const isVec = objs.every((o) => !(o instanceof FabricImage));
          const paletteSet = new Set<string>();
          objs.forEach((o) => collectObjectColors(o, paletteSet));
          onPersistProject({
            canvasJson: jsonObj,
            thumbnailDataUrl: thumb,
            backgroundColor: String(canvas.backgroundColor || '#FFFFFF'),
            width: canvas.getWidth(),
            height: canvas.getHeight(),
            isVector: isVec,
            palette: Array.from(paletteSet).slice(0, 6),
          });
        }
      },
      [autoSave, onPersistProject]
    );

    const jumpToHistory = useCallback(
      async (targetIdx: number) => {
        const canvas = fabricRef.current;
        const entry = historyRef.current[targetIdx];
        if (!canvas || !entry) return;
        isRestoringHistoryRef.current = true;
        try {
          const parsed = JSON.parse(entry.json);
          await canvas.loadFromJSON(parsed);
          canvas.requestRenderAll();
          historyIndexRef.current = targetIdx;
          setHistoryIndex(targetIdx);
          setCanvasBg(String(canvas.backgroundColor || '#FFFFFF'));
          syncLayersFromCanvas();
          syncSelectionInspector();
        } finally {
          isRestoringHistoryRef.current = false;
        }
      },
      [syncLayersFromCanvas, syncSelectionInspector]
    );

    const handleUndo = useCallback(() => {
      if (historyIndexRef.current > 0) {
        jumpToHistory(historyIndexRef.current - 1);
      }
    }, [jumpToHistory]);

    const handleRedo = useCallback(() => {
      if (historyIndexRef.current < historyRef.current.length - 1) {
        jumpToHistory(historyIndexRef.current + 1);
      }
    }, [jumpToHistory]);

    // Initialize Fabric.js Canvas
    useEffect(() => {
      if (!canvasElRef.current) return;
      const canvas = new Canvas(canvasElRef.current, {
        width: activeProject.width || 800,
        height: activeProject.height || 800,
        backgroundColor: activeProject.backgroundColor || '#FFFFFF',
        preserveObjectStacking: true,
        selection: true,
      });

      fabricRef.current = canvas;

      const onModified = () => {
        syncLayersFromCanvas();
        syncSelectionInspector();
        pushHistory('Transform Layer');
      };

      const onPathCreated = (opt: { path?: FabricObject }) => {
        if (opt.path) {
          const isErasing = (opt.path as unknown as { __isEraser?: boolean }).__isEraser;
          ensureMeta(opt.path, isErasing ? 'Eraser Stroke' : 'Brush Stroke');
        }
        syncLayersFromCanvas();
        pushHistory('Freehand Stroke');
      };

      canvas.on('selection:created', syncSelectionInspector);
      canvas.on('selection:updated', syncSelectionInspector);
      canvas.on('selection:cleared', syncSelectionInspector);
      canvas.on('object:modified', onModified);
      canvas.on('path:created', onPathCreated);

      // Load initial project content
      const loadInitial = async () => {
        isRestoringHistoryRef.current = true;
        try {
          if (activeProject.canvasJson) {
            await canvas.loadFromJSON(activeProject.canvasJson);
          } else if (activeProject.svgSource) {
            const { objects, options } = await loadSVGFromString(activeProject.svgSource);
            const validObjs = objects.filter((o): o is FabricObject => Boolean(o));
            if (validObjs.length > 0) {
              const grouped = util.groupSVGElements(validObjs, options);
              grouped.scaleToWidth(canvas.getWidth());
              canvas.add(grouped);
              ensureMeta(grouped, activeProject.name || 'Vector Pattern');
            }
          } else if (activeProject.previewImageUrl || activeProject.thumbnailDataUrl) {
            const url = activeProject.previewImageUrl || activeProject.thumbnailDataUrl;
            const img = await FabricImage.fromURL(url, { crossOrigin: 'anonymous' });
            const scale = Math.max(
              canvas.getWidth() / (img.width || 1),
              canvas.getHeight() / (img.height || 1)
            );
            img.set({ left: 0, top: 0, scaleX: scale, scaleY: scale });
            ensureMeta(img, activeProject.name || 'Pattern Artwork');
            canvas.add(img);
          }
          canvas.requestRenderAll();
        } catch (err) {
          console.error('Failed to load initial canvas project:', err);
        } finally {
          isRestoringHistoryRef.current = false;
          syncLayersFromCanvas();
          // Seed initial history entry
          const initialJson = JSON.stringify(canvas.toObject(EXTRA_PROPS));
          const initialEntry: HistoryEntry = {
            id: `hist-init-${Date.now()}`,
            label: 'Opened Project',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            json: initialJson,
          };
          historyRef.current = [initialEntry];
          historyIndexRef.current = 0;
          setHistoryEntries([initialEntry]);
          setHistoryIndex(0);
        }
      };

      loadInitial();

      return () => {
        canvas.dispose();
        fabricRef.current = null;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeProject.id]);

    // Fit canvas nicely into viewport on initial load or when tab becomes visible
    const fitToScreen = useCallback(() => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      if (rect.width < 120 || rect.height < 120) return;
      const availW = Math.max(240, rect.width - 96);
      const availH = Math.max(240, rect.height - 96);
      const nextZoom = Math.min(availW / canvasWidth, availH / canvasHeight, 1.25);
      setZoom(Math.max(0.2, Math.round(nextZoom * 100) / 100));
      setPanOffset({ x: 0, y: 0 });
    }, [canvasWidth, canvasHeight]);

    useEffect(() => {
      if (!isActive) return;
      const t = setTimeout(fitToScreen, 60);
      return () => clearTimeout(t);
    }, [fitToScreen, isActive]);

    // Sync active tool mode with Fabric Canvas
    useEffect(() => {
      const canvas = fabricRef.current;
      if (!canvas) return;

      canvas.isDrawingMode = activeTool === 'brush' || (activeTool === 'eraser' && eraserMode === 'paint');
      canvas.selection = activeTool === 'select' || activeTool === 'resize' || activeTool === 'rotate';

      if (activeTool === 'brush') {
        const brush = new PencilBrush(canvas);
        brush.color = activeColor;
        brush.width = brushSize;
        canvas.freeDrawingBrush = brush;
      } else if (activeTool === 'eraser' && eraserMode === 'paint') {
        const brush = new PencilBrush(canvas);
        const bg = typeof canvas.backgroundColor === 'string' && canvas.backgroundColor !== 'transparent'
          ? canvas.backgroundColor
          : '#FFFFFF';
        brush.color = bg;
        brush.width = brushSize * 1.4;
        canvas.freeDrawingBrush = brush;
      }
    }, [activeTool, activeColor, brushSize, eraserMode, canvasBg]);

    // Handle canvas pointer tools (eyedropper, fill, object eraser, panning)
    useEffect(() => {
      const canvas = fabricRef.current;
      if (!canvas) return;

      let panning = false;
      let lastX = 0;
      let lastY = 0;

      const onMouseDown = (opt: { e: MouseEvent | TouchEvent; target?: FabricObject }) => {
        const evt = opt.e;
        const clientX = 'touches' in evt ? evt.touches[0]?.clientX ?? 0 : evt.clientX;
        const clientY = 'touches' in evt ? evt.touches[0]?.clientY ?? 0 : evt.clientY;

        if (activeTool === 'move' && !opt.target) {
          panning = true;
          lastX = clientX;
          lastY = clientY;
          return;
        }

        if (activeTool === 'eyedropper') {
          const pointer = canvas.getScenePoint(evt);
          const ctx = canvas.getContext();
          const vpt = canvas.viewportTransform;
          const px = Math.round(pointer.x * (vpt?.[0] ?? 1));
          const py = Math.round(pointer.y * (vpt?.[3] ?? 1));
          try {
            const pixel = ctx.getImageData(px, py, 1, 1).data;
            const hex =
              '#' +
              [pixel[0], pixel[1], pixel[2]]
                .map((n) => n.toString(16).padStart(2, '0'))
                .join('')
                .toUpperCase();
            setActiveColor(hex);
            flashNotice(`Sampled ${hex}`);
            setActiveTool('select');
          } catch {
            flashNotice('Could not sample pixel');
          }
          return;
        }

        if (activeTool === 'fill') {
          if (opt.target) {
            recolorObjectRecursive(opt.target, activeColor);
            canvas.requestRenderAll();
            syncLayersFromCanvas();
            pushHistory('Fill Color');
          } else {
            canvas.backgroundColor = activeColor;
            setCanvasBg(activeColor);
            canvas.requestRenderAll();
            pushHistory('Fill Background');
          }
          return;
        }

        if (activeTool === 'eraser' && eraserMode === 'object' && opt.target) {
          canvas.remove(opt.target);
          canvas.discardActiveObject();
          canvas.requestRenderAll();
          syncLayersFromCanvas();
          pushHistory('Erase Object');
        }
      };

      const onMouseMove = (opt: { e: MouseEvent | TouchEvent }) => {
        if (!panning) return;
        const evt = opt.e;
        const clientX = 'touches' in evt ? evt.touches[0]?.clientX ?? 0 : evt.clientX;
        const clientY = 'touches' in evt ? evt.touches[0]?.clientY ?? 0 : evt.clientY;
        const dx = clientX - lastX;
        const dy = clientY - lastY;
        lastX = clientX;
        lastY = clientY;
        setPanOffset((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
      };

      const onMouseUp = () => {
        panning = false;
      };

      canvas.on('mouse:down', onMouseDown as never);
      canvas.on('mouse:move', onMouseMove as never);
      canvas.on('mouse:up', onMouseUp);

      return () => {
        canvas.off('mouse:down', onMouseDown as never);
        canvas.off('mouse:move', onMouseMove as never);
        canvas.off('mouse:up', onMouseUp);
      };
    }, [activeTool, activeColor, eraserMode, pushHistory, syncLayersFromCanvas]);

    // Keyboard shortcuts (Delete, Undo, Redo)
    useEffect(() => {
      const onKeyDown = (e: KeyboardEvent) => {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        const canvas = fabricRef.current;
        if (!canvas) return;
        const active = canvas.getActiveObject();
        if (active instanceof IText && active.isEditing) return;

        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
          e.preventDefault();
          if (e.shiftKey) handleRedo();
          else handleUndo();
        } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y') {
          e.preventDefault();
          handleRedo();
        } else if (e.key === 'Delete' || e.key === 'Backspace') {
          if (active && active !== cropRectRef.current) {
            e.preventDefault();
            canvas.remove(active);
            canvas.discardActiveObject();
            canvas.requestRenderAll();
            syncLayersFromCanvas();
            syncSelectionInspector();
            pushHistory('Delete Layer');
          }
        }
      };
      window.addEventListener('keydown', onKeyDown);
      return () => window.removeEventListener('keydown', onKeyDown);
    }, [handleUndo, handleRedo, pushHistory, syncLayersFromCanvas, syncSelectionInspector]);

    // Add primitives / shapes / text / image layers
    const addLayerObject = (kind: 'rect' | 'circle' | 'line' | 'text' | 'shape') => {
      const canvas = fabricRef.current;
      if (!canvas) return;
      const cx = canvas.getWidth() / 2;
      const cy = canvas.getHeight() / 2;
      let obj: FabricObject;

      if (kind === 'rect') {
        obj = new Rect({
          left: cx - 90,
          top: cy - 90,
          width: 180,
          height: 180,
          rx: 12,
          ry: 12,
          fill: activeColor,
          stroke: strokeColor,
          strokeWidth,
        });
        ensureMeta(obj, 'Rectangle');
      } else if (kind === 'circle') {
        obj = new Circle({
          left: cx - 80,
          top: cy - 80,
          radius: 80,
          fill: activeColor,
          stroke: strokeColor,
          strokeWidth,
        });
        ensureMeta(obj, 'Circle');
      } else if (kind === 'line') {
        obj = new Line([cx - 120, cy, cx + 120, cy], {
          stroke: activeColor,
          strokeWidth: Math.max(3, strokeWidth),
        });
        ensureMeta(obj, 'Line');
      } else if (kind === 'text') {
        obj = new IText('Pattern Motif', {
          left: cx - 110,
          top: cy - 28,
          fontFamily: textFont,
          fontSize: textSize,
          fill: activeColor,
          textAlign: 'center',
        });
        ensureMeta(obj, 'Text Layer');
      } else {
        // Custom motif polygon
        let pts: Array<{ x: number; y: number }> = [];
        if (shapeKind === 'triangle') {
          pts = [
            { x: 0, y: -90 },
            { x: 85, y: 70 },
            { x: -85, y: 70 },
          ];
        } else if (shapeKind === 'diamond') {
          pts = [
            { x: 0, y: -100 },
            { x: 75, y: 0 },
            { x: 0, y: 100 },
            { x: -75, y: 0 },
          ];
        } else if (shapeKind === 'hexagon') {
          pts = Array.from({ length: 6 }, (_, i) => {
            const a = (i * Math.PI) / 3 - Math.PI / 6;
            return { x: Math.cos(a) * 85, y: Math.sin(a) * 85 };
          });
        } else {
          // 8-point star motif
          pts = Array.from({ length: 16 }, (_, i) => {
            const r = i % 2 === 0 ? 95 : 42;
            const a = (i * Math.PI) / 8;
            return { x: Math.cos(a) * r, y: Math.sin(a) * r };
          });
        }
        obj = new Polygon(pts, {
          left: cx - 80,
          top: cy - 80,
          fill: activeColor,
          stroke: strokeColor,
          strokeWidth,
        });
        ensureMeta(obj, `${shapeKind.charAt(0).toUpperCase() + shapeKind.slice(1)} Motif`);
      }

      canvas.add(obj);
      canvas.setActiveObject(obj);
      canvas.requestRenderAll();
      setActiveTool('select');
      syncLayersFromCanvas();
      syncSelectionInspector();
      pushHistory(`Add ${kind}`);
    };

    const handleUploadImageLayer = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async () => {
        const canvas = fabricRef.current;
        if (!canvas) return;
        const img = await FabricImage.fromURL(String(reader.result), {
          crossOrigin: 'anonymous',
        });
        const maxW = canvas.getWidth() * 0.75;
        if ((img.width || 1) > maxW) {
          img.scaleToWidth(maxW);
        }
        img.set({
          left: (canvas.getWidth() - img.getScaledWidth()) / 2,
          top: (canvas.getHeight() - img.getScaledHeight()) / 2,
        });
        ensureMeta(img, file.name.replace(/\.[^.]+$/, ''));
        canvas.add(img);
        canvas.setActiveObject(img);
        canvas.requestRenderAll();
        syncLayersFromCanvas();
        syncSelectionInspector();
        pushHistory('Import Image Layer');
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    };

    const handleDuplicateSelected = async () => {
      const canvas = fabricRef.current;
      const active = canvas?.getActiveObject();
      if (!canvas || !active) return;
      const cloned = await active.clone();
      cloned.set({
        left: (active.left ?? 0) + 28,
        top: (active.top ?? 0) + 28,
      });
      const m = ensureMeta(cloned, `${(active as MetaObj).name || 'Layer'} Copy`);
      m.id = `layer-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      canvas.add(cloned);
      canvas.setActiveObject(cloned);
      canvas.requestRenderAll();
      syncLayersFromCanvas();
      syncSelectionInspector();
      pushHistory('Duplicate Layer');
    };

    const handleDeleteSelected = () => {
      const canvas = fabricRef.current;
      const active = canvas?.getActiveObject();
      if (!canvas || !active || active === cropRectRef.current) return;
      canvas.remove(active);
      canvas.discardActiveObject();
      canvas.requestRenderAll();
      syncLayersFromCanvas();
      syncSelectionInspector();
      pushHistory('Delete Layer');
    };

    const handleFlip = (axis: 'X' | 'Y') => {
      const canvas = fabricRef.current;
      const active = canvas?.getActiveObject();
      if (!canvas || !active) return;
      if (axis === 'X') active.set('flipX', !active.flipX);
      else active.set('flipY', !active.flipY);
      canvas.requestRenderAll();
      pushHistory(`Flip ${axis}`);
    };

    const handleRotateStep = (delta: number) => {
      const canvas = fabricRef.current;
      const active = canvas?.getActiveObject();
      if (!canvas || !active) return;
      const next = ((active.angle ?? 0) + delta) % 360;
      active.rotate(next);
      setObjAngle(Math.round(next));
      canvas.requestRenderAll();
      pushHistory('Rotate Layer');
    };

    // Start & Apply real Crop
    const startCrop = () => {
      const canvas = fabricRef.current;
      if (!canvas) return;
      if (cropRectRef.current) {
        canvas.remove(cropRectRef.current);
      }
      const w = canvas.getWidth() * 0.7;
      const h = canvas.getHeight() * 0.7;
      const cropBox = new Rect({
        left: (canvas.getWidth() - w) / 2,
        top: (canvas.getHeight() - h) / 2,
        width: w,
        height: h,
        fill: 'rgba(124, 58, 237, 0.08)',
        stroke: '#7C3AED',
        strokeWidth: 2,
        strokeDashArray: [8, 4],
        cornerColor: '#7C3AED',
        transparentCorners: false,
      });
      cropRectRef.current = cropBox;
      canvas.add(cropBox);
      canvas.setActiveObject(cropBox);
      canvas.requestRenderAll();
      setIsCropping(true);
      setActiveTool('crop');
    };

    const cancelCrop = () => {
      const canvas = fabricRef.current;
      if (canvas && cropRectRef.current) {
        canvas.remove(cropRectRef.current);
        cropRectRef.current = null;
        canvas.requestRenderAll();
      }
      setIsCropping(false);
      setActiveTool('select');
    };

    const applyCrop = () => {
      const canvas = fabricRef.current;
      const box = cropRectRef.current;
      if (!canvas || !box) return;
      const left = box.left ?? 0;
      const top = box.top ?? 0;
      const newW = Math.max(64, Math.round(box.getScaledWidth()));
      const newH = Math.max(64, Math.round(box.getScaledHeight()));

      canvas.remove(box);
      cropRectRef.current = null;

      canvas.getObjects().forEach((obj) => {
        obj.set({
          left: (obj.left ?? 0) - left,
          top: (obj.top ?? 0) - top,
        });
        obj.setCoords();
      });

      canvas.setDimensions({ width: newW, height: newH });
      setCanvasWidth(newW);
      setCanvasHeight(newH);
      setDraftCanvasW(newW);
      setDraftCanvasH(newH);
      canvas.requestRenderAll();
      setIsCropping(false);
      setActiveTool('select');
      syncLayersFromCanvas();
      pushHistory(`Crop Canvas (${newW}×${newH})`);
      flashNotice(`Cropped canvas to ${newW}×${newH}px`);
    };

    // Apply Image Pixel Filters (Fabric v6)
    const applyImageFilters = (next: typeof imgFilters) => {
      setImgFilters(next);
      const canvas = fabricRef.current;
      const active = canvas?.getActiveObject();
      if (!canvas || !(active instanceof FabricImage)) return;

      const list: filters.BaseFilter<string>[] = [];
      if (next.brightness !== 0) {
        list.push(new filters.Brightness({ brightness: next.brightness }));
      }
      if (next.contrast !== 0) {
        list.push(new filters.Contrast({ contrast: next.contrast }));
      }
      if (next.saturation !== 0) {
        list.push(new filters.Saturation({ saturation: next.saturation }));
      }
      if (next.hue !== 0) {
        list.push(new filters.HueRotation({ rotation: next.hue }));
      }
      if (next.blur > 0) {
        list.push(new filters.Blur({ blur: next.blur }));
      }
      if (next.sharpness > 0) {
        const s = next.sharpness * 1.5;
        list.push(
          new filters.Convolute({
            matrix: [0, -s, 0, -s, 1 + 4 * s, -s, 0, -s, 0],
          })
        );
      }

      active.filters = list;
      active.applyFilters();
      (active as MetaObj).customFilters = next;
      canvas.requestRenderAll();
    };

    // Replace background color inside selected raster image
    const handleReplaceImageBg = async (makeTransparent: boolean) => {
      const canvas = fabricRef.current;
      const active = canvas?.getActiveObject();
      if (!canvas || !(active instanceof FabricImage)) return;
      const el = active.getElement() as HTMLImageElement | HTMLCanvasElement;
      const w = el instanceof HTMLImageElement ? el.naturalWidth : el.width;
      const h = el instanceof HTMLImageElement ? el.naturalHeight : el.height;
      const off = document.createElement('canvas');
      off.width = w;
      off.height = h;
      const ctx = off.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(el, 0, 0, w, h);
      const imgData = ctx.getImageData(0, 0, w, h);
      const data = imgData.data;

      // Sample top-left corner pixel as background key
      const keyR = data[0];
      const keyG = data[1];
      const keyB = data[2];

      const tr = parseInt(bgReplaceTarget.slice(1, 3), 16);
      const tg = parseInt(bgReplaceTarget.slice(3, 5), 16);
      const tb = parseInt(bgReplaceTarget.slice(5, 7), 16);

      for (let i = 0; i < data.length; i += 4) {
        const dist = Math.hypot(data[i] - keyR, data[i + 1] - keyG, data[i + 2] - keyB);
        if (dist <= bgReplaceTolerance) {
          if (makeTransparent) {
            data[i + 3] = 0;
          } else {
            data[i] = tr;
            data[i + 1] = tg;
            data[i + 2] = tb;
          }
        }
      }
      ctx.putImageData(imgData, 0, 0);
      const newImg = await FabricImage.fromURL(off.toDataURL('image/png'));
      newImg.set({
        left: active.left,
        top: active.top,
        scaleX: active.scaleX,
        scaleY: active.scaleY,
        angle: active.angle,
      });
      ensureMeta(newImg, (active as MetaObj).name || 'Edited Image');
      const idx = canvas.getObjects().indexOf(active);
      canvas.remove(active);
      canvas.insertAt(idx, newImg);
      canvas.setActiveObject(newImg);
      canvas.requestRenderAll();
      syncLayersFromCanvas();
      pushHistory('Replace Image Background');
      flashNotice(makeTransparent ? 'Background removed' : 'Background color replaced');
    };

    // Layer panel operations
    const findObjectById = (id: string): FabricObject | undefined =>
      fabricRef.current?.getObjects().find((o) => (o as MetaObj).id === id);

    const handleSelectLayer = (id: string) => {
      const canvas = fabricRef.current;
      const obj = findObjectById(id);
      if (!canvas || !obj) return;
      if (!(obj as MetaObj).locked) {
        canvas.setActiveObject(obj);
      } else {
        canvas.discardActiveObject();
      }
      canvas.requestRenderAll();
      setSelectedLayerId(id);
      syncSelectionInspector();
    };

    const handleToggleVisibility = (id: string) => {
      const canvas = fabricRef.current;
      const obj = findObjectById(id);
      if (!canvas || !obj) return;
      obj.set('visible', obj.visible === false);
      canvas.requestRenderAll();
      syncLayersFromCanvas();
      pushHistory('Toggle Layer Visibility');
    };

    const handleToggleLock = (id: string) => {
      const canvas = fabricRef.current;
      const obj = findObjectById(id);
      if (!canvas || !obj) return;
      const m = obj as MetaObj;
      const nextLocked = !m.locked;
      m.locked = nextLocked;
      obj.set({
        selectable: !nextLocked,
        evented: !nextLocked,
        lockMovementX: nextLocked,
        lockMovementY: nextLocked,
        lockRotation: nextLocked,
        lockScalingX: nextLocked,
        lockScalingY: nextLocked,
      });
      if (nextLocked && canvas.getActiveObject() === obj) {
        canvas.discardActiveObject();
      }
      canvas.requestRenderAll();
      syncLayersFromCanvas();
      pushHistory(nextLocked ? 'Lock Layer' : 'Unlock Layer');
    };

    const handleReorderLayer = (id: string, dir: 'up' | 'down') => {
      const canvas = fabricRef.current;
      const obj = findObjectById(id);
      if (!canvas || !obj) return;
      if (dir === 'up') canvas.bringObjectForward(obj);
      else canvas.sendObjectBackwards(obj);
      canvas.requestRenderAll();
      syncLayersFromCanvas();
      pushHistory('Reorder Layer');
    };

    const handleDeleteLayerById = (id: string) => {
      const canvas = fabricRef.current;
      const obj = findObjectById(id);
      if (!canvas || !obj) return;
      canvas.remove(obj);
      canvas.discardActiveObject();
      canvas.requestRenderAll();
      syncLayersFromCanvas();
      syncSelectionInspector();
      pushHistory('Delete Layer');
    };

    const handleCommitRename = (id: string) => {
      const obj = findObjectById(id);
      if (obj && renameDraft.trim()) {
        (obj as MetaObj).name = renameDraft.trim();
        syncLayersFromCanvas();
        pushHistory('Rename Layer');
      }
      setRenamingId(null);
    };

    const handleManualSave = () => {
      const canvas = fabricRef.current;
      if (!canvas) return;
      const jsonObj = canvas.toObject(EXTRA_PROPS);
      const thumb = canvas.toDataURL({ format: 'png', multiplier: 0.4 });
      const objs = canvas.getObjects();
      const paletteSet = new Set<string>();
      objs.forEach((o) => collectObjectColors(o, paletteSet));
      onPersistProject({
        canvasJson: jsonObj,
        thumbnailDataUrl: thumb,
        backgroundColor: String(canvas.backgroundColor || '#FFFFFF'),
        width: canvas.getWidth(),
        height: canvas.getHeight(),
        isVector: objs.every((o) => !(o instanceof FabricImage)),
        palette: Array.from(paletteSet).slice(0, 6),
      });
      flashNotice('Project saved');
    };

    // Imperative API for App / Generator / Assistant
    useImperativeHandle(ref, () => ({
      loadSvgPattern: async (svgMarkup, title, bgColor, w = 800, h = 800) => {
        const canvas = fabricRef.current;
        if (!canvas) return;
        isRestoringHistoryRef.current = true;
        try {
          canvas.clear();
          canvas.setDimensions({ width: w, height: h });
          setCanvasWidth(w);
          setCanvasHeight(h);
          setDraftCanvasW(w);
          setDraftCanvasH(h);
          canvas.backgroundColor = bgColor || '#FFFFFF';
          setCanvasBg(bgColor || '#FFFFFF');

          const { objects, options } = await loadSVGFromString(svgMarkup);
          const valid = objects.filter((o): o is FabricObject => Boolean(o));
          valid.forEach((obj, i) => {
            ensureMeta(obj, `${title || 'Motif'} #${i + 1}`);
            canvas.add(obj);
          });
          if (valid.length === 0 && options) {
            flashNotice('Loaded empty SVG');
          }
          canvas.requestRenderAll();
        } finally {
          isRestoringHistoryRef.current = false;
          syncLayersFromCanvas();
          pushHistory('Load AI Vector Pattern');
        }
      },

      loadRasterPattern: async (imageUrl, title, w = 1024, h = 1024) => {
        const canvas = fabricRef.current;
        if (!canvas) return;
        isRestoringHistoryRef.current = true;
        try {
          canvas.clear();
          canvas.setDimensions({ width: w, height: h });
          setCanvasWidth(w);
          setCanvasHeight(h);
          setDraftCanvasW(w);
          setDraftCanvasH(h);
          const img = await FabricImage.fromURL(imageUrl, { crossOrigin: 'anonymous' });
          const scale = Math.max(w / (img.width || 1), h / (img.height || 1));
          img.set({ left: 0, top: 0, scaleX: scale, scaleY: scale });
          ensureMeta(img, title || 'Pattern Print');
          canvas.add(img);
          canvas.requestRenderAll();
        } finally {
          isRestoringHistoryRef.current = false;
          syncLayersFromCanvas();
          pushHistory('Load Pattern Image');
        }
      },

      loadProject: async (project) => {
        const canvas = fabricRef.current;
        if (!canvas) return;
        isRestoringHistoryRef.current = true;
        try {
          canvas.clear();
          canvas.setDimensions({ width: project.width || 800, height: project.height || 800 });
          setCanvasWidth(project.width || 800);
          setCanvasHeight(project.height || 800);
          canvas.backgroundColor = project.backgroundColor || '#FFFFFF';
          setCanvasBg(project.backgroundColor || '#FFFFFF');
          if (project.canvasJson) {
            await canvas.loadFromJSON(project.canvasJson);
          } else if (project.svgSource) {
            const { objects } = await loadSVGFromString(project.svgSource);
            objects
              .filter((o): o is FabricObject => Boolean(o))
              .forEach((o, i) => {
                ensureMeta(o, `${project.name} #${i + 1}`);
                canvas.add(o);
              });
          } else if (project.previewImageUrl || project.thumbnailDataUrl) {
            const img = await FabricImage.fromURL(
              project.previewImageUrl || project.thumbnailDataUrl,
              { crossOrigin: 'anonymous' }
            );
            const scale = Math.max(
              (project.width || 800) / (img.width || 1),
              (project.height || 800) / (img.height || 1)
            );
            img.set({ left: 0, top: 0, scaleX: scale, scaleY: scale });
            ensureMeta(img, project.name);
            canvas.add(img);
          }
          canvas.requestRenderAll();
        } finally {
          isRestoringHistoryRef.current = false;
          syncLayersFromCanvas();
        }
      },

      exportPng: (multiplier, transparent) => {
        const canvas = fabricRef.current;
        if (!canvas) return null;
        const prevBg = canvas.backgroundColor;
        if (transparent) {
          canvas.backgroundColor = '';
          canvas.requestRenderAll();
        }
        const url = canvas.toDataURL({ format: 'png', multiplier });
        if (transparent) {
          canvas.backgroundColor = prevBg;
          canvas.requestRenderAll();
        }
        return url;
      },

      exportJpg: (multiplier, quality) => {
        const canvas = fabricRef.current;
        if (!canvas) return null;
        return canvas.toDataURL({ format: 'jpeg', multiplier, quality });
      },

      exportSvg: () => {
        const canvas = fabricRef.current;
        if (!canvas) return null;
        return canvas.toSVG();
      },

      getCanvasSnapshot: () => {
        const canvas = fabricRef.current;
        if (!canvas) return null;
        const objs = canvas.getObjects().filter((o) => o !== cropRectRef.current);
        const paletteSet = new Set<string>();
        objs.forEach((o) => collectObjectColors(o, paletteSet));
        return {
          width: canvas.getWidth(),
          height: canvas.getHeight(),
          backgroundColor: String(canvas.backgroundColor || '#FFFFFF'),
          canvasJson: canvas.toObject(EXTRA_PROPS),
          thumbnailDataUrl: canvas.toDataURL({ format: 'png', multiplier: 0.45 }),
          isVectorOnly: objs.every((o) => !(o instanceof FabricImage)),
          summary: {
            width: canvas.getWidth(),
            height: canvas.getHeight(),
            backgroundColor: String(canvas.backgroundColor || '#FFFFFF'),
            objectCount: objs.length,
            objects: objs.slice(0, 30).map((o) => ({
              name: (o as MetaObj).name || o.type || 'object',
              type: o.type || 'object',
              fill: typeof o.fill === 'string' ? o.fill : undefined,
              stroke: typeof o.stroke === 'string' ? o.stroke : undefined,
            })),
            palette: Array.from(paletteSet).slice(0, 8),
          },
        };
      },

      applyAssistantOperations: async (ops) => {
        const canvas = fabricRef.current;
        if (!canvas) return [];
        const applied: string[] = [];

        for (const op of ops) {
          if (op.type === 'set_background') {
            canvas.backgroundColor = op.color;
            setCanvasBg(op.color);
            // Also update full-bleed background rect if present at index 0
            const first = canvas.getObjects()[0];
            if (
              first instanceof Rect &&
              (first.getScaledWidth() >= canvas.getWidth() * 0.95) &&
              (first.getScaledHeight() >= canvas.getHeight() * 0.95)
            ) {
              first.set('fill', op.color);
            }
            applied.push(`Changed background to ${op.color}`);
          } else if (op.type === 'recolor_objects') {
            const objs = canvas.getObjects();
            objs.forEach((o, i) => {
              if (i === 0 && o instanceof Rect && o.getScaledWidth() >= canvas.getWidth() * 0.95) {
                return;
              }
              recolorObjectRecursive(o, op.toColor, op.fromColor);
            });
            applied.push(`Recolored motifs to ${op.toColor}`);
          } else if (op.type === 'apply_palette') {
            canvas.backgroundColor = op.background;
            setCanvasBg(op.background);
            const objs = canvas.getObjects();
            objs.forEach((o, idx) => {
              if (idx === 0 && o instanceof Rect && o.getScaledWidth() >= canvas.getWidth() * 0.95) {
                o.set('fill', op.background);
                return;
              }
              if (op.colors.length > 0) {
                recolorObjectRecursive(o, op.colors[idx % op.colors.length]);
              }
            });
            applied.push(`Applied palette (${op.background}, ${op.colors.join(', ')})`);
          } else if (op.type === 'add_svg_motif' && op.svgMarkup) {
            const { objects, options } = await loadSVGFromString(op.svgMarkup);
            const valid = objects.filter((o): o is FabricObject => Boolean(o));
            if (valid.length > 0) {
              const group = util.groupSVGElements(valid, options);
              const targetScale = op.scale ?? 0.55;
              group.scaleToWidth(canvas.getWidth() * targetScale);
              group.set({
                left: (canvas.getWidth() - group.getScaledWidth()) / 2,
                top: (canvas.getHeight() - group.getScaledHeight()) / 2,
                opacity: op.opacity ?? 0.92,
              });
              ensureMeta(group, op.name || 'AI Decorative Motif');
              canvas.add(group);
              applied.push(`Added ${op.name || 'decorative motif'}`);
            }
          } else if (op.type === 'adjust_filters') {
            const objs = canvas.getObjects();
            objs.forEach((o) => {
              if (o instanceof FabricImage) {
                const list: filters.BaseFilter<string>[] = [];
                if (op.brightness) list.push(new filters.Brightness({ brightness: op.brightness }));
                if (op.contrast) list.push(new filters.Contrast({ contrast: op.contrast }));
                if (op.saturation) list.push(new filters.Saturation({ saturation: op.saturation }));
                if (op.hue) list.push(new filters.HueRotation({ rotation: op.hue }));
                o.filters = list;
                o.applyFilters();
              }
            });
            applied.push('Adjusted tonal & image filters');
          } else if (op.type === 'make_symmetrical') {
            const objs = canvas.getObjects().filter((o) => !(o instanceof Rect && o.getScaledWidth() >= canvas.getWidth() * 0.95));
            const clones: FabricObject[] = [];
            for (const o of objs.slice(0, 12)) {
              const cx = canvas.getWidth();
              const cy = canvas.getHeight();
              if (op.mode === 'mirror-x' || op.mode === '4-way') {
                const c = await o.clone();
                c.set({
                  flipX: !o.flipX,
                  left: cx - (o.left ?? 0) - o.getScaledWidth(),
                });
                ensureMeta(c, `${(o as MetaObj).name || 'Motif'} Mirror-X`);
                clones.push(c);
              }
              if (op.mode === 'mirror-y' || op.mode === '4-way') {
                const c = await o.clone();
                c.set({
                  flipY: !o.flipY,
                  top: cy - (o.top ?? 0) - o.getScaledHeight(),
                });
                ensureMeta(c, `${(o as MetaObj).name || 'Motif'} Mirror-Y`);
                clones.push(c);
              }
            }
            clones.forEach((c) => canvas.add(c));
            applied.push(`Applied ${op.mode} symmetry`);
          } else if (op.type === 'set_style_preset') {
            if (op.preset === 'luxury') {
              canvas.backgroundColor = '#0F172A';
              setCanvasBg('#0F172A');
              const frame = new Rect({
                left: 24,
                top: 24,
                width: canvas.getWidth() - 48,
                height: canvas.getHeight() - 48,
                fill: 'transparent',
                stroke: '#D4AF37',
                strokeWidth: 4,
              });
              ensureMeta(frame, 'Luxury Gold Border');
              canvas.add(frame);
              applied.push('Applied luxury gold & midnight frame');
            } else if (op.preset === 'minimalist') {
              canvas.backgroundColor = '#F8FAFC';
              setCanvasBg('#F8FAFC');
              canvas.getObjects().forEach((o) => o.set('opacity', 0.88));
              applied.push('Applied clean minimalist surface tone');
            } else if (op.preset === 'silk-sheen') {
              canvas.getObjects().forEach((o) => {
                if (o instanceof FabricImage) {
                  o.filters = [
                    new filters.Contrast({ contrast: 0.14 }),
                    new filters.Saturation({ saturation: 0.12 }),
                  ];
                  o.applyFilters();
                }
              });
              applied.push('Enhanced silk contrast & lustre');
            }
          }
        }

        canvas.requestRenderAll();
        syncLayersFromCanvas();
        syncSelectionInspector();
        pushHistory('AI Design Assistant Edit');
        return applied;
      },
    }));

    const selectedObj = fabricRef.current?.getActiveObject();
    const isTextSelected = selectedObj instanceof IText;
    const isImageSelected = selectedObj instanceof FabricImage;

    const toolButtons: Array<{ id: EditorTool; label: string; icon: React.ReactNode; action?: () => void }> = [
      { id: 'select', label: 'Select', icon: <MousePointer2 className="w-4 h-4" /> },
      { id: 'move', label: 'Move / Pan', icon: <Move className="w-4 h-4" /> },
      { id: 'crop', label: 'Crop', icon: <Crop className="w-4 h-4" />, action: startCrop },
      {
        id: 'resize',
        label: 'Resize',
        icon: <Scaling className="w-4 h-4" />,
        action: () => setShowResizeBox((v) => !v),
      },
      {
        id: 'rotate',
        label: 'Rotate +15°',
        icon: <RotateCw className="w-4 h-4" />,
        action: () => handleRotateStep(15),
      },
      { id: 'brush', label: 'Brush', icon: <Pencil className="w-4 h-4" /> },
      { id: 'eraser', label: 'Eraser', icon: <Eraser className="w-4 h-4" /> },
      {
        id: 'text',
        label: 'Text',
        icon: <TypeIcon className="w-4 h-4" />,
        action: () => addLayerObject('text'),
      },
      {
        id: 'shape',
        label: 'Motif Shape',
        icon: <Shapes className="w-4 h-4" />,
        action: () => addLayerObject('shape'),
      },
      {
        id: 'rect',
        label: 'Rectangle',
        icon: <Square className="w-4 h-4" />,
        action: () => addLayerObject('rect'),
      },
      {
        id: 'circle',
        label: 'Circle',
        icon: <CircleIcon className="w-4 h-4" />,
        action: () => addLayerObject('circle'),
      },
      {
        id: 'line',
        label: 'Line',
        icon: <Minus className="w-4 h-4" />,
        action: () => addLayerObject('line'),
      },
      { id: 'eyedropper', label: 'Color Picker', icon: <Pipette className="w-4 h-4" /> },
      { id: 'fill', label: 'Fill Tool', icon: <PaintBucket className="w-4 h-4" /> },
    ];

    return (
      <div
        className={`flex flex-col h-full bg-zinc-100 dark:bg-zinc-950 ${
          isFullscreen ? 'fixed inset-0 z-40' : 'rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden'
        }`}
      >
        {/* Top Editor Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 disabled:opacity-40 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleRedo}
              disabled={historyIndex >= historyEntries.length - 1}
              className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 disabled:opacity-40 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              title="Redo (Ctrl+Shift+Z)"
            >
              <Redo2 className="w-4 h-4" />
            </button>
            <div className="h-5 w-px bg-zinc-200 dark:bg-zinc-800 mx-1" />
            <button
              type="button"
              onClick={() => handleFlip('X')}
              disabled={!selectedLayerId}
              className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 disabled:opacity-40 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              title="Flip Horizontal"
            >
              <FlipHorizontal2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => handleFlip('Y')}
              disabled={!selectedLayerId}
              className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 disabled:opacity-40 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              title="Flip Vertical"
            >
              <FlipVertical2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleDuplicateSelected}
              disabled={!selectedLayerId}
              className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 disabled:opacity-40 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              title="Duplicate Selected"
            >
              <Copy className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleDeleteSelected}
              disabled={!selectedLayerId}
              className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 disabled:opacity-40 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
              title="Delete Selected"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            <div className="h-5 w-px bg-zinc-200 dark:bg-zinc-800 mx-1" />

            {/* Contextual Tool Options */}
            {(activeTool === 'brush' || activeTool === 'eraser') && (
              <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-xs">
                <span>Size</span>
                <input
                  type="range"
                  min={2}
                  max={48}
                  value={brushSize}
                  onChange={(e) => setBrushSize(Number(e.target.value))}
                  className="w-20 accent-violet-600"
                />
                <span className="font-mono tabular-nums w-7">{brushSize}px</span>
                {activeTool === 'eraser' && (
                  <select
                    value={eraserMode}
                    onChange={(e) => setEraserMode(e.target.value as 'paint' | 'object')}
                    className="px-1.5 py-0.5 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs"
                  >
                    <option value="paint">Stroke Eraser</option>
                    <option value="object">Click Erase Layer</option>
                  </select>
                )}
              </div>
            )}

            {activeTool === 'shape' && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-xs">
                {(['star', 'diamond', 'hexagon', 'triangle'] as const).map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setShapeKind(k)}
                    className={`px-2 py-0.5 rounded capitalize ${
                      shapeKind === k ? 'bg-violet-600 text-white' : 'hover:bg-zinc-200 dark:hover:bg-zinc-700'
                    }`}
                  >
                    {k}
                  </button>
                ))}
              </div>
            )}

            {isCropping && (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-violet-50 dark:bg-violet-950/50 border border-violet-200 dark:border-violet-800">
                <span className="text-xs font-medium text-violet-700 dark:text-violet-300">
                  Adjust crop box
                </span>
                <button
                  type="button"
                  onClick={applyCrop}
                  className="px-2.5 py-1 text-xs font-medium rounded bg-violet-600 text-white hover:bg-violet-700"
                >
                  Apply Crop
                </button>
                <button
                  type="button"
                  onClick={cancelCrop}
                  className="px-2 py-1 text-xs rounded border border-zinc-300 dark:border-zinc-700"
                >
                  Cancel
                </button>
              </div>
            )}

            {statusNotice && (
              <span className="text-xs font-medium text-violet-700 dark:text-violet-300 px-2">
                {statusNotice}
              </span>
            )}
          </div>

          {/* Right Viewport Controls */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setShowGrid((v) => !v)}
              className={`p-2 rounded-lg border text-xs ${
                showGrid
                  ? 'border-violet-600 bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300'
                  : 'border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
              title="Toggle Grid"
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setShowRulers((v) => !v)}
              className={`p-2 rounded-lg border text-xs ${
                showRulers
                  ? 'border-violet-600 bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300'
                  : 'border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
              title="Toggle Rulers"
            >
              <Ruler className="w-4 h-4" />
            </button>
            <div className="flex items-center border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(0.2, Math.round((z - 0.1) * 100) / 100))}
                className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={fitToScreen}
                className="px-2 py-1 text-xs font-mono tabular-nums hover:bg-zinc-100 dark:hover:bg-zinc-800"
                title="Fit to Screen"
              >
                {Math.round(zoom * 100)}%
              </button>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(3, Math.round((z + 0.1) * 100) / 100))}
                className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
            <button
              type="button"
              onClick={() => setIsFullscreen((v) => !v)}
              className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              title="Toggle Fullscreen"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={() => {
                const c = fabricRef.current;
                if (!c) return;
                const objs = c.getObjects();
                const isVec = objs.every((o) => !(o instanceof FabricImage));
                onSendToSeamless(
                  c.toDataURL({ format: 'png', multiplier: 1 }),
                  isVec ? c.toSVG() : undefined
                );
              }}
              className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 whitespace-nowrap"
            >
              Test Seamless
            </button>
            <button
              type="button"
              onClick={() => {
                const c = fabricRef.current;
                if (!c) return;
                onSendToMockups(c.toDataURL({ format: 'png', multiplier: 1 }));
              }}
              className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 whitespace-nowrap"
            >
              Mockups
            </button>
            <button
              type="button"
              onClick={handleManualSave}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90 whitespace-nowrap"
            >
              <Save className="w-3.5 h-3.5" />
              Save
            </button>
            <button
              type="button"
              onClick={onOpenExportModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-violet-600 text-white hover:bg-violet-700 whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              Export
            </button>
          </div>
        </div>

        {/* Main 3-Column Studio Body */}
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* Left Vertical Editing Toolbar */}
          <div className="w-13 sm:w-14 shrink-0 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 flex flex-col items-center py-2 gap-1 overflow-y-auto">
            {toolButtons.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  if (t.action) t.action();
                  else setActiveTool(t.id);
                }}
                title={t.label}
                className={`w-10 h-10 flex items-center justify-center rounded-lg transition-colors ${
                  activeTool === t.id
                    ? 'bg-violet-600 text-white shadow-xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100'
                }`}
              >
                {t.icon}
              </button>
            ))}

            <div className="w-8 h-px bg-zinc-200 dark:bg-zinc-800 my-1" />

            {/* Active Swatches */}
            <label className="cursor-pointer flex flex-col items-center gap-1" title="Primary Fill Color">
              <input
                type="color"
                value={activeColor}
                onChange={(e) => setActiveColor(e.target.value)}
                className="sr-only"
              />
              <span
                className="w-7 h-7 rounded-md border-2 border-white dark:border-zinc-800 shadow-xs ring-1 ring-zinc-300 dark:ring-zinc-700"
                style={{ backgroundColor: activeColor }}
              />
            </label>
            <label className="cursor-pointer flex flex-col items-center gap-1 mt-1" title="Stroke Color">
              <input
                type="color"
                value={strokeColor}
                onChange={(e) => setStrokeColor(e.target.value)}
                className="sr-only"
              />
              <span
                className="w-6 h-6 rounded-full border-2 shadow-xs"
                style={{ borderColor: strokeColor, backgroundColor: 'transparent' }}
              />
            </label>
          </div>

          {/* Center Interactive Canvas Stage */}
          <div
            ref={containerRef}
            className="flex-1 relative overflow-auto bg-zinc-200/75 dark:bg-zinc-950 flex items-center justify-center p-8 select-none"
          >
            {/* Top & Left Rulers */}
            {showRulers && (
              <>
                <div
                  className="pointer-events-none absolute top-0 left-6 right-0 h-5 bg-white/90 dark:bg-zinc-900/90 border-b border-zinc-300 dark:border-zinc-800 flex items-end text-[9px] font-mono text-zinc-500 overflow-hidden z-10"
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <div
                      key={i}
                      className="shrink-0 border-l border-zinc-300 dark:border-zinc-700 pl-1 h-3"
                      style={{ width: `${Math.round(100 * zoom)}px` }}
                    >
                      {i * 100}
                    </div>
                  ))}
                </div>
                <div
                  className="pointer-events-none absolute top-5 left-0 bottom-0 w-6 bg-white/90 dark:bg-zinc-900/90 border-r border-zinc-300 dark:border-zinc-800 flex flex-col text-[9px] font-mono text-zinc-500 overflow-hidden z-10"
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <div
                      key={i}
                      className="shrink-0 border-t border-zinc-300 dark:border-zinc-700 pt-0.5 pl-0.5"
                      style={{ height: `${Math.round(100 * zoom)}px` }}
                    >
                      {i * 100}
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Canvas Resize Popover */}
            {showResizeBox && (
              <div className="absolute top-4 left-4 z-30 w-64 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xl space-y-3 text-xs">
                <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                  Canvas Dimensions (px)
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-zinc-500 block mb-1">Width</label>
                    <input
                      type="number"
                      min={200}
                      max={2400}
                      value={draftCanvasW}
                      onChange={(e) => setDraftCanvasW(Number(e.target.value))}
                      className="w-full px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-zinc-500 block mb-1">Height</label>
                    <input
                      type="number"
                      min={200}
                      max={2400}
                      value={draftCanvasH}
                      onChange={(e) => setDraftCanvasH(Number(e.target.value))}
                      className="w-full px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 font-mono"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => setShowResizeBox(false)}
                    className="px-2.5 py-1 rounded border border-zinc-200 dark:border-zinc-700"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const c = fabricRef.current;
                      if (!c) return;
                      const w = Math.max(200, Math.min(2400, draftCanvasW));
                      const h = Math.max(200, Math.min(2400, draftCanvasH));
                      c.setDimensions({ width: w, height: h });
                      setCanvasWidth(w);
                      setCanvasHeight(h);
                      c.requestRenderAll();
                      setShowResizeBox(false);
                      pushHistory(`Resize Canvas (${w}×${h})`);
                    }}
                    className="px-2.5 py-1 rounded bg-violet-600 text-white"
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}

            {/* Zoomed Canvas Artboard */}
            <div
              className="relative shadow-2xl ring-1 ring-black/10 dark:ring-white/10 checkerboard-bg"
              style={{
                width: canvasWidth * zoom,
                height: canvasHeight * zoom,
                transform: `translate(${panOffset.x}px, ${panOffset.y}px)`,
              }}
            >
              <div
                style={{
                  transform: `scale(${zoom})`,
                  transformOrigin: 'top left',
                  width: canvasWidth,
                  height: canvasHeight,
                }}
              >
                <canvas ref={canvasElRef} />
              </div>

              {/* Optional Grid Overlay */}
              {showGrid && (
                <div
                  className="pointer-events-none absolute inset-0"
                  style={{
                    backgroundImage:
                      'linear-gradient(to right, rgba(124,58,237,0.18) 1px, transparent 1px), linear-gradient(to bottom, rgba(124,58,237,0.18) 1px, transparent 1px)',
                    backgroundSize: `${40 * zoom}px ${40 * zoom}px`,
                  }}
                />
              )}
            </div>

            {/* Bottom Canvas Dimension Readout */}
            <div className="pointer-events-none absolute bottom-3 left-8 px-2.5 py-1 rounded-md bg-white/90 dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 text-[11px] font-mono tabular-nums text-zinc-600 dark:text-zinc-400">
              {canvasWidth} × {canvasHeight} px · {layers.length} layers
            </div>
          </div>

          {/* Right Studio Panel (Layers / Inspector / Palette / History) */}
          <div className="w-72 lg:w-80 shrink-0 bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 flex flex-col min-h-0">
            <div className="grid grid-cols-4 border-b border-zinc-200 dark:border-zinc-800 text-xs font-medium">
              {[
                { id: 'layers', label: 'Layers', icon: <Layers className="w-3.5 h-3.5" /> },
                { id: 'inspector', label: 'Adjust', icon: <SlidersHorizontal className="w-3.5 h-3.5" /> },
                { id: 'palette', label: 'Colors', icon: <Palette className="w-3.5 h-3.5" /> },
                { id: 'history', label: 'History', icon: <History className="w-3.5 h-3.5" /> },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setRightTab(tab.id as typeof rightTab)}
                  className={`flex flex-col items-center gap-1 py-2.5 border-b-2 transition-colors ${
                    rightTab === tab.id
                      ? 'border-violet-600 text-violet-600 dark:text-violet-400'
                      : 'border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-3.5">
              {/* TAB 1: LAYERS */}
              {rightTab === 'layers' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                      Canvas Layers ({layers.length})
                    </span>
                    <div className="flex items-center gap-1">
                      <input
                        ref={uploadLayerInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleUploadImageLayer}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => uploadLayerInputRef.current?.click()}
                        className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        title="Import Image as New Layer"
                      >
                        <ImagePlus className="w-3.5 h-3.5" />
                        Image
                      </button>
                      <button
                        type="button"
                        onClick={() => addLayerObject('rect')}
                        className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded bg-violet-600 text-white hover:bg-violet-700"
                        title="Add New Shape Layer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Layer
                      </button>
                    </div>
                  </div>

                  {/* Canvas Background Quick Control */}
                  <div className="flex items-center justify-between p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60 text-xs">
                    <span className="text-zinc-600 dark:text-zinc-400">Canvas Background</span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="color"
                        value={canvasBg === 'transparent' ? '#FFFFFF' : canvasBg}
                        onChange={(e) => {
                          const c = fabricRef.current;
                          if (!c) return;
                          c.backgroundColor = e.target.value;
                          setCanvasBg(e.target.value);
                          c.requestRenderAll();
                          pushHistory('Change Background');
                        }}
                        className="w-6 h-6 rounded cursor-pointer border border-zinc-300 dark:border-zinc-700"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const c = fabricRef.current;
                          if (!c) return;
                          const next = canvasBg === 'transparent' ? '#FFFFFF' : 'transparent';
                          c.backgroundColor = next === 'transparent' ? '' : next;
                          setCanvasBg(next);
                          c.requestRenderAll();
                          pushHistory('Toggle Transparent Background');
                        }}
                        className="px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-700 text-[11px]"
                      >
                        {canvasBg === 'transparent' ? 'Solid' : 'Clear'}
                      </button>
                    </div>
                  </div>

                  {layers.length === 0 ? (
                    <div className="py-8 text-center text-xs text-zinc-500">
                      No layers yet. Add shapes, text, brush strokes, or import an image.
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {layers.map((layer) => (
                        <div
                          key={layer.id}
                          onClick={() => handleSelectLayer(layer.id)}
                          className={`group flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                            selectedLayerId === layer.id
                              ? 'border-violet-600 bg-violet-50/70 dark:bg-violet-950/40'
                              : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/60'
                          }`}
                        >
                          <span
                            className="w-3.5 h-3.5 rounded-xs shrink-0 border border-black/15"
                            style={{ backgroundColor: layer.fill || '#94A3B8' }}
                          />
                          <div className="flex-1 min-w-0">
                            {renamingId === layer.id ? (
                              <input
                                type="text"
                                autoFocus
                                value={renameDraft}
                                onChange={(e) => setRenameDraft(e.target.value)}
                                onBlur={() => handleCommitRename(layer.id)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleCommitRename(layer.id);
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className="w-full px-1 py-0.5 rounded border border-violet-500 bg-white dark:bg-zinc-900 text-xs"
                              />
                            ) : (
                              <div
                                onDoubleClick={(e) => {
                                  e.stopPropagation();
                                  setRenamingId(layer.id);
                                  setRenameDraft(layer.name);
                                }}
                                className="font-medium truncate text-zinc-800 dark:text-zinc-200"
                                title="Double-click to rename"
                              >
                                {layer.name}
                              </div>
                            )}
                            <div className="text-[10px] text-zinc-400 capitalize">
                              {layer.type} · {layer.opacity}%
                            </div>
                          </div>

                          <div
                            className="flex items-center gap-0.5 shrink-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => handleReorderLayer(layer.id, 'up')}
                              className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-500"
                              title="Bring Forward"
                            >
                              <ArrowUp className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleReorderLayer(layer.id, 'down')}
                              className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-500"
                              title="Send Backward"
                            >
                              <ArrowDown className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleVisibility(layer.id)}
                              className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-500"
                              title={layer.visible ? 'Hide Layer' : 'Show Layer'}
                            >
                              {layer.visible ? (
                                <Eye className="w-3.5 h-3.5" />
                              ) : (
                                <EyeOff className="w-3.5 h-3.5 text-amber-500" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleLock(layer.id)}
                              className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-500"
                              title={layer.locked ? 'Unlock' : 'Lock'}
                            >
                              {layer.locked ? (
                                <Lock className="w-3.5 h-3.5 text-violet-600" />
                              ) : (
                                <Unlock className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteLayerById(layer.id)}
                              className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-950/60 text-zinc-400 hover:text-red-600"
                              title="Delete Layer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: INSPECTOR (Transform, Text, Image Adjustments) */}
              {rightTab === 'inspector' && (
                <div className="space-y-4 text-xs">
                  {!selectedLayerId ? (
                    <div className="py-10 text-center text-zinc-500">
                      Select any layer on the canvas to adjust transform, colors, typography, or
                      image filters.
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2.5">
                        <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                          Transform & Appearance
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[11px] text-zinc-500 block mb-1">Width (px)</label>
                            <input
                              type="number"
                              value={objW}
                              onChange={(e) => {
                                const val = Math.max(4, Number(e.target.value));
                                setObjW(val);
                                const c = fabricRef.current;
                                const o = c?.getActiveObject();
                                if (c && o && o.width) {
                                  o.set('scaleX', val / o.width);
                                  c.requestRenderAll();
                                }
                              }}
                              className="w-full px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 font-mono tabular-nums"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] text-zinc-500 block mb-1">Height (px)</label>
                            <input
                              type="number"
                              value={objH}
                              onChange={(e) => {
                                const val = Math.max(4, Number(e.target.value));
                                setObjH(val);
                                const c = fabricRef.current;
                                const o = c?.getActiveObject();
                                if (c && o && o.height) {
                                  o.set('scaleY', val / o.height);
                                  c.requestRenderAll();
                                }
                              }}
                              className="w-full px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 font-mono tabular-nums"
                            />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-zinc-500">Opacity</span>
                            <span className="font-mono tabular-nums">{objOpacity}%</span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={100}
                            value={objOpacity}
                            onChange={(e) => {
                              const v = Number(e.target.value);
                              setObjOpacity(v);
                              const c = fabricRef.current;
                              const o = c?.getActiveObject();
                              if (c && o) {
                                o.set('opacity', v / 100);
                                c.requestRenderAll();
                              }
                            }}
                            onMouseUp={() => pushHistory('Adjust Opacity')}
                            className="w-full accent-violet-600"
                          />
                        </div>

                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-zinc-500">Rotation</span>
                            <span className="font-mono tabular-nums">{objAngle}°</span>
                          </div>
                          <input
                            type="range"
                            min={-180}
                            max={180}
                            value={objAngle}
                            onChange={(e) => {
                              const v = Number(e.target.value);
                              setObjAngle(v);
                              const c = fabricRef.current;
                              const o = c?.getActiveObject();
                              if (c && o) {
                                o.rotate(v);
                                c.requestRenderAll();
                              }
                            }}
                            onMouseUp={() => pushHistory('Rotate Object')}
                            className="w-full accent-violet-600"
                          />
                        </div>

                        {!isImageSelected && (
                          <div className="flex items-center justify-between pt-1">
                            <span className="text-zinc-500">Fill Color</span>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={objFill}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  setObjFill(v);
                                  const c = fabricRef.current;
                                  const o = c?.getActiveObject();
                                  if (c && o) {
                                    recolorObjectRecursive(o, v);
                                    c.requestRenderAll();
                                    syncLayersFromCanvas();
                                  }
                                }}
                                className="w-7 h-7 rounded cursor-pointer border border-zinc-200 dark:border-zinc-700"
                              />
                              <span className="font-mono">{objFill}</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Text Editing Controls */}
                      {isTextSelected && (
                        <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 space-y-2.5">
                          <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                            Typography Controls
                          </div>
                          <select
                            value={textFont}
                            onChange={(e) => {
                              const f = e.target.value;
                              setTextFont(f);
                              const c = fabricRef.current;
                              const o = c?.getActiveObject();
                              if (c && o instanceof IText) {
                                o.set('fontFamily', f);
                                c.requestRenderAll();
                                pushHistory('Change Font');
                              }
                            }}
                            className="w-full px-2 py-1.5 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950"
                          >
                            {FONT_FAMILIES.map((f) => (
                              <option key={f} value={f}>
                                {f}
                              </option>
                            ))}
                          </select>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[11px] text-zinc-500 block mb-1">Size</label>
                              <input
                                type="number"
                                min={10}
                                max={220}
                                value={textSize}
                                onChange={(e) => {
                                  const s = Number(e.target.value);
                                  setTextSize(s);
                                  const c = fabricRef.current;
                                  const o = c?.getActiveObject();
                                  if (c && o instanceof IText) {
                                    o.set('fontSize', s);
                                    c.requestRenderAll();
                                  }
                                }}
                                className="w-full px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 font-mono"
                              />
                            </div>
                            <div>
                              <label className="text-[11px] text-zinc-500 block mb-1">
                                Letter Spacing
                              </label>
                              <input
                                type="number"
                                min={-100}
                                max={800}
                                step={20}
                                value={textSpacing}
                                onChange={(e) => {
                                  const sp = Number(e.target.value);
                                  setTextSpacing(sp);
                                  const c = fabricRef.current;
                                  const o = c?.getActiveObject();
                                  if (c && o instanceof IText) {
                                    o.set('charSpacing', sp);
                                    c.requestRenderAll();
                                  }
                                }}
                                className="w-full px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 font-mono"
                              />
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                const next = !textBold;
                                setTextBold(next);
                                const c = fabricRef.current;
                                const o = c?.getActiveObject();
                                if (c && o instanceof IText) {
                                  o.set('fontWeight', next ? 'bold' : 'normal');
                                  c.requestRenderAll();
                                  pushHistory('Toggle Bold');
                                }
                              }}
                              className={`p-1.5 rounded border ${
                                textBold
                                  ? 'bg-violet-600 text-white border-violet-600'
                                  : 'border-zinc-200 dark:border-zinc-700'
                              }`}
                            >
                              <Bold className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const next = !textItalic;
                                setTextItalic(next);
                                const c = fabricRef.current;
                                const o = c?.getActiveObject();
                                if (c && o instanceof IText) {
                                  o.set('fontStyle', next ? 'italic' : 'normal');
                                  c.requestRenderAll();
                                  pushHistory('Toggle Italic');
                                }
                              }}
                              className={`p-1.5 rounded border ${
                                textItalic
                                  ? 'bg-violet-600 text-white border-violet-600'
                                  : 'border-zinc-200 dark:border-zinc-700'
                              }`}
                            >
                              <Italic className="w-3.5 h-3.5" />
                            </button>
                            {(['left', 'center', 'right'] as const).map((al) => (
                              <button
                                key={al}
                                type="button"
                                onClick={() => {
                                  setTextAlign(al);
                                  const c = fabricRef.current;
                                  const o = c?.getActiveObject();
                                  if (c && o instanceof IText) {
                                    o.set('textAlign', al);
                                    c.requestRenderAll();
                                    pushHistory('Align Text');
                                  }
                                }}
                                className={`p-1.5 rounded border ${
                                  textAlign === al
                                    ? 'bg-violet-600 text-white border-violet-600'
                                    : 'border-zinc-200 dark:border-zinc-700'
                                }`}
                              >
                                {al === 'left' ? (
                                  <AlignLeft className="w-3.5 h-3.5" />
                                ) : al === 'center' ? (
                                  <AlignCenter className="w-3.5 h-3.5" />
                                ) : (
                                  <AlignRight className="w-3.5 h-3.5" />
                                )}
                              </button>
                            ))}
                            <button
                              type="button"
                              onClick={() => {
                                const next = !textShadowOn;
                                setTextShadowOn(next);
                                const c = fabricRef.current;
                                const o = c?.getActiveObject();
                                if (c && o instanceof IText) {
                                  o.set(
                                    'shadow',
                                    next
                                      ? new Shadow({
                                          color: 'rgba(0,0,0,0.45)',
                                          blur: 10,
                                          offsetX: 3,
                                          offsetY: 4,
                                        })
                                      : null
                                  );
                                  c.requestRenderAll();
                                  pushHistory('Toggle Text Shadow');
                                }
                              }}
                              className={`ml-auto px-2 py-1 rounded border text-[11px] ${
                                textShadowOn
                                  ? 'bg-violet-600 text-white border-violet-600'
                                  : 'border-zinc-200 dark:border-zinc-700'
                              }`}
                            >
                              Shadow
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Raster Image Adjustments */}
                      {isImageSelected && (
                        <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                              Image Adjustments
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                applyImageFilters({
                                  brightness: 0,
                                  contrast: 0,
                                  saturation: 0,
                                  hue: 0,
                                  blur: 0,
                                  sharpness: 0,
                                })
                              }
                              className="text-[11px] text-violet-600 hover:underline"
                            >
                              Reset
                            </button>
                          </div>

                          {[
                            { key: 'brightness', label: 'Brightness', min: -0.6, max: 0.6, step: 0.02 },
                            { key: 'contrast', label: 'Contrast', min: -0.6, max: 0.6, step: 0.02 },
                            { key: 'saturation', label: 'Saturation', min: -1, max: 1, step: 0.05 },
                            { key: 'hue', label: 'Hue Shift', min: -1, max: 1, step: 0.05 },
                            { key: 'blur', label: 'Blur', min: 0, max: 0.8, step: 0.02 },
                            { key: 'sharpness', label: 'Sharpness', min: 0, max: 1, step: 0.05 },
                          ].map((ctrl) => {
                            const k = ctrl.key as keyof typeof imgFilters;
                            return (
                              <div key={ctrl.key}>
                                <div className="flex justify-between mb-0.5">
                                  <span className="text-zinc-500">{ctrl.label}</span>
                                  <span className="font-mono tabular-nums">
                                    {imgFilters[k].toFixed(2)}
                                  </span>
                                </div>
                                <input
                                  type="range"
                                  min={ctrl.min}
                                  max={ctrl.max}
                                  step={ctrl.step}
                                  value={imgFilters[k]}
                                  onChange={(e) =>
                                    applyImageFilters({
                                      ...imgFilters,
                                      [k]: Number(e.target.value),
                                    })
                                  }
                                  onMouseUp={() => pushHistory(`Adjust ${ctrl.label}`)}
                                  className="w-full accent-violet-600"
                                />
                              </div>
                            );
                          })}

                          <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 space-y-2">
                            <span className="font-medium text-zinc-800 dark:text-zinc-200 block">
                              Background Color Replacement
                            </span>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={bgReplaceTarget}
                                onChange={(e) => setBgReplaceTarget(e.target.value)}
                                className="w-7 h-7 rounded cursor-pointer border border-zinc-200 dark:border-zinc-700"
                              />
                              <input
                                type="range"
                                min={10}
                                max={90}
                                value={bgReplaceTolerance}
                                onChange={(e) => setBgReplaceTolerance(Number(e.target.value))}
                                className="flex-1 accent-violet-600"
                                title="Tolerance"
                              />
                              <span className="font-mono w-7">{bgReplaceTolerance}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleReplaceImageBg(false)}
                                className="py-1.5 px-2 rounded border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                              >
                                Replace Color
                              </button>
                              <button
                                type="button"
                                onClick={() => handleReplaceImageBg(true)}
                                className="py-1.5 px-2 rounded border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                              >
                                Make Transparent
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* TAB 3: COLOR PALETTE STUDIO */}
              {rightTab === 'palette' && (
                <ColorPaletteStudio
                  activeColor={activeColor}
                  onChangeActiveColor={(hex) => {
                    setActiveColor(hex);
                    const c = fabricRef.current;
                    const o = c?.getActiveObject();
                    if (c && o && !(o instanceof FabricImage)) {
                      recolorObjectRecursive(o, hex);
                      setObjFill(hex);
                      c.requestRenderAll();
                      syncLayersFromCanvas();
                    }
                  }}
                  palettes={palettes}
                  onSavePalette={onSavePalette}
                  onDeletePalette={onDeletePalette}
                  onToggleFavoritePalette={onToggleFavoritePalette}
                  onApplyPaletteToCanvas={(pal) => {
                    const c = fabricRef.current;
                    if (!c) return;
                    c.backgroundColor = pal.background;
                    setCanvasBg(pal.background);
                    c.getObjects().forEach((o, idx) => {
                      if (
                        idx === 0 &&
                        o instanceof Rect &&
                        o.getScaledWidth() >= c.getWidth() * 0.95
                      ) {
                        o.set('fill', pal.background);
                        return;
                      }
                      if (pal.colors.length > 0 && !(o instanceof FabricImage)) {
                        recolorObjectRecursive(o, pal.colors[idx % pal.colors.length]);
                      }
                    });
                    c.requestRenderAll();
                    syncLayersFromCanvas();
                    pushHistory('Apply Color Palette');
                    flashNotice('Applied palette to canvas');
                  }}
                  onApplyGradientToCanvas={(start, end) => {
                    const c = fabricRef.current;
                    const o = c?.getActiveObject();
                    if (!c || !o || o instanceof FabricImage) {
                      flashNotice('Select a vector/shape layer first');
                      return;
                    }
                    const grad = new Gradient({
                      type: 'linear',
                      coords: { x1: 0, y1: 0, x2: o.width ?? 100, y2: o.height ?? 100 },
                      colorStops: [
                        { offset: 0, color: start },
                        { offset: 1, color: end },
                      ],
                    });
                    o.set('fill', grad);
                    c.requestRenderAll();
                    pushHistory('Apply Gradient');
                  }}
                />
              )}

              {/* TAB 4: EDITING HISTORY */}
              {rightTab === 'history' && (
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                      Edit History ({historyEntries.length})
                    </span>
                    <span className="text-[11px] text-zinc-400">Click to restore</span>
                  </div>
                  <div className="space-y-1">
                    {historyEntries
                      .slice()
                      .reverse()
                      .map((entry, revIdx) => {
                        const actualIdx = historyEntries.length - 1 - revIdx;
                        const active = actualIdx === historyIndex;
                        return (
                          <button
                            key={entry.id}
                            type="button"
                            onClick={() => jumpToHistory(actualIdx)}
                            className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg border text-left transition-colors ${
                              active
                                ? 'border-violet-600 bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300'
                                : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/60'
                            }`}
                          >
                            <span className="font-medium truncate">{entry.label}</span>
                            <span className="font-mono text-[10px] text-zinc-400 shrink-0 ml-2">
                              {entry.timestamp}
                            </span>
                          </button>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
);

ProfessionalEditor.displayName = 'ProfessionalEditor';
