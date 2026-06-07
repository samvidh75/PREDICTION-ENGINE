import React, { useState, useEffect, useCallback } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────

interface SavedCompany {
  symbol: string;
  addedAt: string; // ISO timestamp
}

interface SavedAnalysis {
  id: string;
  title: string;
  type: 'portfolio' | 'comparison' | 'screener';
  description: string;
  savedAt: string;
}

interface WorkspaceData {
  companies: SavedCompany[];
  analyses: SavedAnalysis[];
  notes: string;
}

type TabKey = 'companies' | 'analyses' | 'notes';

// ── Helpers ────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'ssi_workspace';

const EMPTY_WORKSPACE: WorkspaceData = {
  companies: [],
  analyses: [],
  notes: '',
};

function loadWorkspace(): WorkspaceData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...EMPTY_WORKSPACE };
    const parsed = JSON.parse(raw);
    return {
      companies: Array.isArray(parsed.companies) ? parsed.companies : [],
      analyses: Array.isArray(parsed.analyses) ? parsed.analyses : [],
      notes: typeof parsed.notes === 'string' ? parsed.notes : '',
    };
  } catch {
    return { ...EMPTY_WORKSPACE };
  }
}

function saveWorkspace(data: WorkspaceData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // storage full or unavailable — silently fail
  }
}

// ── Sub-components ─────────────────────────────────────────────────────────

const TABS: { key: TabKey; label: string; emoji: string }[] = [
  { key: 'companies', label: 'Saved Companies', emoji: '🏢' },
  { key: 'analyses', label: 'Saved Analyses', emoji: '📊' },
  { key: 'notes', label: 'Notes', emoji: '📝' },
];

interface TabBarProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
}

const TabBar: React.FC<TabBarProps> = ({ activeTab, onTabChange }) => (
  <div className="flex border-b-4 border-black mb-6">
    {TABS.map((tab) => (
      <button
        key={tab.key}
        onClick={() => onTabChange(tab.key)}
        className={`
          px-5 py-3 font-bold text-sm uppercase tracking-wide transition-all
          border-4 border-b-0 border-transparent
          ${
            activeTab === tab.key
              ? 'bg-white border-black text-black -mb-[4px] relative z-10 rounded-t-lg'
              : 'bg-gray-200 text-gray-500 hover:bg-gray-300 hover:text-black'
          }
        `}
      >
        <span className="mr-2">{tab.emoji}</span>
        {tab.label}
      </button>
    ))}
  </div>
);

// ── Saved Companies Tab ────────────────────────────────────────────────────

interface SavedCompaniesTabProps {
  companies: SavedCompany[];
  onAdd: (symbol: string) => Promise<void>;
  onRemove: (symbol: string) => void;
}

const SavedCompaniesTab: React.FC<SavedCompaniesTabProps> = ({
  companies,
  onAdd,
  onRemove,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleAdd = async () => {
    const symbol = inputValue.trim().toUpperCase();
    if (!symbol) return;

    if (companies.some((c) => c.symbol === symbol)) {
      setErrorMessage(`${symbol} is already in your workspace.`);
      return;
    }

    setIsValidating(true);
    setErrorMessage('');

    try {
      await onAdd(symbol);
      setInputValue('');
    } catch (err: any) {
      setErrorMessage(err?.message ?? 'Failed to validate symbol.');
    } finally {
      setIsValidating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div>
      {/* Add Company Row */}
      <div className="flex gap-3 mb-6 items-start">
        <div className="flex-1 flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setErrorMessage('');
            }}
            onKeyDown={handleKeyDown}
            placeholder="Enter stock symbol (e.g., AAPL)"
            className="
              flex-1 px-4 py-3 font-mono text-lg uppercase
              border-4 border-black rounded-lg
              placeholder:text-gray-400 placeholder:normal-case
              focus:outline-none focus:ring-4 focus:ring-yellow-400
              bg-white text-black
            "
            disabled={isValidating}
          />
          <button
            onClick={handleAdd}
            disabled={isValidating || !inputValue.trim()}
            className="
              px-6 py-3 font-extrabold text-lg uppercase
              bg-[#FFD700] text-black border-4 border-black rounded-lg
              hover:bg-[#FFE44D] active:translate-y-[2px]
              disabled:opacity-50 disabled:cursor-not-allowed
              shadow-[4px_4px_0px_#000] active:shadow-none
              transition-all
            "
          >
            {isValidating ? 'Checking...' : 'Add'}
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="mb-4 px-4 py-3 bg-red-100 border-4 border-red-500 rounded-lg font-bold text-red-700">
          ⚠ {errorMessage}
        </div>
      )}

      {/* Company Cards */}
      {companies.length === 0 ? (
        <div className="text-center py-12 px-4 border-4 border-dashed border-gray-400 rounded-xl bg-gray-50">
          <div className="text-5xl mb-4">🔍</div>
          <p className="text-xl font-bold text-gray-600">
            Your research workspace is empty.
          </p>
          <p className="text-base text-gray-500 mt-2">
            Start by searching for a company.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {companies.map((company) => (
            <SavedCompanyCard
              key={company.symbol}
              company={company}
              onRemove={onRemove}
            />
          ))}
        </div>
      )}
    </div>
  );
};

interface SavedCompanyCardProps {
  company: SavedCompany;
  onRemove: (symbol: string) => void;
}

const SavedCompanyCard: React.FC<SavedCompanyCardProps> = ({
  company,
  onRemove,
}) => {
  const handleOpen = () => {
    // Navigate to Superpage via query param routing
    const params = new URLSearchParams(window.location.search);
    params.set('page', 'company');
    params.set('id', company.symbol);
    window.location.search = params.toString();
  };

  const formattedDate = new Date(company.addedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div
      className="
        relative group bg-white border-4 border-black rounded-xl p-4
        hover:shadow-[6px_6px_0px_#000] active:shadow-none
        active:translate-x-[2px] active:translate-y-[2px]
        transition-all cursor-pointer
      "
      onClick={handleOpen}
    >
      {/* Remove button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove(company.symbol);
        }}
        className="
          absolute -top-3 -right-3 w-8 h-8
          bg-red-500 text-white border-4 border-black rounded-full
          font-extrabold text-lg leading-none
          hover:bg-red-600 active:scale-90
          flex items-center justify-center
          transition-transform z-10
          shadow-[2px_2px_0px_#000]
        "
        title={`Remove ${company.symbol}`}
      >
        ✕
      </button>

      <div className="flex items-center gap-3 mb-2">
        <div
          className="
            w-12 h-12 bg-[#FFD700] border-4 border-black rounded-lg
            flex items-center justify-center font-extrabold text-lg
          "
        >
          {company.symbol.charAt(0)}
        </div>
        <div>
          <h3 className="font-extrabold text-xl tracking-wide">
            {company.symbol}
          </h3>
          <p className="text-xs text-gray-500 font-semibold">
            Saved {formattedDate}
          </p>
        </div>
      </div>

      <div className="mt-3 text-sm font-bold text-blue-600 group-hover:underline">
        Open Company Page →
      </div>
    </div>
  );
};

// ── Saved Analyses Tab ─────────────────────────────────────────────────────

interface SavedAnalysesTabProps {
  analyses: SavedAnalysis[];
  onRemoveAnalysis: (id: string) => void;
}

const TYPE_ICONS: Record<SavedAnalysis['type'], string> = {
  portfolio: '💼',
  comparison: '⚖️',
  screener: '🔎',
};

const TYPE_LABELS: Record<SavedAnalysis['type'], string> = {
  portfolio: 'Portfolio Analysis',
  comparison: 'Comparison',
  screener: 'Screener',
};

const SavedAnalysesTab: React.FC<SavedAnalysesTabProps> = ({
  analyses,
  onRemoveAnalysis,
}) => {
  if (analyses.length === 0) {
    return (
      <div className="text-center py-12 px-4 border-4 border-dashed border-gray-400 rounded-xl bg-gray-50">
        <div className="text-5xl mb-4">📊</div>
        <p className="text-xl font-bold text-gray-600">
          No saved analyses yet.
        </p>
        <p className="text-base text-gray-500 mt-2">
          Analyses you save from Portfolio Doctor or Comparisons will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {analyses.map((analysis) => (
        <div
          key={analysis.id}
          className="
            flex items-start gap-4 bg-white border-4 border-black rounded-xl p-4
            hover:shadow-[4px_4px_0px_#000] transition-shadow
          "
        >
          <div
            className="
              w-12 h-12 bg-[#B8E6FF] border-4 border-black rounded-lg
              flex items-center justify-center text-2xl flex-shrink-0
            "
          >
            {TYPE_ICONS[analysis.type]}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-extrabold text-lg truncate">
              {analysis.title}
            </h3>
            <p className="text-sm text-gray-600 font-semibold">
              {TYPE_LABELS[analysis.type]} &mdash;{' '}
              {new Date(analysis.savedAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </p>
            {analysis.description && (
              <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                {analysis.description}
              </p>
            )}
          </div>
          <button
            onClick={() => onRemoveAnalysis(analysis.id)}
            className="
              w-8 h-8 bg-red-500 text-white border-4 border-black rounded-lg
              font-extrabold flex items-center justify-center flex-shrink-0
              hover:bg-red-600 active:scale-90 transition-transform
              shadow-[2px_2px_0px_#000]
            "
            title="Remove analysis"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
};

// ── Notes Tab ──────────────────────────────────────────────────────────────

interface NotesTabProps {
  notes: string;
  onNotesChange: (notes: string) => void;
}

const NotesTab: React.FC<NotesTabProps> = ({ notes, onNotesChange }) => {
  const [localNotes, setLocalNotes] = useState(notes);

  // Sync from props when tab changes
  useEffect(() => {
    setLocalNotes(notes);
  }, [notes]);

  const handleBlur = () => {
    onNotesChange(localNotes);
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setLocalNotes(e.target.value);
  };

  const wordCount = localNotes.trim()
    ? localNotes.trim().split(/\s+/).length
    : 0;

  return (
    <div>
      <div className="relative">
        <textarea
          value={localNotes}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="Jot down your research notes, investment theses, questions to follow up on..."
          rows={14}
          className="
            w-full px-5 py-4 font-mono text-base
            border-4 border-black rounded-xl
            placeholder:text-gray-400 placeholder:font-sans
            focus:outline-none focus:ring-4 focus:ring-yellow-400
            bg-white text-black resize-y
            leading-relaxed
          "
        />
        <div className="absolute bottom-3 right-3 text-xs font-bold text-gray-400 bg-white px-2 py-1 border-2 border-gray-300 rounded">
          {wordCount} word{wordCount !== 1 ? 's' : ''}
        </div>
      </div>
      <p className="mt-3 text-sm font-semibold text-gray-500">
        💡 Notes auto-save when you click outside the text area.
      </p>
    </div>
  );
};

// ── Main Page Component ────────────────────────────────────────────────────

const WorkspacePage: React.FC = () => {
  const [workspace, setWorkspace] = useState<WorkspaceData>(() =>
    loadWorkspace()
  );
  const [activeTab, setActiveTab] = useState<TabKey>('companies');

  // Persist workspace whenever it changes
  useEffect(() => {
    saveWorkspace(workspace);
  }, [workspace]);

  // ── Add Company (with validation) ──────────────────────────────────

  const handleAddCompany = useCallback(
    async (symbol: string): Promise<void> => {
      // Validate symbol exists via API
      const response = await fetch(`/api/stock/${symbol}/health`);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`Symbol "${symbol}" not found.`);
        }
        throw new Error(`Validation failed (${response.status}).`);
      }

      const newCompany: SavedCompany = {
        symbol,
        addedAt: new Date().toISOString(),
      };

      setWorkspace((prev) => ({
        ...prev,
        companies: [...prev.companies, newCompany],
      }));
    },
    []
  );

  // ── Remove Company ────────────────────────────────────────────────

  const handleRemoveCompany = useCallback((symbol: string) => {
    setWorkspace((prev) => ({
      ...prev,
      companies: prev.companies.filter((c) => c.symbol !== symbol),
    }));
  }, []);

  // ── Remove Analysis ───────────────────────────────────────────────

  const handleRemoveAnalysis = useCallback((id: string) => {
    setWorkspace((prev) => ({
      ...prev,
      analyses: prev.analyses.filter((a) => a.id !== id),
    }));
  }, []);

  // ── Update Notes ──────────────────────────────────────────────────

  const handleNotesChange = useCallback((notes: string) => {
    setWorkspace((prev) => ({ ...prev, notes }));
  }, []);

  // ── Render ────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#F5F0E8]">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <header className="mb-8">
          <h1
            className="
              text-5xl md:text-6xl font-black uppercase tracking-tight
              text-black leading-none
              inline-block bg-white border-4 border-black px-6 py-3
              shadow-[8px_8px_0px_#000]
            "
          >
            🧠 Research Workspace
          </h1>
          <p className="mt-4 text-lg font-semibold text-gray-700 max-w-2xl">
            Your personal hub for saved companies, analyses, and investment
            notes. Everything is stored locally in your browser.
          </p>
        </header>

        {/* Tab Bar */}
        <TabBar activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Tab Content */}
        <section
          className="
            bg-white border-4 border-black rounded-xl p-6
            shadow-[6px_6px_0px_#000]
            min-h-[400px]
          "
        >
          {activeTab === 'companies' && (
            <SavedCompaniesTab
              companies={workspace.companies}
              onAdd={handleAddCompany}
              onRemove={handleRemoveCompany}
            />
          )}
          {activeTab === 'analyses' && (
            <SavedAnalysesTab
              analyses={workspace.analyses}
              onRemoveAnalysis={handleRemoveAnalysis}
            />
          )}
          {activeTab === 'notes' && (
            <NotesTab
              notes={workspace.notes}
              onNotesChange={handleNotesChange}
            />
          )}
        </section>

        {/* Footer info */}
        <footer className="mt-6 text-center text-sm font-semibold text-gray-400">
          Workspace data is saved in your browser's local storage. Clearing
          browser data will reset your workspace.
        </footer>
      </div>
    </div>
  );
};

export default WorkspacePage;

// ── Re-exports for other agents who may need types ─────────────────────────

export type { WorkspaceData, SavedCompany, SavedAnalysis, TabKey };