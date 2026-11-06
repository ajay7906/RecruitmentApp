import { useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "../../../components/ui/Button";

export function WithdrawalDialog({
  open,
  jobTitle,
  companyName,
  isPending = false,
  onClose,
  onConfirm,
}) {
  const [reason, setReason] = useState("");

  if (!open) return null;

  function handleSubmit(e) {
    e.preventDefault();
    onConfirm({ reason: reason.trim() || null });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-700">
              <AlertTriangle size={20} />
            </span>
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Withdraw Application?
              </h3>
              <p className="text-xs text-slate-500">
                {jobTitle ? `${jobTitle}` : "Selected role"}
                {companyName ? ` · ${companyName}` : ""}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <p className="text-sm leading-6 text-slate-600">
            Withdrawing your application will notify the hiring team that you no
            longer wish to be considered for this vacancy. Withdrawn applications
            cannot be reopened.
          </p>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">
              Reason for withdrawal (optional)
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={1000}
              placeholder="e.g. Accepted another offer, role location changed..."
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-blue-500/15"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <Button
              type="button"
              variant="secondary"
              disabled={isPending}
              onClick={onClose}
            >
              Keep Application
            </Button>
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center justify-center rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
            >
              {isPending ? "Withdrawing..." : "Confirm Withdrawal"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
