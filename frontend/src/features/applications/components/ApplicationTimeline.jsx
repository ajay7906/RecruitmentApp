import { CheckCircle2, Clock, XCircle, RotateCcw } from "lucide-react";
import { APPLICATION_STATUS_META } from "../schema/applicationSchemas";
import { ApplicationStatusBadge } from "./ApplicationStatusBadge";
import { formatDate } from "../../../utils/formatters";

const PIPELINE_STAGES = [
  "SUBMITTED",
  "UNDER_REVIEW",
  "SHORTLISTED",
  "INTERVIEW",
  "OFFERED",
  "HIRED",
];

export function ApplicationTimeline({
  currentStatus,
  history = [],
  rejectionReason,
  withdrawalReason,
  withdrawnAt,
  showInternalNotes = false,
}) {
  const visitedStatuses = new Set(history.map((h) => h.newStatus));
  visitedStatuses.add("SUBMITTED");
  visitedStatuses.add(currentStatus);

  const currentStageIdx = PIPELINE_STAGES.indexOf(currentStatus);
  const isRejected = currentStatus === "REJECTED";
  const isWithdrawn = currentStatus === "WITHDRAWN";

  // Sort history chronologically for the step log
  const chronologicalHistory = [...history].sort(
    (a, b) => new Date(a.changedAt) - new Date(b.changedAt)
  );

  return (
    <div className="space-y-6">
      {/* Visual Horizontal / Responsive Stage Stepper */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {PIPELINE_STAGES.map((stage, idx) => {
            const isCurrent = currentStatus === stage;
            const isCompleted =
              visitedStatuses.has(stage) ||
              (currentStageIdx !== -1 && idx < currentStageIdx);

            const meta = APPLICATION_STATUS_META[stage] || { label: stage };

            return (
              <div
                key={stage}
                className={`relative flex flex-col rounded-xl border p-3 transition ${
                  isCurrent
                    ? "border-brand bg-blue-50/90 shadow-sm"
                    : isCompleted
                    ? "border-emerald-200 bg-white"
                    : "border-slate-200 bg-white/60 opacity-65"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`grid h-6 w-6 place-items-center rounded-full text-xs font-bold ${
                      isCurrent
                        ? "bg-brand text-white"
                        : isCompleted
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {isCompleted && !isCurrent ? (
                      <CheckCircle2 size={14} />
                    ) : (
                      idx + 1
                    )}
                  </span>
                  {isCurrent && (
                    <span className="rounded-md bg-brand px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                      Current
                    </span>
                  )}
                </div>
                <p
                  className={`mt-2 text-xs font-semibold ${
                    isCurrent
                      ? "text-brand"
                      : isCompleted
                      ? "text-slate-900"
                      : "text-slate-500"
                  }`}
                >
                  {meta.label}
                </p>
              </div>
            );
          })}
        </div>

        {/* Terminal Alert Banner if Rejected or Withdrawn */}
        {isRejected && (
          <div className="mt-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
            <XCircle size={18} className="mt-0.5 shrink-0 text-red-600" />
            <div>
              <p className="font-semibold">Application Not Selected (Rejected)</p>
              <p className="mt-0.5 text-xs text-red-800">
                {rejectionReason ||
                  "The hiring team has decided to move forward with other candidates for this role."}
              </p>
            </div>
          </div>
        )}

        {isWithdrawn && (
          <div className="mt-4 flex items-start gap-3 rounded-xl border border-slate-300 bg-white p-4 text-sm text-slate-800">
            <RotateCcw size={18} className="mt-0.5 shrink-0 text-slate-500" />
            <div>
              <p className="font-semibold">
                Application Withdrawn
                {withdrawnAt ? ` on ${formatDate(withdrawnAt)}` : ""}
              </p>
              {withdrawalReason && (
                <p className="mt-0.5 text-xs text-slate-600">
                  Reason: {withdrawalReason}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Detailed Chronological Activity Log */}
      {chronologicalHistory.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Status Activity History
          </h3>
          <ol className="relative ml-3 border-l border-slate-200 space-y-4">
            {chronologicalHistory.map((item, idx) => (
              <li key={item.id || idx} className="ml-5">
                <span className="absolute -left-2 flex h-4 w-4 items-center justify-center rounded-full bg-blue-100 ring-4 ring-white">
                  <Clock size={10} className="text-brand" />
                </span>
                <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {item.previousStatus && (
                        <>
                          <ApplicationStatusBadge
                            status={item.previousStatus}
                            size="sm"
                          />
                          <span className="text-xs text-slate-400">→</span>
                        </>
                      )}
                      <ApplicationStatusBadge
                        status={item.newStatus}
                        size="sm"
                      />
                    </div>
                    <span className="text-xs text-slate-500">
                      {formatDate(item.changedAt)}
                    </span>
                  </div>

                  {item.reason && (
                    <p className="mt-2 text-xs text-slate-700">
                      <strong className="font-semibold text-slate-800">
                        Update Note:
                      </strong>{" "}
                      {item.reason}
                    </p>
                  )}

                  {showInternalNotes && item.notes && (
                    <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                      <strong className="font-semibold">
                        Confidential Recruiter Note:
                      </strong>{" "}
                      {item.notes}
                    </div>
                  )}

                  {showInternalNotes && item.changedBy && (
                    <p className="mt-1.5 text-[11px] text-slate-400">
                      Updated by {item.changedBy.fullName} ({item.changedByRole})
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
