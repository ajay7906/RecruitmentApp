import { useState } from "react";
import { ShieldAlert, X } from "lucide-react";

export function SuspensionDialog({
  open,
  title = "Confirm Suspension",
  description = "Suspending this entity immediately revokes active access and logs the reason in the audit history.",
  confirmLabel = "Suspend",
  loading = false,
  onClose,
  onConfirm,
}) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  if (!open) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    if (reason.trim().length < 5) {
      setError("A reason of at least 5 characters is required.");
      return;
    }
    setError("");
    await onConfirm({ reason: reason.trim() });
    setReason("");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-amber-50 text-amber-600">
              <ShieldAlert size={20} />
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
              Reason <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Provide detailed justification for this action..."
              className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-brand focus:outline-none"
            />
            {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
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
              className="rounded-xl bg-amber-600 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
            >
              {loading ? "Processing..." : confirmLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
