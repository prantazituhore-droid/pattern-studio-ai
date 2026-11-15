import { ColorPalette, StudioProject, StudioSettings } from '../types/studio';
import { STUDIO_TEMPLATES } from '../data/templates';

const DB_NAME = 'pattern-studio-ai-db';
const DB_VERSION = 1;
const STORE_PROJECTS = 'projects';
const STORE_PALETTES = 'palettes';
const SETTINGS_KEY = 'pattern-studio-ai-settings';

export const DEFAULT_SETTINGS: StudioSettings = {
  theme: 'light',
  autoSave: true,
  showGridByDefault: false,
  showRulersByDefault: true,
  defaultCanvasWidth: 800,
  defaultCanvasHeight: 800,
  defaultExportQuality: 0.92,
};

export const DEFAULT_PALETTES: ColorPalette[] = [
  {
    id: 'pal-royal-silk',
    name: 'Royal Emerald & Gold',
    background: '#064E3B',
    colors: ['#D4AF37', '#FDE68A', '#991B1B', '#ECFDF5'],
    harmony: 'complementary',
    favorite: true,
    createdAt: '2026-11-01T10:00:00.000Z',
  },
  {
    id: 'pal-studio-violet',
    name: 'Studio Violet & Cobalt',
    background: '#0F172A',
    colors: ['#7C3AED', '#3B82F6', '#C4B5FD', '#F8FAFC'],
    harmony: 'analogous',
    favorite: true,
    createdAt: '2026-11-02T10:00:00.000Z',
  },
  {
    id: 'pal-banarasi-rose',
    name: 'Banarasi Crimson & Zari',
    background: '#581C33',
    colors: ['#D4AF37', '#FDE68A', '#F43F5E', '#FFF1F2'],
    harmony: 'custom',
    favorite: false,
    createdAt: '2026-11-03T10:00:00.000Z',
  },
  {
    id: 'pal-nordic-stone',
    name: 'Nordic Alabaster & Slate',
    background: '#F8FAFC',
    colors: ['#1E293B', '#64748B', '#2563EB', '#A78BFA'],
    harmony: 'monochromatic',
    favorite: false,
    createdAt: '2026-11-04T10:00:00.000Z',
  },
];

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_PROJECTS)) {
        db.createObjectStore(STORE_PROJECTS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_PALETTES)) {
        db.createObjectStore(STORE_PALETTES, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getAllFromStore<T>(storeName: string): Promise<T[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.getAll();
    req.onsuccess = () => resolve((req.result as T[]) ?? []);
    req.onerror = () => reject(req.error);
  });
}

async function putInStore<T>(storeName: string, item: T): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.put(item);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function deleteFromStore(storeName: string, id: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function initializeProjects(): Promise<StudioProject[]> {
  try {
    let items = await getAllFromStore<StudioProject>(STORE_PROJECTS);
    if (items.length === 0) {
      const seededFlag = localStorage.getItem('pattern-studio-seeded');
      if (!seededFlag) {
        const now = new Date().toISOString();
        const seedTemplates = [STUDIO_TEMPLATES[4], STUDIO_TEMPLATES[0], STUDIO_TEMPLATES[1]];
        const seeded: StudioProject[] = seedTemplates.map((tpl, i) => ({
          id: `proj-seed-${i + 1}`,
          name: tpl.name.replace(' (Vector)', ''),
          category: tpl.category,
          style: tpl.style,
          width: tpl.width,
          height: tpl.height,
          backgroundColor: tpl.backgroundColor,
          canvasJson: null,
          thumbnailDataUrl: tpl.imageUrl,
          previewImageUrl: tpl.isVector ? undefined : tpl.imageUrl,
          svgSource: tpl.svgMarkup,
          isVector: tpl.isVector,
          repeatMethod: tpl.repeatMethod,
          palette: tpl.palette,
          favorite: i === 0,
          createdAt: now,
          updatedAt: now,
        }));
        for (const p of seeded) {
          await putInStore(STORE_PROJECTS, p);
        }
        localStorage.setItem('pattern-studio-seeded', '1');
        items = seeded;
      }
    }
    return items.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  } catch {
    return [];
  }
}

export async function saveProjectToDb(project: StudioProject): Promise<void> {
  const updated: StudioProject = {
    ...project,
    updatedAt: new Date().toISOString(),
  };
  await putInStore(STORE_PROJECTS, updated);
}

export async function deleteProjectFromDb(id: string): Promise<void> {
  await deleteFromStore(STORE_PROJECTS, id);
}

export async function initializePalettes(): Promise<ColorPalette[]> {
  try {
    let palettes = await getAllFromStore<ColorPalette>(STORE_PALETTES);
    if (palettes.length === 0) {
      for (const p of DEFAULT_PALETTES) {
        await putInStore(STORE_PALETTES, p);
      }
      palettes = DEFAULT_PALETTES;
    }
    return palettes;
  } catch {
    return DEFAULT_PALETTES;
  }
}

export async function savePaletteToDb(palette: ColorPalette): Promise<void> {
  await putInStore(STORE_PALETTES, palette);
}

export async function deletePaletteFromDb(id: string): Promise<void> {
  await deleteFromStore(STORE_PALETTES, id);
}

export function loadSettings(): StudioSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: StudioSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export async function estimateStorageStats(): Promise<{ projectCount: number; paletteCount: number; approxKb: number }> {
  const projects = await getAllFromStore<StudioProject>(STORE_PROJECTS);
  const palettes = await getAllFromStore<ColorPalette>(STORE_PALETTES);
  const bytes = new Blob([JSON.stringify(projects), JSON.stringify(palettes)]).size;
  return {
    projectCount: projects.length,
    paletteCount: palettes.length,
    approxKb: Math.round(bytes / 1024),
  };
}
