import React, { useRef, useState } from 'react';
import {
  Check,
  Copy,
  Edit3,
  FolderOpen,
  Grid,
  Heart,
  Layers,
  MessageSquare,
  Moon,
  Plus,
  Search,
  Shirt,
  Sparkles,
  Sun,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  ColorPalette,
  NavSection,
  PATTERN_CATEGORIES,
  StudioProject,
  StudioSettings,
  StudioTemplate,
} from '../types/studio';

interface DashboardViewProps {
  projects: StudioProject[];
  templates: StudioTemplate[];
  onNavigate: (nav: NavSection) => void;
  onCreateBlankProject: () => void;
  onOpenProject: (project: StudioProject) => void;
  onUseTemplate: (template: StudioTemplate, target: 'editor' | 'seamless' | 'mockups') => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  projects,
  templates,
  onNavigate,
  onCreateBlankProject,
  onOpenProject,
  onUseTemplate,
}) => {
  return (
    <div className="space-y-8">
      {/* Hero Studio Workbench Banner */}
      <section className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div className="space-y-2.5 max-w-2xl">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 text-balance">
            Pattern Studio AI
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
            Create original textile, saree, geometric, and surface patterns with Gemini AI, refine
            every layer in the vector-and-raster studio editor, verify seamless edge alignment, and
            preview across 13 product mockups.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => onNavigate('generator')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 text-white text-sm font-medium hover:opacity-95 whitespace-nowrap"
          >
            <Sparkles className="w-4 h-4" />
            Generate AI Pattern
          </button>
          <button
            type="button"
            onClick={onCreateBlankProject}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Blank Canvas
          </button>
        </div>
      </section>

      {/* Quick Studio Workflows */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            nav: 'generator' as NavSection,
            title: 'AI Pattern Generator',
            desc: '20 categories, custom HEX palettes, reference image transformation.',
            icon: <Sparkles className="w-5 h-5 text-violet-600" />,
          },
          {
            nav: 'editor' as NavSection,
            title: 'Professional Editor',
            desc: '20 tools, layers panel, typography, filters, crop, and undo history.',
            icon: <Layers className="w-5 h-5 text-blue-600" />,
          },
          {
            nav: 'seamless' as NavSection,
            title: 'Seamless & Mockups',
            desc: 'Grid, brick, half-drop, mirror repeats, seam verification, 13 mockups.',
            icon: <Grid className="w-5 h-5 text-violet-600" />,
          },
          {
            nav: 'assistant' as NavSection,
            title: 'AI Design Assistant',
            desc: 'Conversational color variations, motifs, and live canvas edits.',
            icon: <MessageSquare className="w-5 h-5 text-blue-600" />,
          },
        ].map((card) => (
          <button
            key={card.nav}
            type="button"
            onClick={() => onNavigate(card.nav)}
            className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-left hover:border-violet-500 transition-colors space-y-2.5"
          >
            <div className="w-9 h-9 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
              {card.icon}
            </div>
            <div className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
              {card.title}
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">{card.desc}</p>
          </button>
        ))}
      </section>

      {/* Recent Projects */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Recent Studio Projects
          </h2>
          <button
            type="button"
            onClick={() => onNavigate('projects')}
            className="text-xs font-medium text-violet-600 dark:text-violet-400 hover:underline"
          >
            View all ({projects.length})
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.slice(0, 3).map((proj) => (
            <div
              key={proj.id}
              onClick={() => onOpenProject(proj)}
              className="group cursor-pointer rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden hover:border-violet-500 transition-colors"
            >
              <div className="aspect-[4/3] bg-zinc-100 dark:bg-zinc-950 overflow-hidden checkerboard-bg">
                <img
                  src={proj.thumbnailDataUrl}
                  alt={proj.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-200"
                />
              </div>
              <div className="p-4 space-y-1">
                <div className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 truncate">
                  {proj.name}
                </div>
                <div className="text-xs text-zinc-500 flex items-center gap-1.5">
                  <span>{proj.category}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">
                    {proj.width}×{proj.height}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Featured Templates */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Curated Studio Templates
          </h2>
          <button
            type="button"
            onClick={() => onNavigate('templates')}
            className="text-xs font-medium text-violet-600 dark:text-violet-400 hover:underline"
          >
            Browse all templates
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {templates.slice(0, 4).map((tpl) => (
            <div
              key={tpl.id}
              className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden flex flex-col"
            >
              <div className="aspect-square bg-zinc-100 dark:bg-zinc-950 overflow-hidden">
                <img
                  src={tpl.imageUrl}
                  alt={tpl.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-3.5 space-y-2.5 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 truncate">
                    {tpl.name}
                  </h3>
                  <p className="text-xs text-zinc-500 mt-0.5">{tpl.category}</p>
                </div>
                <div className="grid grid-cols-2 gap-1.5 text-xs">
                  <button
                    type="button"
                    onClick={() => onUseTemplate(tpl, 'editor')}
                    className="py-1.5 px-2 rounded-md bg-violet-600 text-white hover:bg-violet-700 font-medium"
                  >
                    Open Editor
                  </button>
                  <button
                    type="button"
                    onClick={() => onUseTemplate(tpl, 'seamless')}
                    className="py-1.5 px-2 rounded-md border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 font-medium"
                  >
                    Repeat Lab
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

interface ProjectsViewProps {
  projects: StudioProject[];
  activeProjectId: string;
  onOpenProject: (project: StudioProject) => void;
  onOpenSeamless: (project: StudioProject) => void;
  onCreateBlankProject: () => void;
  onRenameProject: (id: string, name: string) => void;
  onDuplicateProject: (project: StudioProject) => void;
  onToggleFavorite: (id: string) => void;
  onDeleteProject: (id: string) => void;
  onImportProjectJson: (project: StudioProject) => void;
}

export const ProjectsView: React.FC<ProjectsViewProps> = ({
  projects,
  activeProjectId,
  onOpenProject,
  onOpenSeamless,
  onCreateBlankProject,
  onRenameProject,
  onDuplicateProject,
  onToggleFavorite,
  onDeleteProject,
  onImportProjectJson,
}) => {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const importRef = useRef<HTMLInputElement | null>(null);

  const filtered = projects.filter((p) => {
    const matchesSearch =
      !search.trim() ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase());
    const matchesCat = categoryFilter === 'ALL' || p.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as StudioProject;
        if (parsed && parsed.name) {
          onImportProjectJson({
            ...parsed,
            id: `proj-${Date.now()}`,
            updatedAt: new Date().toISOString(),
          });
        }
      } catch {
        // Ignore malformed files
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">My Projects</h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Persistent local studio storage across refreshes ({projects.length} projects)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={importRef}
            type="file"
            accept=".json,.patternstudio.json"
            onChange={handleImportFile}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => importRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800"
          >
            <Upload className="w-3.5 h-3.5" />
            Import Project
          </button>
          <button
            type="button"
            onClick={onCreateBlankProject}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg bg-violet-600 text-white hover:bg-violet-700"
          >
            <Plus className="w-3.5 h-3.5" />
            New Blank Project
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects by title or category..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
        >
          <option value="ALL">All Categories</option>
          {PATTERN_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 p-12 text-center space-y-3">
          <p className="text-sm text-zinc-500">No matching projects found.</p>
          <button
            type="button"
            onClick={onCreateBlankProject}
            className="px-4 py-2 text-xs font-medium rounded-lg bg-violet-600 text-white"
          >
            Create New Project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((proj) => (
            <div
              key={proj.id}
              className={`rounded-xl border bg-white dark:bg-zinc-900 overflow-hidden flex flex-col ${
                proj.id === activeProjectId
                  ? 'border-violet-600'
                  : 'border-zinc-200 dark:border-zinc-800'
              }`}
            >
              <div className="aspect-[4/3] bg-zinc-100 dark:bg-zinc-950 overflow-hidden checkerboard-bg relative">
                <img
                  src={proj.thumbnailDataUrl}
                  alt={proj.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => onToggleFavorite(proj.id)}
                  className={`absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-white/90 dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-700 ${
                    proj.favorite ? 'text-rose-500' : 'text-zinc-500'
                  }`}
                  title="Toggle Favorite"
                >
                  <Heart className="w-3.5 h-3.5" fill={proj.favorite ? 'currentColor' : 'none'} />
                </button>
              </div>

              <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                <div>
                  {renamingId === proj.id ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        autoFocus
                        value={renameDraft}
                        onChange={(e) => setRenameDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && renameDraft.trim()) {
                            onRenameProject(proj.id, renameDraft.trim());
                            setRenamingId(null);
                          }
                        }}
                        className="flex-1 px-2 py-1 text-xs rounded border border-violet-500 bg-white dark:bg-zinc-950"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (renameDraft.trim()) {
                            onRenameProject(proj.id, renameDraft.trim());
                          }
                          setRenamingId(null);
                        }}
                        className="p-1 rounded bg-violet-600 text-white"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 truncate">
                        {proj.name}
                      </h3>
                      <button
                        type="button"
                        onClick={() => {
                          setRenamingId(proj.id);
                          setRenameDraft(proj.name);
                        }}
                        className="p-1 rounded text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                        title="Rename Project"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                  <div className="text-xs text-zinc-500 mt-1 flex items-center gap-1.5">
                    <span>{proj.category}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">
                      {proj.width}×{proj.height}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                  <div className="grid grid-cols-2 gap-1.5 text-xs">
                    <button
                      type="button"
                      onClick={() => onOpenProject(proj)}
                      className="inline-flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg bg-violet-600 text-white hover:bg-violet-700 font-medium"
                    >
                      <FolderOpen className="w-3.5 h-3.5" />
                      Open Editor
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenSeamless(proj)}
                      className="inline-flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 font-medium"
                    >
                      <Grid className="w-3.5 h-3.5" />
                      Seamless
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <button
                      type="button"
                      onClick={() => onDuplicateProject(proj)}
                      className="inline-flex items-center gap-1 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      Duplicate
                    </button>

                    {confirmDeleteId === proj.id ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            onDeleteProject(proj.id);
                            setConfirmDeleteId(null);
                          }}
                          className="px-2 py-0.5 rounded bg-red-600 text-white text-[11px]"
                        >
                          Confirm
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="text-[11px] text-zinc-500"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(proj.id)}
                        className="inline-flex items-center gap-1 text-zinc-400 hover:text-red-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

interface TemplatesViewProps {
  templates: StudioTemplate[];
  onUseTemplate: (template: StudioTemplate, target: 'editor' | 'seamless' | 'mockups') => void;
}

export const TemplatesView: React.FC<TemplatesViewProps> = ({ templates, onUseTemplate }) => {
  const [filter, setFilter] = useState<'all' | 'vector' | 'print'>('all');

  const visible = templates.filter((t) => {
    if (filter === 'vector') return t.isVector;
    if (filter === 'print') return !t.isVector;
    return true;
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">My Templates</h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Ready-to-customize SVG vector compositions and high-resolution textile print motifs
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs">
          {[
            { id: 'all', label: 'All Templates' },
            { id: 'vector', label: 'Editable Vector SVG' },
            { id: 'print', label: 'Studio Prints' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id as typeof filter)}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                filter === tab.id
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {visible.map((tpl) => (
          <div
            key={tpl.id}
            className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden flex flex-col"
          >
            <div className="aspect-square bg-zinc-100 dark:bg-zinc-950 overflow-hidden checkerboard-bg">
              <img
                src={tpl.imageUrl}
                alt={tpl.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 truncate">
                    {tpl.name}
                  </h3>
                  <span className="text-[10px] font-mono text-zinc-500 shrink-0">
                    {tpl.isVector ? 'SVG' : 'PRINT'}
                  </span>
                </div>
                <p className="text-xs text-zinc-500 line-clamp-2">{tpl.description}</p>
                <div className="flex gap-1 pt-1">
                  {tpl.palette.map((hex, i) => (
                    <span
                      key={i}
                      className="w-4 h-4 rounded-xs border border-black/15"
                      style={{ backgroundColor: hex }}
                    />
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-1.5 text-xs pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => onUseTemplate(tpl, 'editor')}
                  className="py-1.5 px-2 rounded-md bg-violet-600 text-white hover:bg-violet-700 font-medium"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => onUseTemplate(tpl, 'seamless')}
                  className="py-1.5 px-2 rounded-md border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 font-medium"
                >
                  Repeat
                </button>
                <button
                  type="button"
                  onClick={() => onUseTemplate(tpl, 'mockups')}
                  className="inline-flex items-center justify-center gap-1 py-1.5 px-2 rounded-md border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 font-medium"
                >
                  <Shirt className="w-3 h-3" />
                  Mockup
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

interface FavoritesViewProps {
  projects: StudioProject[];
  palettes: ColorPalette[];
  onOpenProject: (project: StudioProject) => void;
  onToggleFavoriteProject: (id: string) => void;
  onToggleFavoritePalette: (id: string) => void;
}

export const FavoritesView: React.FC<FavoritesViewProps> = ({
  projects,
  palettes,
  onOpenProject,
  onToggleFavoriteProject,
  onToggleFavoritePalette,
}) => {
  const favProjects = projects.filter((p) => p.favorite);
  const favPalettes = palettes.filter((p) => p.favorite);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Favorites</h2>
        <p className="text-xs text-zinc-500 mt-0.5">
          Starred pattern projects and saved studio color palettes
        </p>
      </div>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
          Favorite Projects ({favProjects.length})
        </h3>
        {favProjects.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 p-8 text-center text-xs text-zinc-500">
            No favorite projects yet. Star any project in My Projects to pin it here.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {favProjects.map((proj) => (
              <div
                key={proj.id}
                className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden"
              >
                <div className="aspect-[4/3] bg-zinc-100 dark:bg-zinc-950 overflow-hidden relative">
                  <img
                    src={proj.thumbnailDataUrl}
                    alt={proj.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => onToggleFavoriteProject(proj.id)}
                    className="absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-white/90 dark:bg-zinc-900/90 text-rose-500"
                  >
                    <Heart className="w-3.5 h-3.5" fill="currentColor" />
                  </button>
                </div>
                <div className="p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold text-sm truncate">{proj.name}</div>
                    <div className="text-xs text-zinc-500">{proj.category}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onOpenProject(proj)}
                    className="px-3 py-1.5 rounded-lg bg-violet-600 text-white text-xs font-medium shrink-0"
                  >
                    Open
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
          Favorite Color Palettes ({favPalettes.length})
        </h3>
        {favPalettes.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 p-8 text-center text-xs text-zinc-500">
            No favorite color palettes yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {favPalettes.map((pal) => (
              <div
                key={pal.id}
                className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm">{pal.name}</span>
                  <button
                    type="button"
                    onClick={() => onToggleFavoritePalette(pal.id)}
                    className="text-rose-500"
                  >
                    <Heart className="w-4 h-4" fill="currentColor" />
                  </button>
                </div>
                <div className="flex gap-1.5">
                  {[pal.background, ...pal.colors].map((hex, i) => (
                    <div key={i} className="flex-1 space-y-1 text-center">
                      <div
                        className="h-8 rounded-md border border-black/10"
                        style={{ backgroundColor: hex }}
                      />
                      <span className="text-[10px] font-mono text-zinc-500">{hex}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

interface SettingsViewProps {
  settings: StudioSettings;
  storageStats: { projectCount: number; paletteCount: number; approxKb: number } | null;
  serverHealth: {
    hasApiKey: boolean;
    vectorModel: string;
    rasterModel: string;
    rasterRequiresPaidKey: boolean;
  } | null;
  onUpdateSettings: (next: StudioSettings) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  storageStats,
  serverHealth,
  onUpdateSettings,
}) => {
  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Studio Settings</h2>
        <p className="text-xs text-zinc-500 mt-0.5">
          Appearance, canvas defaults, persistence, and AI backend capabilities
        </p>
      </div>

      {/* Appearance */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-4">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Workspace Theme & Canvas Defaults
        </h3>

        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">Color Theme</div>
            <div className="text-xs text-zinc-500">Switch between Light Studio and Dark Charcoal</div>
          </div>
          <div className="flex items-center gap-1 p-1 rounded-lg bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => onUpdateSettings({ ...settings, theme: 'light' })}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md ${
                settings.theme === 'light'
                  ? 'bg-white text-zinc-900 shadow-xs'
                  : 'text-zinc-500'
              }`}
            >
              <Sun className="w-3.5 h-3.5" />
              Light
            </button>
            <button
              type="button"
              onClick={() => onUpdateSettings({ ...settings, theme: 'dark' })}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md ${
                settings.theme === 'dark'
                  ? 'bg-zinc-800 text-white shadow-xs'
                  : 'text-zinc-500'
              }`}
            >
              <Moon className="w-3.5 h-3.5" />
              Dark
            </button>
          </div>
        </div>

        <label className="flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-800 cursor-pointer">
          <div>
            <div className="text-sm font-medium">Auto-Save Canvas Edits</div>
            <div className="text-xs text-zinc-500">
              Automatically save layer and color edits into IndexedDB project storage
            </div>
          </div>
          <input
            type="checkbox"
            checked={settings.autoSave}
            onChange={(e) => onUpdateSettings({ ...settings, autoSave: e.target.checked })}
            className="h-4 w-4 accent-violet-600 rounded"
          />
        </label>

        <label className="flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-800 cursor-pointer">
          <div>
            <div className="text-sm font-medium">Show Pixel Rulers by Default</div>
            <div className="text-xs text-zinc-500">Display calibrated edge rulers in Pro Editor</div>
          </div>
          <input
            type="checkbox"
            checked={settings.showRulersByDefault}
            onChange={(e) =>
              onUpdateSettings({ ...settings, showRulersByDefault: e.target.checked })
            }
            className="h-4 w-4 accent-violet-600 rounded"
          />
        </label>

        <label className="flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-800 cursor-pointer">
          <div>
            <div className="text-sm font-medium">Show Alignment Grid by Default</div>
            <div className="text-xs text-zinc-500">Overlay 40px alignment grid in Pro Editor</div>
          </div>
          <input
            type="checkbox"
            checked={settings.showGridByDefault}
            onChange={(e) =>
              onUpdateSettings({ ...settings, showGridByDefault: e.target.checked })
            }
            className="h-4 w-4 accent-violet-600 rounded"
          />
        </label>
      </div>

      {/* Connected AI Capabilities */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-3 text-xs">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Connected AI Models & Server Configuration
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950">
            <div className="font-semibold text-zinc-900 dark:text-zinc-100">
              Vector SVG & Design Assistant
            </div>
            <div className="text-zinc-500 mt-1 font-mono">
              {serverHealth?.vectorModel ?? 'gemini-4-hydrogen'}
            </div>
            <div className="mt-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
              {serverHealth?.hasApiKey
                ? 'Configured via server-side GEMINI_API_KEY'
                : 'Waiting for GEMINI_API_KEY in Settings > Secrets'}
            </div>
          </div>
          <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950">
            <div className="font-semibold text-zinc-900 dark:text-zinc-100">
              Raster Image Generation Model
            </div>
            <div className="text-zinc-500 mt-1 font-mono">
              {serverHealth?.rasterModel ?? 'gemini-3.1-flash-lite-image'}
            </div>
            <div className="mt-1.5 text-zinc-500">
              Requires a billing-enabled Gemini API key in Settings &gt; Secrets.
            </div>
          </div>
        </div>
      </div>

      {/* Local Storage Summary */}
      {storageStats && (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 flex items-center justify-between text-xs">
          <div>
            <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              IndexedDB Workspace Storage
            </div>
            <div className="text-zinc-500 mt-0.5 font-mono tabular-nums">
              {storageStats.projectCount} projects · {storageStats.paletteCount} palettes · ~
              {storageStats.approxKb} KB used
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
