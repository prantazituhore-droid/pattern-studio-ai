export type NavSection =
  | 'dashboard'
  | 'generator'
  | 'editor'
  | 'seamless'
  | 'assistant'
  | 'projects'
  | 'templates'
  | 'favorites'
  | 'settings';

export const PATTERN_CATEGORIES = [
  'Textile and Fabric',
  'Saree Design',
  'Three-Piece Design',
  'Fashion and Clothing',
  'Floral and Botanical',
  'Geometric',
  'Abstract',
  'Islamic Art',
  'Mandala',
  'Wallpaper',
  'Interior Decoration',
  'Floor and Wall Tiles',
  'Luxury Patterns',
  'Minimalist Patterns',
  'Vintage Patterns',
  'Traditional Patterns',
  'Modern Patterns',
  'Packaging',
  'Branding',
  'Custom Patterns',
] as const;

export type PatternCategory = (typeof PATTERN_CATEGORIES)[number];

export const DESIGN_STYLES = [
  'Royal Mughal & Silk Brocade',
  'Jamdani & Handloom Weave',
  'Banarasi Zari Ornamental',
  'Botanical Fine Line Illustration',
  'Geometric Bauhaus',
  'Islamic Girih Tessellation',
  'Sacred Mandala Filigree',
  'Minimalist Nordic Organic',
  'Art Deco Luxury',
  'Heritage Arts & Crafts',
  'Contemporary Abstract',
  'Watercolor & Gouache',
] as const;

export type AspectRatioOption = '1:1' | '3:4' | '4:3' | '16:9' | '9:16' | 'custom';

export type RepeatMethod =
  | 'grid'
  | 'brick'
  | 'half-drop'
  | 'mirror'
  | 'horizontal'
  | 'vertical';

export type SymmetryMode =
  | 'none'
  | 'bilateral'
  | '4-way'
  | '8-way'
  | 'radial';

export interface GenerationParams {
  prompt: string;
  category: PatternCategory;
  style: string;
  mainColor: string;
  secondaryColor: string;
  backgroundColor: string;
  density: 'sparse' | 'balanced' | 'dense' | 'intricate';
  scale: 'micro' | 'small' | 'medium' | 'large';
  spacing: 'tight' | 'comfortable' | 'airy';
  symmetry: SymmetryMode;
  texture: 'smooth-vector' | 'silk-sheen' | 'linen-weave' | 'matte-ceramic' | 'gold-foil';
  complexity: 'minimal' | 'moderate' | 'rich' | 'ornate';
  detailLevel: 'clean' | 'detailed' | 'ultra-fine';
  orientation: 'upright' | 'diagonal-45' | 'omnidirectional';
  repetitionMethod: RepeatMethod;
  aspectRatio: AspectRatioOption;
  customWidth: number;
  customHeight: number;
  variations: 1 | 2 | 4;
  engine: 'vector-hydrogen' | 'raster-image';
  referenceImageDataUrl?: string;
}

export interface GeneratedPatternResult {
  id: string;
  title: string;
  designNotes: string;
  paletteUsed: string[];
  seamlessEdgeReady: boolean;
  isVector: boolean;
  svgMarkup?: string;
  dataUrl: string;
  width: number;
  height: number;
  category: PatternCategory;
  style: string;
  createdAt: string;
}

export interface ColorPalette {
  id: string;
  name: string;
  colors: string[];
  background: string;
  harmony: 'custom' | 'complementary' | 'analogous' | 'monochromatic' | 'triadic' | 'extracted';
  favorite: boolean;
  createdAt: string;
}

export interface StudioProject {
  id: string;
  name: string;
  category: PatternCategory;
  style: string;
  width: number;
  height: number;
  backgroundColor: string;
  canvasJson: Record<string, unknown> | null;
  thumbnailDataUrl: string;
  previewImageUrl?: string;
  svgSource?: string;
  isVector: boolean;
  repeatMethod: RepeatMethod;
  palette: string[];
  favorite: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StudioTemplate {
  id: string;
  name: string;
  category: PatternCategory;
  style: string;
  description: string;
  imageUrl: string;
  isVector: boolean;
  svgMarkup?: string;
  palette: string[];
  backgroundColor: string;
  repeatMethod: RepeatMethod;
  width: number;
  height: number;
}

export interface StudioSettings {
  theme: 'light' | 'dark';
  autoSave: boolean;
  showGridByDefault: boolean;
  showRulersByDefault: boolean;
  defaultCanvasWidth: number;
  defaultCanvasHeight: number;
  defaultExportQuality: number;
}

export type AssistantOperation =
  | { type: 'set_background'; color: string }
  | { type: 'recolor_objects'; fromColor?: string; toColor: string; target?: 'all' | 'accent' | 'primary' }
  | { type: 'apply_palette'; background: string; colors: string[] }
  | { type: 'add_svg_motif'; name: string; svgMarkup: string; scale?: number; opacity?: number }
  | { type: 'adjust_filters'; brightness?: number; contrast?: number; saturation?: number; hue?: number }
  | { type: 'make_symmetrical'; mode: 'mirror-x' | 'mirror-y' | '4-way' }
  | { type: 'set_style_preset'; preset: 'minimalist' | 'luxury' | 'silk-sheen' }
  | {
      type: 'generate_color_variations';
      variations: Array<{ name: string; background: string; colors: string[] }>;
    };

export interface AssistantChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  operations?: AssistantOperation[];
  appliedSummary?: string[];
  timestamp: string;
}

export interface LayerItem {
  id: string;
  name: string;
  type: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
  fill?: string;
  index: number;
}

export interface HistoryEntry {
  id: string;
  label: string;
  timestamp: string;
  json: string;
}
