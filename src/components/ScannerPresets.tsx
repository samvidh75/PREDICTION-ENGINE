import { useEffect, useState } from "react";
import { Check, Plus, Save, Trash2, X } from "lucide-react";
import type { SavedScannerPreset } from "../research/contracts/productContracts";
import { savePreset, getPresets, updatePreset, deletePreset } from "../services/personalization/ScannerPresetStore";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { colors, typography, space, radius } from "../design/tokens";

interface ScannerPresetsProps {
  scanType: string;
  query: string;
  onApply: (preset: SavedScannerPreset) => void;
}

export function ScannerPresets({ scanType, query, onApply }: ScannerPresetsProps) {
  const [presets, setPresets] = useState<SavedScannerPreset[]>([]);
  const [showSave, setShowSave] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const currentFilters: Record<string, string> = { scanType, query };

  useEffect(() => {
    setPresets(getPresets());
  }, []);

  const refresh = () => setPresets(getPresets());

  const handleSave = () => {
    const name = saveName.trim();
    if (!name) return;
    savePreset(name, "", { ...currentFilters });
    setSaveName("");
    setShowSave(false);
    refresh();
    setMessage("Preset saved");
    setTimeout(() => setMessage(null), 2000);
  };

  const handleDelete = (id: string) => {
    deletePreset(id);
    refresh();
  };

  if (Object.keys(currentFilters).length === 0) {
    return null;
  }

  return (
    <div style={{ display: "grid", gap: space[3] }}>
      <div style={{ display: "flex", alignItems: "center", gap: space[3], flexWrap: "wrap" }}>
        {presets.length > 0 && (
          <span style={{ fontSize: "13px", color: colors.textSecondary }}>Presets:</span>
        )}
        {presets.map((preset) => (
          <Button
            key={preset.id}
            variant="secondary"
            size="sm"
            onClick={() => onApply(preset)}
          >
            {preset.name}
          </Button>
        ))}
        <Button variant="ghost" size="sm" onClick={() => setShowSave(!showSave)}>
          <Save size={14} style={{ marginRight: "4px" }} />
          {showSave ? "Cancel" : "Save current"}
        </Button>
      </div>

      {showSave && (
        <Card>
          <div style={{ display: "flex", gap: space[2], alignItems: "center" }}>
            <input
              autoFocus
              placeholder="Preset name..."
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              style={{
                flex: 1,
                minHeight: "36px",
                border: `1px solid ${colors.border}`,
                borderRadius: "8px",
                padding: "0 12px",
                fontSize: typography.body.desktop.size,
                color: colors.textPrimary,
                background: colors.card,
                outline: "none",
              }}
            />
            <Button size="sm" onClick={handleSave}>
              <Check size={14} style={{ marginRight: "4px" }} />
              Save
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowSave(false)}>
              <X size={14} />
            </Button>
          </div>
          {presets.map((preset) => (
            <div
              key={preset.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: `${space[1]} 0`,
                borderTop: `1px solid ${colors.border}`,
              }}
            >
              <span style={{ fontSize: "13px" }}>{preset.name}</span>
              <Button variant="ghost" size="icon" onClick={() => handleDelete(preset.id!)}>
                <Trash2 size={14} />
              </Button>
            </div>
          ))}
        </Card>
      )}

      {message && (
        <span style={{ fontSize: "12px", color: "#30D158" }}>{message}</span>
      )}
    </div>
  );
}
