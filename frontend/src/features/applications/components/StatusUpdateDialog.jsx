import { useEffect, useState } from "react";
import { X, CheckCircle2 } from "lucide-react";
import {
  ALLOWED_RECRUITER_TRANSITIONS,
  APPLICATION_STATUS_META,
} from "../schema/applicationSchemas";
import { ApplicationStatusBadge } from "./ApplicationStatusBadge";
import { Button } from "../../../components/ui/Button";

export function StatusUpdateDialog({
  open,
  application,
  initialTargetStatus = "",
  isPending = false,
  onClose,
  onConfirm,
}) {
  const allowedStatuses = application
    ? application.allowedNextStatuses ||
      ALLOWED_RECRUITER_TRANSITIONS[application.status] ||
      []
    : [];

  const [targetStatus, setTargetStatus] = useState(
    initialTargetStatus || allowedStatuses[0] || ""
  );
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open) {
      setTargetStatus(initialTargetStatus || allowedStatuses[0] || "");
      setReason("");
      setNotes("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialTargetStatus, application?.id]);

  if (!open || !application) return null;

  function handleSubmit(e) {
    e.preventDefault();
    if (!targetStatus) return;
    onConfirm({
      status: targetStatus,
      reason: reason.trim() || null,
      notes: notes.trim() || null,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              Update Application Status
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Candidate:{" "}
              <strong className="text-slate-700">
                {application.candidate?.fullName ||
                  application.candidateSnapshot?.fullName ||
                  "Applicant"}
              </strong>{" "}
              · Role:{" "}
              <strong className="text-slate-700">
                {application.job?.title || application.jobSnapshot?.title}
              </strong>
            </p>
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

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="flex items-center gap-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
            <span>Current Status:</span>
            <ApplicationStatusBadge status={application.status} size="sm" />
          </div>

          {allowedStatuses.length === 0 ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800">
              This application is in a terminal state ({application.status}) and
              cannot transition to another stage.
            </div>
          ) : (
            <>
              <div>
                <label className="mb-2 block text-xs font-semibold text-slate-700">
                  Select Next Stage *
                </label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {allowedStatuses.map((st) => {
                    const isSelected = targetStatus === st;
                    return (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setTargetStatus(st)}
                        className={`flex items-center justify-between rounded-xl border px-3 py-2.5 text-left text-xs font-semibold transition ${
                          isSelected
                            ? "border-brand bg-blue-50 text-brand ring-2 ring-blue-500/15"
                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <span>{APPLICATION_STATUS_META[st]?.label || st}</span>
                        {isSelected && <CheckCircle2 size={14} />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  {targetStatus === "REJECTED"
                    ? "Candidate-Visible Rejection Reason (optional)"
                    : "Status Update Reason / Candidate Message (optional)"}
                </label>
                <textarea
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  maxLength={1500}
                  placeholder={
                    targetStatus === "REJECTED"
                      ? "Provide constructive feedback or reason for rejection..."
                      : "Optional note visible on the candidate timeline..."
                  }
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Confidential Internal Recruiter Note (hidden from candidate)
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  maxLength={2000}
                  placeholder="Internal evaluation note for your hiring team..."
                  className="w-full rounded-xl border border-amber-200 bg-amber-50/30 px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:outline-none"
                />
              </div>
            </>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <Button
              type="button"
              variant="secondary"
              disabled={isPending}
              onClick={onClose}
            >
              Cancel
            </Button>
            {allowedStatuses.length > 0 && (
              <Button type="submit" disabled={isPending || !targetStatus}>
                {isPending ? "Saving..." : "Update Status"}
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
