import { Link } from "react-router-dom";
import {
  Eye,
  Pencil,
  Send,
  PauseCircle,
  PlayCircle,
  Lock,
  Archive,
  Trash2,
  ShieldCheck,
} from "lucide-react";

export function JobActionMenu({ job, onAction }) {
  const canEdit = job.canEdit;
  const canManage = job.canManageLifecycle;
  const canDelete = job.canDelete;

  const canPublish =
    canManage && ["DRAFT", "REJECTED"].includes(job.status);
  const canPause = canManage && job.status === "PUBLISHED";
  const canResume = canManage && job.status === "PAUSED";
  const canClose =
    canManage && ["PUBLISHED", "PAUSED", "EXPIRED"].includes(job.status);
  const canArchive =
    canManage &&
    ["DRAFT", "CLOSED", "EXPIRED", "REJECTED"].includes(job.status);

  return (
    <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
      <Link
        to={`/app/jobs/${job.id}/manage`}
        title="View Job Details"
        className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      >
        <Eye size={14} />
      </Link>

      <Link
        to={`/app/jobs/${job.id}/publishing`}
        title="Publishing & Lifecycle Status"
        className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-blue-50 hover:text-brand"
      >
        <ShieldCheck size={14} />
      </Link>

      {canEdit && (
        <Link
          to={`/app/jobs/${job.id}/edit`}
          title="Edit Job"
          className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        >
          <Pencil size={14} />
        </Link>
      )}

      {canPublish && (
        <button
          type="button"
          title="Publish Job"
          onClick={() => onAction("publish", job)}
          className="inline-flex items-center gap-1 rounded-lg bg-brand px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
        >
          <Send size={12} />
          Publish
        </button>
      )}

      {canPause && (
        <button
          type="button"
          title="Pause Job"
          onClick={() => onAction("pause", job)}
          className="rounded-lg border border-orange-200 bg-orange-50 p-2 text-orange-700 hover:bg-orange-100"
        >
          <PauseCircle size={14} />
        </button>
      )}

      {canResume && (
        <button
          type="button"
          title="Resume Job"
          onClick={() => onAction("resume", job)}
          className="rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-emerald-700 hover:bg-emerald-100"
        >
          <PlayCircle size={14} />
        </button>
      )}

      {canClose && (
        <button
          type="button"
          title="Close Job"
          onClick={() => onAction("close", job)}
          className="rounded-lg border border-slate-200 bg-slate-100 p-2 text-slate-700 hover:bg-slate-200"
        >
          <Lock size={14} />
        </button>
      )}

      {canArchive && (
        <button
          type="button"
          title="Archive Job"
          onClick={() => onAction("archive", job)}
          className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
        >
          <Archive size={14} />
        </button>
      )}

      {canDelete && (
        <button
          type="button"
          title="Delete Job"
          onClick={() => onAction("delete", job)}
          className="rounded-lg border border-red-200 p-2 text-red-500 hover:bg-red-50 hover:text-red-700"
        >
          <Trash2 size={14} />
        </button>
      )}
    </div>
  );
}
