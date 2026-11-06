import { useState } from "react";
import {
  FileText,
  Star,
  Download,
  History,
  RefreshCw,
  Trash2,
  Loader2,
  FileCheck2,
} from "lucide-react";
import { toast } from "sonner";
import { profileApi } from "../api/profileApi";
import { formatFileSize } from "../../applications/schema/applicationSchemas";
import { formatDate } from "../../../utils/formatters";

const STATUS_BADGE = {
  TEXT_EXTRACTED: {
    label: "Text Indexed",
    cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  NOT_PROCESSED: {
    label: "Stored Securely",
    cls: "bg-blue-50 text-blue-700 border-blue-200",
  },
  UNSUPPORTED: {
    label: "Binary Stored",
    cls: "bg-slate-100 text-slate-600 border-slate-200",
  },
  FAILED: {
    label: "Stored (Raw)",
    cls: "bg-amber-50 text-amber-700 border-amber-200",
  },
};

export function ResumeCard({
  resume,
  onSetPrimary,
  onReplaceClick,
  onViewHistoryClick,
  onDeleteClick,
  isUpdating = false,
}) {
  const [downloading, setDownloading] = useState(false);

  async function handleDownload() {
    if (downloading) return;
    setDownloading(true);
    try {
      const blob = await profileApi.downloadResumeBlob(resume.id, {
        download: true,
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = resume.originalFileName || "resume.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(
        err?.response?.data?.message || "Failed to download resume."
      );
    } finally {
      setDownloading(false);
    }
  }

  const procBadge =
    STATUS_BADGE[resume.resumeStatus] || STATUS_BADGE.NOT_PROCESSED;

  return (
    <div
      className={`flex flex-col justify-between rounded-2xl border p-5 transition ${
        resume.isPrimary
          ? "border-brand bg-blue-50/25 shadow-sm"
          : "border-slate-200 bg-white hover:border-slate-300"
      }`}
    >
      <div>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3.5">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blue-50 text-brand">
              <FileText size={21} />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  {resume.title || resume.originalFileName}
                </h3>
                {resume.isPrimary && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-brand px-2.5 py-0.5 text-[11px] font-bold text-white">
                    <Star size={11} className="fill-white" /> Primary
                  </span>
                )}
                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                  v{resume.version || 1}
                </span>
                <span
                  className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${procBadge.cls}`}
                >
                  {procBadge.label}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {resume.originalFileName} · {resume.fileType} ·{" "}
                {formatFileSize(resume.fileSize)}
              </p>
              <p className="mt-0.5 text-xs text-slate-400">
                Uploaded on {formatDate(resume.uploadedAt)}
                {resume.applicationsCount > 0 && (
                  <span className="ml-2 inline-flex items-center gap-1 font-medium text-emerald-700">
                    · <FileCheck2 size={12} /> Used in {resume.applicationsCount}{" "}
                    {resume.applicationsCount === 1
                      ? "application"
                      : "applications"}
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Toolbar */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3.5">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            {downloading ? (
              <Loader2 size={13} className="animate-spin text-brand" />
            ) : (
              <Download size={13} className="text-brand" />
            )}
            Download
          </button>

          <button
            type="button"
            onClick={() => onReplaceClick && onReplaceClick(resume)}
            disabled={isUpdating}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw size={13} />
            Replace (New Version)
          </button>

          <button
            type="button"
            onClick={() => onViewHistoryClick && onViewHistoryClick(resume)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <History size={13} />
            Versions & Details
          </button>
        </div>

        <div className="flex items-center gap-2">
          {!resume.isPrimary && onSetPrimary && (
            <button
              type="button"
              onClick={() => onSetPrimary(resume.id)}
              disabled={isUpdating}
              className="inline-flex items-center gap-1 rounded-xl bg-blue-50 px-3 py-1.5 text-xs font-semibold text-brand hover:bg-blue-100"
            >
              <Star size={13} />
              Set Primary
            </button>
          )}

          {onDeleteClick && (
            <button
              type="button"
              onClick={() => onDeleteClick(resume)}
              disabled={isUpdating}
              className="inline-flex items-center gap-1 rounded-xl border border-red-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
            >
              <Trash2 size={13} />
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
