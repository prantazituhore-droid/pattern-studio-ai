import React, { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Layers,
  Loader2,
  Palette,
  Send,
  Sparkles,
} from 'lucide-react';
import { AssistantChatMessage, AssistantOperation } from '../types/studio';

interface AiDesignAssistantProps {
  projectName: string;
  previewImageUrl: string;
  getCanvasSummary: () => {
    summary: {
      width: number;
      height: number;
      backgroundColor: string;
      objectCount: number;
      objects: Array<{ name: string; type: string; fill?: string; stroke?: string }>;
      palette: string[];
    };
    thumbnailDataUrl: string;
  } | null;
  onApplyOperations: (ops: AssistantOperation[]) => Promise<string[]>;
  onOpenEditor: () => void;
}

const QUICK_INSTRUCTIONS = [
  'Make this pattern more luxurious',
  'Change the background to black',
  'Replace red flowers with blue flowers',
  'Add golden decorative elements',
  'Make it suitable for silk fabric',
  'Create a minimalist version',
  'Generate 4 color variations',
  'Make the pattern more symmetrical',
];

export const AiDesignAssistant: React.FC<AiDesignAssistantProps> = ({
  projectName,
  previewImageUrl,
  getCanvasSummary,
  onApplyOperations,
  onOpenEditor,
}) => {
  const [messages, setMessages] = useState<AssistantChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Connected to "${projectName}". Give me any styling, color, symmetry, or decorative instruction and I will apply real edits directly to your canvas layers.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [livePreview, setLivePreview] = useState(previewImageUrl);

  React.useEffect(() => {
    const snap = getCanvasSummary();
    if (snap?.thumbnailDataUrl) {
      setLivePreview(snap.thumbnailDataUrl);
    } else {
      setLivePreview(previewImageUrl);
    }
  }, [previewImageUrl, projectName, getCanvasSummary]);

  const sendInstruction = async (instructionText: string) => {
    const trimmed = instructionText.trim();
    if (!trimmed || sending) return;

    const userMsg: AssistantChatMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setSending(true);
    setErrorMsg(null);

    try {
      const snap = getCanvasSummary();
      const res = await fetch('/api/ai/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          canvasSummary: snap?.summary ?? {
            width: 800,
            height: 800,
            backgroundColor: '#FFFFFF',
            objectCount: 0,
            objects: [],
            palette: [],
          },
          canvasPreviewDataUrl: snap?.thumbnailDataUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Assistant request failed.');
      }

      const ops: AssistantOperation[] = Array.isArray(data.operations) ? data.operations : [];
      const executableOps = ops.filter((o) => o.type !== 'generate_color_variations');
      let appliedSummary: string[] = [];
      if (executableOps.length > 0) {
        appliedSummary = await onApplyOperations(executableOps);
        const updatedSnap = getCanvasSummary();
        if (updatedSnap?.thumbnailDataUrl) {
          setLivePreview(updatedSnap.thumbnailDataUrl);
        }
      }

      const aiMsg: AssistantChatMessage = {
        id: `ast-${Date.now()}`,
        role: 'assistant',
        content: data.reply || 'Applied requested design adjustments.',
        operations: ops,
        appliedSummary,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Assistant request failed.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left Active Design Snapshot */}
      <div className="lg:col-span-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Active Design Target
            </h3>
            <p className="text-xs text-zinc-500 truncate max-w-[220px]">{projectName}</p>
          </div>
          <button
            type="button"
            onClick={onOpenEditor}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800"
          >
            <Layers className="w-3.5 h-3.5" />
            Open Canvas
          </button>
        </div>

        <div className="aspect-square rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden checkerboard-bg">
          <img
            src={livePreview || previewImageUrl}
            alt={projectName}
            referrerPolicy="no-referrer"
            className="w-full h-full object-contain"
          />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400 block">
            Quick Design Directives
          </span>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_INSTRUCTIONS.map((q) => (
              <button
                key={q}
                type="button"
                disabled={sending}
                onClick={() => sendInstruction(q)}
                className="px-2.5 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 hover:border-violet-500 hover:bg-violet-50 dark:hover:bg-violet-950/40 text-left transition-colors disabled:opacity-50"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right Conversational Studio */}
      <div className="lg:col-span-7 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col h-[640px]">
        <div className="px-5 py-3.5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-violet-600" />
            <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              AI Design Assistant (Gemini 4 Hydrogen)
            </span>
          </div>
          <span className="text-xs text-zinc-500">Live Canvas Execution</span>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-violet-600 text-white'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100'
                }`}
              >
                <p>{msg.content}</p>

                {msg.appliedSummary && msg.appliedSummary.length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-zinc-200 dark:border-zinc-700 space-y-1">
                    {msg.appliedSummary.map((line, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span>{line}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Render 4 interactive Color Variation cards if generated */}
                {msg.operations?.map((op, opIdx) => {
                  if (op.type !== 'generate_color_variations' || !Array.isArray(op.variations)) {
                    return null;
                  }
                  return (
                    <div key={opIdx} className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {op.variations.map((v, vIdx) => (
                        <button
                          key={vIdx}
                          type="button"
                          onClick={async () => {
                            await onApplyOperations([
                              { type: 'apply_palette', background: v.background, colors: v.colors },
                            ]);
                            const updated = getCanvasSummary();
                            if (updated?.thumbnailDataUrl) setLivePreview(updated.thumbnailDataUrl);
                          }}
                          className="p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-left hover:border-violet-500 transition-colors"
                        >
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <span className="text-xs font-medium text-zinc-800 dark:text-zinc-200 truncate">
                              {v.name}
                            </span>
                            <Palette className="w-3.5 h-3.5 text-violet-600 shrink-0" />
                          </div>
                          <div className="flex gap-1">
                            {[v.background, ...(v.colors || [])].map((hex, cIdx) => (
                              <span
                                key={cIdx}
                                className="flex-1 h-4 rounded-xs border border-black/10"
                                style={{ backgroundColor: hex }}
                              />
                            ))}
                          </div>
                        </button>
                      ))}
                    </div>
                  );
                })}
              </div>
              <span className="text-[11px] text-zinc-400 mt-1 px-1">{msg.timestamp}</span>
            </div>
          ))}

          {sending && (
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <Loader2 className="w-4 h-4 animate-spin text-violet-600" />
              <span>Analyzing design layers and applying edits...</span>
            </div>
          )}

          {errorMsg && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendInstruction(input);
          }}
          className="p-3.5 border-t border-zinc-200 dark:border-zinc-800 flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g., Add golden filigree borders and deepen background to midnight navy..."
            className="flex-1 px-3.5 py-2.5 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 disabled:opacity-50 whitespace-nowrap"
          >
            <Send className="w-4 h-4" />
            Apply
          </button>
        </form>
      </div>
    </div>
  );
};
