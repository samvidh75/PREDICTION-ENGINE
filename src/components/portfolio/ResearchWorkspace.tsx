// src/components/portfolio/ResearchWorkspace.tsx
import React, { useState } from "react";
import { NoteEngine, ResearchNote } from "../../services/portfolio/NoteEngine";
import { ExportEngine } from "../../services/portfolio/ExportEngine";
import { WorkspaceEngine, TeamMember } from "../../services/portfolio/WorkspaceEngine";
import { FeatureGate } from "../subscriptions/FeatureGate";
import CustomSelect from "../ui/CustomSelect";

export const ResearchWorkspace: React.FC = () => {
  const [activeSymbol, setActiveSymbol] = useState("RELIANCE");
  const [noteText, setNoteText] = useState(() => NoteEngine.getNote("RELIANCE").note);
  const [noteObj, setNoteObj] = useState<ResearchNote>(() => NoteEngine.getNote("RELIANCE"));

  const [members, setMembers] = useState<TeamMember[]>(() => WorkspaceEngine.getMembers());
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberRole, setNewMemberRole] = useState<"Admin" | "Analyst" | "Viewer">("Viewer");

  const handleSaveNote = () => {
    NoteEngine.saveNote(activeSymbol, noteText);
    setNoteObj(NoteEngine.getNote(activeSymbol));
  };

  const handleSymbolChange = (sym: string) => {
    setActiveSymbol(sym);
    const n = NoteEngine.getNote(sym);
    setNoteText(n.note);
    setNoteObj(n);
  };

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim()) return;
    WorkspaceEngine.inviteMember(newMemberName, newMemberRole);
    setMembers(WorkspaceEngine.getMembers());
    setNewMemberName("");
  };

  const handleCsvExport = () => {
    const res = ExportEngine.exportToCSV("notes");
    alert(`CSV generated successfully: ${res.filename}`);
  };

  return (
    <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-6 font-vos-interface text-white select-none">
      {/* Column 1 & 2: Notes Editor */}
      <div className="lg:col-span-2 vos-card p-6 flex flex-col space-y-6">
        <div className="flex justify-between items-center border-b border-white/5 pb-3">
          <div>
            <span className="text-[11px] font-medium tracking-widest text-[#D946EF] uppercase block mb-1">
              Personal Research OS // Private Workbook
            </span>
            <h3 className="vos-sec-title font-bold text-white font-vos-display">Research Workspace</h3>
          </div>
          
          <button
            onClick={handleCsvExport}
            className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-xs font-bold hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
          >
            Export Workbook
          </button>
        </div>

        {/* Symbol Selectors */}
        <div className="flex gap-2">
          {["RELIANCE", "HAL", "BEL", "INFY"].map((s) => (
            <button
              key={s}
              onClick={() => handleSymbolChange(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                activeSymbol === s
                  ? "bg-white text-[#020304] border-white"
                  : "bg-white/5 text-gray-400 border-white/5"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Note Editor Area */}
        <div className="flex flex-col space-y-3">
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder={`Enter your private research notes for ${activeSymbol}...`}
            className="w-full h-36 bg-[#020304]/80 border border-white/12 rounded-[18px] p-4 text-sm text-white/90 outline-none focus:border-cyan-400 transition-all font-vos-reading"
          />
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-gray-500">Last updated: {noteObj.lastUpdated}</span>
            <button
              onClick={handleSaveNote}
              className="px-4 py-2 bg-[var(--color-surface)] text-[var(--color-text-primary)] rounded-full text-xs font-bold hover:bg-[var(--color-surface-raised)] active:scale-95 transition-all cursor-pointer shadow-lg"
            >
              Save Workbook Note
            </button>
          </div>
        </div>
      </div>

      {/* Column 3: Institutional Team Workspace */}
      <div className="col-span-1">
        <FeatureGate feature="teamSpaces" fallbackMessage="Team collaboration workspaces are exclusive to the Institutional Tier.">
          <div className="vos-card p-6 flex flex-col justify-between h-full min-h-[300px]">
            <div className="space-y-4">
              <div>
                <span className="text-[10px] text-purple-400 uppercase tracking-widest font-bold block mb-1">Corporate Space</span>
                <h4 className="text-lg font-bold text-white font-vos-display">Team Space</h4>
              </div>

              {/* Members List */}
              <div className="space-y-2">
                {members.map((m) => (
                  <div key={m.id} className="bg-white/5 border border-white/5 p-2.5 rounded-[12px] flex items-center justify-between text-xs">
                    <span className="font-semibold text-white">{m.name}</span>
                    <span className="px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/20 text-purple-400 font-bold uppercase text-[9px]">
                      {m.role}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Invite Form */}
            <form onSubmit={handleInvite} className="flex flex-col gap-2 mt-4 pt-4 border-t border-white/5">
              <input
                type="text"
                placeholder="Team member name..."
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
                className="w-full h-[40px] bg-white/5 border border-white/10 rounded-[12px] px-3 text-xs outline-none focus:border-purple-400 text-white"
              />
              <div className="flex gap-2">
                <CustomSelect
                  aria-label="Select role"
                  value={newMemberRole}
                  onChange={(e) => setNewMemberRole(e.target.value as any)}
                  className="bg-white/5 border border-white/10 rounded-[12px] px-3 text-xs text-white/70 outline-none flex-1"
                >
                  <option value="Admin">Admin</option>
                  <option value="Analyst">Analyst</option>
                  <option value="Viewer">Viewer</option>
                </CustomSelect>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-500 hover:bg-purple-400 text-white rounded-full text-xs font-bold transition-all cursor-pointer"
                >
                  Invite
                </button>
              </div>
            </form>
          </div>
        </FeatureGate>
      </div>
    </div>
  );
};
export default ResearchWorkspace;
