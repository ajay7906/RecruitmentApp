import { useState, useEffect } from "react";
import { X, AlertTriangle } from "lucide-react";
import { Button } from "../../../components/ui/Button";
import { profileInputClass } from "../../candidate-profile/components/ProfileField";

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "primary",
  requireReason = false,
  reasonLabel = "Reason *",
  reasonPlaceholder = "Provide a clear reason...",
  isPending = false,
  onConfirm,
  onClose,
}) {
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState("");

  useEffect(() => {
    if (open) {
      setReason("");
      setReasonError("");
    }
  }, [open]);

  if (!open) return null;

  function handleSubmit(e) {
    e.preventDefault();
    if (requireReason && reason.trim().length < 5) {
      setReasonError("Please enter a reason of at least 5 characters.");
      return;
    }
    onConfirm(requireReason ? reason.trim() : undefined);
  }

  const confirmButtonClass =
    variant === "danger"
      ? "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-200"
      : "";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
                variant === "danger"
                  ? "bg-red-50 text-red-600"
                  : "bg-blue-50 text-brand"
              }`}
            >
              <AlertTriangle size={20} />
            </div>
            <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {description && (
            <p className="text-sm leading-6 text-slate-600">{description}</p>
          )}

          {requireReason && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                {reasonLabel}
              </label>
              <textarea
                rows={3}
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  if (reasonError) setReasonError("");
                }}
                placeholder={reasonPlaceholder}
                className={`${profileInputClass} resize-none`}
              />
              {reasonError && (
                <p className="mt-1 text-xs text-red-600">{reasonError}</p>
              )}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isPending}
            >
              {cancelLabel}
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className={confirmButtonClass}
            >
              {isPending ? "Processing..." : confirmLabel}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
