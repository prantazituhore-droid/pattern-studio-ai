import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  FolderKanban,
  Grid,
  Heart,
  Layers,
  LayoutDashboard,
  LayoutTemplate,
  Menu,
  MessageSquare,
  Moon,
  Settings,
  Sparkles,
  Sun,
  X,
} from 'lucide-react';
import {
  ColorPalette,
  GeneratedPatternResult,
  NavSection,
  StudioProject,
  StudioSettings,
  StudioTemplate,
} from './types/studio';
import { STUDIO_TEMPLATES } from './data/templates';
import {
  DEFAULT_SETTINGS,
  deletePaletteFromDb,
  deleteProjectFromDb,
  estimateStorageStats,
  initializePalettes,
  initializeProjects,
  loadSettings,
  savePaletteToDb,
  saveProjectToDb,
  saveSettings,
} from './services/projectStorage';
import { EditorHandle, ProfessionalEditor } from './components/ProfessionalEditor';
import { AiPatternGenerator } from './components/AiPatternGenerator';
import { SeamlessAndMockupStudio } from './components/SeamlessAndMockupStudio';
import { AiDesignAssistant } from './components/AiDesignAssistant';
import { ExportModal } from './components/ExportModal';
import {
  DashboardView,
  FavoritesView,
  ProjectsView,
  SettingsView,
  TemplatesView,
} from './components/ProjectsAndLibraryViews';

const NAV_ITEMS: Array<{ id: NavSection; label: string; icon: React.ReactNode }> = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
  { id: 'generator', label: 'AI Pattern Generator', icon: <Sparkles className="w-4 h-4" /> },
  { id: 'editor', label: 'Professional Editor', icon: <Layers className="w-4 h-4" /> },
  { id: 'seamless', label: 'Seamless Pattern Studio', icon: <Grid className="w-4 h-4" /> },
  { id: 'assistant', label: 'AI Design Assistant', icon: <MessageSquare className="w-4 h-4" /> },
  { id: 'projects', label: 'My Projects', icon: <FolderKanban className="w-4 h-4" /> },
  { id: 'templates', label: 'My Templates', icon: <LayoutTemplate className="w-4 h-4" /> },
  { id: 'favorites', label: 'Favorites', icon: <Heart className="w-4 h-4" /> },
  { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
];

export default function App() {
  const [activeNav, setActiveNav] = useState<NavSection>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const [settings, setSettings] = useState<StudioSettings>(() => loadSettings());
  const [projects, setProjects] = useState<StudioProject[]>([]);
  const [palettes, setPalettes] = useState<ColorPalette[]>([]);
  const [activeProject, setActiveProject] = useState<StudioProject | null>(null);
  const [seamlessSourceUrl, setSeamlessSourceUrl] = useState<string>(STUDIO_TEMPLATES[0].imageUrl);
  const [seamlessSourceTitle, setSeamlessSourceTitle] = useState<string>(STUDIO_TEMPLATES[0].name);
  const [seamlessInitialTab, setSeamlessInitialTab] = useState<'seamless' | 'mockups'>('seamless');

  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportState, setExportState] = useState({ isVectorOnly: true, width: 800, height: 800 });

  const [serverHealth, setServerHealth] = useState<{
    hasApiKey: boolean;
    vectorModel: string;
    rasterModel: string;
    rasterRequiresPaidKey: boolean;
  } | null>(null);
  const [storageStats, setStorageStats] = useState<{
    projectCount: number;
    paletteCount: number;
    approxKb: number;
  } | null>(null);

  const editorRef = useRef<EditorHandle | null>(null);

  // Sync HTML .dark class with settings.theme
  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    saveSettings(settings);
  }, [settings]);

  // Load initial projects, palettes, and server capabilities
  useEffect(() => {
    initializeProjects().then((loaded) => {
      setProjects(loaded);
      if (loaded.length > 0) {
        setActiveProject(loaded[0]);
        setSeamlessSourceUrl(loaded[0].thumbnailDataUrl);
        setSeamlessSourceTitle(loaded[0].name);
      } else {
        const blank: StudioProject = {
          id: `proj-${Date.now()}`,
          name: 'Untitled Studio Pattern',
          category: 'Textile and Fabric',
          style: 'Royal Mughal & Silk Brocade',
          width: DEFAULT_SETTINGS.defaultCanvasWidth,
          height: DEFAULT_SETTINGS.defaultCanvasHeight,
          backgroundColor: '#FFFFFF',
          canvasJson: null,
          thumbnailDataUrl: STUDIO_TEMPLATES[4].imageUrl,
          svgSource: STUDIO_TEMPLATES[4].svgMarkup,
          isVector: true,
          repeatMethod: 'grid',
          palette: ['#7C3AED', '#2563EB', '#D4AF37'],
          favorite: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setProjects([blank]);
        setActiveProject(blank);
        saveProjectToDb(blank);
      }
    });

    initializePalettes().then(setPalettes);

    fetch('/api/health')
      .then((r) => r.json())
      .then(setServerHealth)
      .catch(() => null);
  }, []);

  useEffect(() => {
    if (activeNav === 'settings') {
      estimateStorageStats().then(setStorageStats).catch(() => null);
    }
  }, [activeNav, projects, palettes]);

  const persistActiveProjectUpdates = useCallback(
    (updates: Partial<StudioProject>) => {
      setActiveProject((prev) => {
        if (!prev) return prev;
        const next: StudioProject = {
          ...prev,
          ...updates,
          updatedAt: new Date().toISOString(),
        };
        saveProjectToDb(next);
        setProjects((list) => {
          const exists = list.some((item) => item.id === next.id);
          return exists
            ? list.map((item) => (item.id === next.id ? next : item))
            : [next, ...list];
        });
        return next;
      });
    },
    []
  );

  const createBlankProject = async () => {
    const now = new Date().toISOString();
    const blank: StudioProject = {
      id: `proj-${Date.now()}`,
      name: `Pattern Design ${projects.length + 1}`,
      category: 'Custom Patterns',
      style: 'Geometric Bauhaus',
      width: settings.defaultCanvasWidth,
      height: settings.defaultCanvasHeight,
      backgroundColor: '#FFFFFF',
      canvasJson: null,
      thumbnailDataUrl:
        'data:image/svg+xml;base64,' +
        btoa('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="400" height="400" fill="#FFFFFF"/></svg>'),
      isVector: true,
      repeatMethod: 'grid',
      palette: ['#7C3AED', '#2563EB'],
      favorite: false,
      createdAt: now,
      updatedAt: now,
    };
    await saveProjectToDb(blank);
    setProjects((prev) => [blank, ...prev]);
    setActiveProject(blank);
    setActiveNav('editor');
  };

  const openGeneratedInEditor = async (pat: GeneratedPatternResult) => {
    const now = new Date().toISOString();
    const proj: StudioProject = {
      id: `proj-${Date.now()}`,
      name: pat.title,
      category: pat.category,
      style: pat.style,
      width: pat.width,
      height: pat.height,
      backgroundColor: pat.paletteUsed[2] || '#FFFFFF',
      canvasJson: null,
      thumbnailDataUrl: pat.dataUrl,
      previewImageUrl: pat.isVector ? undefined : pat.dataUrl,
      svgSource: pat.svgMarkup,
      isVector: pat.isVector,
      repeatMethod: 'grid',
      palette: pat.paletteUsed,
      favorite: false,
      createdAt: now,
      updatedAt: now,
    };
    await saveProjectToDb(proj);
    setProjects((prev) => [proj, ...prev]);
    setActiveProject(proj);
    setActiveNav('editor');
  };

  const saveGeneratedAsProject = async (pat: GeneratedPatternResult) => {
    const now = new Date().toISOString();
    const proj: StudioProject = {
      id: `proj-${Date.now()}`,
      name: pat.title,
      category: pat.category,
      style: pat.style,
      width: pat.width,
      height: pat.height,
      backgroundColor: pat.paletteUsed[2] || '#FFFFFF',
      canvasJson: null,
      thumbnailDataUrl: pat.dataUrl,
      previewImageUrl: pat.isVector ? undefined : pat.dataUrl,
      svgSource: pat.svgMarkup,
      isVector: pat.isVector,
      repeatMethod: 'grid',
      palette: pat.paletteUsed,
      favorite: false,
      createdAt: now,
      updatedAt: now,
    };
    await saveProjectToDb(proj);
    setProjects((prev) => [proj, ...prev]);
  };

  const handleUseTemplate = async (
    tpl: StudioTemplate,
    target: 'editor' | 'seamless' | 'mockups'
  ) => {
    if (target === 'seamless' || target === 'mockups') {
      setSeamlessSourceUrl(tpl.imageUrl);
      setSeamlessSourceTitle(tpl.name);
      setSeamlessInitialTab(target);
      setActiveNav('seamless');
      return;
    }

    const now = new Date().toISOString();
    const proj: StudioProject = {
      id: `proj-${Date.now()}`,
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
      favorite: false,
      createdAt: now,
      updatedAt: now,
    };
    await saveProjectToDb(proj);
    setProjects((prev) => [proj, ...prev]);
    setActiveProject(proj);
    setActiveNav('editor');
  };

  const handleOpenExport = () => {
    const snap = editorRef.current?.getCanvasSnapshot();
    if (snap) {
      setExportState({
        isVectorOnly: snap.isVectorOnly,
        width: snap.width,
        height: snap.height,
      });
    } else if (activeProject) {
      setExportState({
        isVectorOnly: activeProject.isVector,
        width: activeProject.width,
        height: activeProject.height,
      });
    }
    setExportModalOpen(true);
  };

  const triggerDownload = (href: string, filename: string) => {
    const a = document.createElement('a');
    a.href = href;
    a.download = filename;
    a.click();
  };

  const activeNavTitle =
    NAV_ITEMS.find((n) => n.id === activeNav)?.label ?? 'Pattern Studio AI';

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      {/* Desktop Collapsible Sidebar */}
      <aside
        className={`hidden md:flex flex-col shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 transition-[width] duration-200 ${
          sidebarCollapsed ? 'w-[68px]' : 'w-64'
        }`}
      >
        <div className="h-14 px-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-2">
          {!sidebarCollapsed && (
            <span className="font-display font-bold text-base tracking-tight whitespace-nowrap truncate">
              Pattern Studio AI
            </span>
          )}
          <button
            type="button"
            onClick={() => setSidebarCollapsed((c) => !c)}
            className="p-1.5 rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 ml-auto"
            title={sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {sidebarCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>

        <nav className="flex-1 p-2.5 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const active = activeNav === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveNav(item.id)}
                title={sidebarCollapsed ? item.label : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-violet-600 text-white shadow-xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100'
                }`}
              >
                <span className="shrink-0">{item.icon}</span>
                {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Mobile Drawer Navigation */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setMobileNavOpen(false)}
          />
          <aside className="relative w-64 max-w-[80vw] bg-white dark:bg-zinc-900 h-full border-r border-zinc-200 dark:border-zinc-800 flex flex-col">
            <div className="h-14 px-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <span className="font-display font-bold text-base">Pattern Studio AI</span>
              <button
                type="button"
                onClick={() => setMobileNavOpen(false)}
                className="p-1.5 rounded-lg text-zinc-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveNav(item.id);
                    setMobileNavOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium ${
                    activeNav === item.id
                      ? 'bg-violet-600 text-white'
                      : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>
          </aside>
        </div>
      )}

      {/* Main Content Shell */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Top Bar (Clean 3-Zone Contract) */}
        <header className="h-14 shrink-0 px-4 sm:px-6 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className="md:hidden p-2 rounded-lg border border-zinc-200 dark:border-zinc-700"
              aria-label="Open navigation"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 text-sm min-w-0">
              <span className="font-semibold text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                {activeNavTitle}
              </span>
              {activeProject && (
                <>
                  <span className="text-zinc-300 dark:text-zinc-700 hidden sm:inline">/</span>
                  <span className="text-xs text-zinc-500 truncate max-w-[200px] hidden sm:inline">
                    {activeProject.name}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() =>
                setSettings((s) => ({
                  ...s,
                  theme: s.theme === 'dark' ? 'light' : 'dark',
                }))
              }
              className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              title="Toggle Light / Dark Mode"
            >
              {settings.theme === 'dark' ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </button>
            <button
              type="button"
              onClick={handleOpenExport}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-violet-600 text-white text-xs font-medium hover:bg-violet-700 whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              Export
            </button>
          </div>
        </header>

        {/* Central Design Workspace */}
        <main
          className={`flex-1 min-h-0 ${
            activeNav === 'editor' ? 'p-3 sm:p-4 flex flex-col' : 'p-4 sm:p-6 lg:p-8 overflow-y-auto'
          }`}
        >
          {activeNav === 'dashboard' && (
            <DashboardView
              projects={projects}
              templates={STUDIO_TEMPLATES}
              onNavigate={setActiveNav}
              onCreateBlankProject={createBlankProject}
              onOpenProject={(proj) => {
                setActiveProject(proj);
                setActiveNav('editor');
              }}
              onUseTemplate={handleUseTemplate}
            />
          )}

          {activeNav === 'generator' && (
            <AiPatternGenerator
              serverHealth={serverHealth}
              onOpenInEditor={openGeneratedInEditor}
              onOpenInSeamless={(pat) => {
                setSeamlessSourceUrl(pat.dataUrl);
                setSeamlessSourceTitle(pat.title);
                setSeamlessInitialTab('seamless');
                setActiveNav('seamless');
              }}
              onOpenInMockups={(pat) => {
                setSeamlessSourceUrl(pat.dataUrl);
                setSeamlessSourceTitle(pat.title);
                setSeamlessInitialTab('mockups');
                setActiveNav('seamless');
              }}
              onSaveAsProject={saveGeneratedAsProject}
            />
          )}

          {/* Keep ProfessionalEditor mounted so AI Assistant and Export always access the live Fabric.js canvas */}
          {activeProject && (
            <div className={activeNav === 'editor' ? 'flex-1 min-h-[620px] flex flex-col' : 'hidden'}>
              <ProfessionalEditor
                isActive={activeNav === 'editor'}
                ref={editorRef}
                activeProject={activeProject}
                palettes={palettes}
                autoSave={settings.autoSave}
                initialShowGrid={settings.showGridByDefault}
                initialShowRulers={settings.showRulersByDefault}
                onSavePalette={async (pal) => {
                  await savePaletteToDb(pal);
                  setPalettes((prev) => [pal, ...prev]);
                }}
                onDeletePalette={async (id) => {
                  await deletePaletteFromDb(id);
                  setPalettes((prev) => prev.filter((p) => p.id !== id));
                }}
                onToggleFavoritePalette={async (id) => {
                  setPalettes((prev) =>
                    prev.map((p) => {
                      if (p.id !== id) return p;
                      const updated = { ...p, favorite: !p.favorite };
                      savePaletteToDb(updated);
                      return updated;
                    })
                  );
                }}
                onPersistProject={persistActiveProjectUpdates}
                onOpenExportModal={handleOpenExport}
                onSendToSeamless={(dataUrl) => {
                  setSeamlessSourceUrl(dataUrl);
                  setSeamlessSourceTitle(activeProject.name);
                  setSeamlessInitialTab('seamless');
                  setActiveNav('seamless');
                }}
                onSendToMockups={(dataUrl) => {
                  setSeamlessSourceUrl(dataUrl);
                  setSeamlessSourceTitle(activeProject.name);
                  setSeamlessInitialTab('mockups');
                  setActiveNav('seamless');
                }}
              />
            </div>
          )}

          {activeNav === 'seamless' && (
            <SeamlessAndMockupStudio
              sourceImageUrl={seamlessSourceUrl}
              sourceTitle={seamlessSourceTitle}
              initialRepeatMethod={activeProject?.repeatMethod || 'grid'}
              initialSubTab={seamlessInitialTab}
              onSendTileToEditor={async (tileUrl, title) => {
                const now = new Date().toISOString();
                const proj: StudioProject = {
                  id: `proj-${Date.now()}`,
                  name: title,
                  category: 'Textile and Fabric',
                  style: 'Seamless Repeat Tile',
                  width: 800,
                  height: 800,
                  backgroundColor: '#FFFFFF',
                  canvasJson: null,
                  thumbnailDataUrl: tileUrl,
                  previewImageUrl: tileUrl,
                  isVector: false,
                  repeatMethod: 'grid',
                  palette: [],
                  favorite: false,
                  createdAt: now,
                  updatedAt: now,
                };
                await saveProjectToDb(proj);
                setProjects((prev) => [proj, ...prev]);
                setActiveProject(proj);
                setActiveNav('editor');
              }}
            />
          )}

          {activeNav === 'assistant' && activeProject && (
            <AiDesignAssistant
              projectName={activeProject.name}
              previewImageUrl={activeProject.thumbnailDataUrl}
              getCanvasSummary={() => {
                const snap = editorRef.current?.getCanvasSnapshot();
                if (snap) {
                  return { summary: snap.summary, thumbnailDataUrl: snap.thumbnailDataUrl };
                }
                return {
                  summary: {
                    width: activeProject.width,
                    height: activeProject.height,
                    backgroundColor: activeProject.backgroundColor,
                    objectCount: 1,
                    objects: [{ name: activeProject.name, type: activeProject.isVector ? 'vector' : 'image' }],
                    palette: activeProject.palette,
                  },
                  thumbnailDataUrl: activeProject.thumbnailDataUrl,
                };
              }}
              onApplyOperations={async (ops) => {
                if (editorRef.current) {
                  return editorRef.current.applyAssistantOperations(ops);
                }
                // If editor is not currently mounted, apply palette/background directly to activeProject and navigate to editor to execute full canvas ops
                const summary: string[] = [];
                for (const op of ops) {
                  if (op.type === 'set_background') {
                    persistActiveProjectUpdates({ backgroundColor: op.color });
                    summary.push(`Updated project background to ${op.color}`);
                  } else if (op.type === 'apply_palette') {
                    persistActiveProjectUpdates({
                      backgroundColor: op.background,
                      palette: op.colors,
                    });
                    summary.push(`Applied color palette (${op.colors.join(', ')})`);
                  } else {
                    summary.push(`Queued "${op.type}" — open Professional Editor to inspect layer edit`);
                  }
                }
                return summary;
              }}
              onOpenEditor={() => setActiveNav('editor')}
            />
          )}

          {activeNav === 'projects' && (
            <ProjectsView
              projects={projects}
              activeProjectId={activeProject?.id ?? ''}
              onOpenProject={(proj) => {
                setActiveProject(proj);
                setActiveNav('editor');
              }}
              onOpenSeamless={(proj) => {
                setSeamlessSourceUrl(proj.thumbnailDataUrl);
                setSeamlessSourceTitle(proj.name);
                setSeamlessInitialTab('seamless');
                setActiveNav('seamless');
              }}
              onCreateBlankProject={createBlankProject}
              onRenameProject={(id, name) => {
                setProjects((prev) =>
                  prev.map((p) => {
                    if (p.id !== id) return p;
                    const updated = { ...p, name };
                    saveProjectToDb(updated);
                    return updated;
                  })
                );
                if (activeProject?.id === id) {
                  setActiveProject((p) => (p ? { ...p, name } : p));
                }
              }}
              onDuplicateProject={async (proj) => {
                const copy: StudioProject = {
                  ...proj,
                  id: `proj-${Date.now()}`,
                  name: `${proj.name} Copy`,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                };
                await saveProjectToDb(copy);
                setProjects((prev) => [copy, ...prev]);
              }}
              onToggleFavorite={(id) => {
                setProjects((prev) =>
                  prev.map((p) => {
                    if (p.id !== id) return p;
                    const updated = { ...p, favorite: !p.favorite };
                    saveProjectToDb(updated);
                    return updated;
                  })
                );
              }}
              onDeleteProject={async (id) => {
                await deleteProjectFromDb(id);
                setProjects((prev) => prev.filter((p) => p.id !== id));
              }}
              onImportProjectJson={async (imported) => {
                await saveProjectToDb(imported);
                setProjects((prev) => [imported, ...prev]);
                setActiveProject(imported);
                setActiveNav('editor');
              }}
            />
          )}

          {activeNav === 'templates' && (
            <TemplatesView
              templates={STUDIO_TEMPLATES}
              onUseTemplate={handleUseTemplate}
            />
          )}

          {activeNav === 'favorites' && (
            <FavoritesView
              projects={projects}
              palettes={palettes}
              onOpenProject={(proj) => {
                setActiveProject(proj);
                setActiveNav('editor');
              }}
              onToggleFavoriteProject={(id) => {
                setProjects((prev) =>
                  prev.map((p) => {
                    if (p.id !== id) return p;
                    const updated = { ...p, favorite: !p.favorite };
                    saveProjectToDb(updated);
                    return updated;
                  })
                );
              }}
              onToggleFavoritePalette={(id) => {
                setPalettes((prev) =>
                  prev.map((p) => {
                    if (p.id !== id) return p;
                    const updated = { ...p, favorite: !p.favorite };
                    savePaletteToDb(updated);
                    return updated;
                  })
                );
              }}
            />
          )}

          {activeNav === 'settings' && (
            <SettingsView
              settings={settings}
              storageStats={storageStats}
              serverHealth={serverHealth}
              onUpdateSettings={setSettings}
            />
          )}
        </main>
      </div>

      {/* Global Export Modal */}
      <ExportModal
        open={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        projectName={activeProject?.name ?? 'Pattern Studio Design'}
        baseWidth={exportState.width}
        baseHeight={exportState.height}
        hasVectorOnlyContent={exportState.isVectorOnly}
        defaultQuality={settings.defaultExportQuality}
        onExportPng={(mult, transparent) => {
          const slug = (activeProject?.name ?? 'pattern').toLowerCase().replace(/[^a-z0-9]+/g, '-');
          const url = editorRef.current?.exportPng(mult, transparent) ?? activeProject?.thumbnailDataUrl;
          if (url) triggerDownload(url, `${slug}-${mult}x.png`);
        }}
        onExportJpg={(mult, quality) => {
          const slug = (activeProject?.name ?? 'pattern').toLowerCase().replace(/[^a-z0-9]+/g, '-');
          const url = editorRef.current?.exportJpg(mult, quality) ?? activeProject?.thumbnailDataUrl;
          if (url) triggerDownload(url, `${slug}-${mult}x.jpg`);
        }}
        onExportSvg={() => {
          const slug = (activeProject?.name ?? 'pattern').toLowerCase().replace(/[^a-z0-9]+/g, '-');
          const svg = editorRef.current?.exportSvg() ?? activeProject?.svgSource;
          if (svg) {
            const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            triggerDownload(url, `${slug}.svg`);
            URL.revokeObjectURL(url);
          }
        }}
        onExportProjectJson={() => {
          if (!activeProject) return;
          const snap = editorRef.current?.getCanvasSnapshot();
          const payload: StudioProject = {
            ...activeProject,
            canvasJson: snap?.canvasJson ?? activeProject.canvasJson,
            thumbnailDataUrl: snap?.thumbnailDataUrl ?? activeProject.thumbnailDataUrl,
            width: snap?.width ?? activeProject.width,
            height: snap?.height ?? activeProject.height,
          };
          const blob = new Blob([JSON.stringify(payload, null, 2)], {
            type: 'application/json',
          });
          const url = URL.createObjectURL(blob);
          const slug = activeProject.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
          triggerDownload(url, `${slug}.patternstudio.json`);
          URL.revokeObjectURL(url);
        }}
      />
    </div>
  );
}
