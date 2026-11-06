import { useState } from "react";
import { Lock, Plus, MessageSquareText } from "lucide-react";
import { Button } from "../../../components/ui/Button";
import { ApplicationStatusBadge } from "./ApplicationStatusBadge";
import { formatDate } from "../../../utils/formatters";

export function RecruiterNotes({
  notes = [],
  isAdding = false,
  onAddNote,
}) {
  const [noteText, setNoteText] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    const trimmed = noteText.trim();
    if (!trimmed) return;
    onAddNote(trimmed, () => setNoteText(""));
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-amber-100 text-amber-800">
            <Lock size={15} />
          </span>
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Internal Recruiter Notes
            </h2>
            <p className="text-xs text-slate-500">
              Confidential to authorized company recruiters. Never visible to
              candidates.
            </p>
          </div>
        </div>
        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
          {notes.length}
        </span>
      </div>

      <form onSubmit={handleSubmit} className="mt-4 space-y-2.5">
        <textarea
          rows={3}
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          maxLength={3000}
          placeholder="Add private screening feedback, interview observations, or compensation notes..."
          className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand focus:bg-white focus:outline-none"
        />
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={isAdding || !noteText.trim()}
            className="gap-1.5 py-2 text-xs"
          >
            <Plus size={14} />
            {isAdding ? "Saving Note..." : "Add Internal Note"}
          </Button>
        </div>
      </form>

      <div className="mt-5 space-y-3">
        {notes.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 p-5 text-center text-xs text-slate-400">
            <MessageSquareText size={20} className="mx-auto mb-1.5 opacity-60" />
            No internal notes recorded for this candidate yet.
          </div>
        ) : (
          notes.map((item, idx) => (
            <div
              key={item.id || idx}
              className="rounded-xl border border-amber-200/70 bg-amber-50/40 p-3.5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {item.stage && (
                    <ApplicationStatusBadge status={item.stage} size="sm" />
                  )}
                  <span className="text-xs font-semibold text-slate-700 capitalize">
                    {item.authorRole || "Recruiter"}
                  </span>
                </div>
                <span className="text-[11px] text-slate-400">
                  {formatDate(item.createdAt)}
                </span>
              </div>
              <p className="mt-2 whitespace-pre-line text-sm text-slate-800">
                {item.note}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
