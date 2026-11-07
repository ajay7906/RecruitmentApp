import { useState } from "react";
import { Link } from "react-router-dom";
import { X, MessageSquarePlus, ExternalLink } from "lucide-react";

const STATUS_BADGES = {
  OPEN: "bg-rose-50 text-rose-700 border-rose-200",
  UNDER_REVIEW: "bg-amber-50 text-amber-700 border-amber-200",
  RESOLVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  DISMISSED: "bg-slate-100 text-slate-600 border-slate-200",
};

export function ReportDetails({
  report,
  administrators = [],
  canManage = false,
  onClose,
  onUpdateStatus,
  onAssign,
  onAddNote,
}) {
  const [status, setStatus] = useState(report?.status || "OPEN");
  const [resolutionNotes, setResolutionNotes] = useState(report?.resolutionNotes || "");
  const [noteText, setNoteText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!report) return null;

  const entityLink =
    report.entityType === "USER"
      ? `/admin/users/${report.entityId}`
      : report.entityType === "COMPANY"
      ? `/admin/companies/${report.entityId}`
      : `/admin/jobs/${report.entityId}`;

  async function handleStatusSave(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onUpdateStatus({ status, resolutionNotes });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAddNote(e) {
    e.preventDefault();
    if (noteText.trim().length < 2) return;
    setSubmitting(true);
    try {
      await onAddNote({ note: noteText.trim() });
      setNoteText("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                  STATUS_BADGES[report.status] || STATUS_BADGES.OPEN
                }`}
              >
                {report.status}
              </span>
              <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700">
                {report.entityType} REPORT
              </span>
            </div>
            <h3 className="mt-2 text-lg font-bold text-slate-900">{report.reason}</h3>
            <p className="text-xs text-slate-500">
              Submitted {new Date(report.createdAt).toLocaleString()} by{" "}
              {report.reporter?.fullName || report.reporter?.email || "Anonymous User"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>

        {report.description && (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-sm text-slate-700">
            {report.description}
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-3.5">
          <div>
            <p className="text-xs font-semibold uppercase text-slate-400">
              Reported {report.entityType}
            </p>
            <p className="mt-0.5 text-sm font-bold text-slate-900">
              {report.targetEntity?.title ||
                report.targetEntity?.name ||
                report.targetEntity?.fullName ||
                report.entityId}
            </p>
          </div>
          <Link
            to={entityLink}
            onClick={onClose}
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-50 px-3 py-1.5 text-xs font-semibold text-brand hover:bg-blue-100"
          >
            Inspect {report.entityType} <ExternalLink size={13} />
          </Link>
        </div>

        {canManage && (
          <div className="mt-5 grid gap-4 rounded-2xl border border-slate-200 bg-slate-50/60 p-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Assigned Administrator
              </label>
              <select
                value={report.assignedAdminId || ""}
                onChange={(e) => onAssign({ assignedAdminId: e.target.value || null })}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800"
              >
                <option value="">Unassigned</option>
                {administrators.map((adm) => (
                  <option key={adm.id} value={adm.id}>
                    {adm.fullName} ({adm.adminRole})
                  </option>
                ))}
              </select>
            </div>

            <form onSubmit={handleStatusSave} className="space-y-2 sm:col-span-2">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Moderation Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800"
                  >
                    <option value="OPEN">OPEN</option>
                    <option value="UNDER_REVIEW">UNDER_REVIEW</option>
                    <option value="RESOLVED">RESOLVED</option>
                    <option value="DISMISSED">DISMISSED</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Resolution Summary
                  </label>
                  <input
                    type="text"
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    placeholder="Action taken or dismissal reason..."
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-brand px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  Save Moderation Status
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="mt-5">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Internal Investigation Notes ({report.notes?.length || 0})
          </h4>
          {canManage && (
            <form onSubmit={handleAddNote} className="mt-2 flex gap-2">
              <input
                type="text"
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Add an internal investigation note..."
                className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800"
              />
              <button
                type="submit"
                disabled={submitting || noteText.trim().length < 2}
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
              >
                <MessageSquarePlus size={14} /> Add Note
              </button>
            </form>
          )}
          <div className="mt-3 space-y-2">
            {(report.notes || []).length === 0 ? (
              <p className="text-xs text-slate-400">No internal notes recorded yet.</p>
            ) : (
              report.notes.map((n) => (
                <div key={n.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="font-semibold text-slate-800">
                      {n.author?.fullName || n.author?.email}
                    </span>
                    <span>{new Date(n.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="mt-1 text-slate-700">{n.note}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
