import { useState } from "react";
import { CheckCircle2, X } from "lucide-react";

export function ApprovalDialog({
  open,
  title = "Confirm Approval",
  description = "Are you sure you want to approve this item?",
  confirmLabel = "Approve",
  loading = false,
  onClose,
  onConfirm,
}) {
  const [notes, setNotes] = useState("");

  if (!open) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    await onConfirm({ notes: notes.trim() || undefined, reason: notes.trim() || undefined });
    setNotes("");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 size={20} />
            </div>
            <h3 className="text-base font-bold text-slate-900">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={18} />
          </button>
        </div>

        <p className="mt-2 text-sm text-slate-600">{description}</p>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700">
              Approval Notes (Optional)
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add verification or review notes..."
              className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-brand focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {loading ? "Processing..." : confirmLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
