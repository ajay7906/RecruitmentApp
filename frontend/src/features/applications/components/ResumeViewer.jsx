import { useEffect, useState } from "react";
import { FileText, Eye, EyeOff, Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { applicationsApi } from "../api/applicationsApi";
import { formatFileSize } from "../schema/applicationSchemas";
import { ResumeDownload } from "./ResumeDownload";

export function ResumeViewer({
  applicationId,
  hasResume,
  fileName,
  mimeType,
  fileSize,
  asRecruiter = false,
}) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [blobUrl, setBlobUrl] = useState(null);

  useEffect(() => {
    return () => {
      if (blobUrl) {
        window.URL.revokeObjectURL(blobUrl);
      }
    };
  }, [blobUrl]);

  if (!hasResume) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">
        No resume document was attached to this application.
      </div>
    );
  }

  const isPdf =
    mimeType === "application/pdf" ||
    String(fileName || "").toLowerCase().endsWith(".pdf");

  async function togglePreview() {
    if (previewOpen) {
      setPreviewOpen(false);
      return;
    }

    if (blobUrl) {
      setPreviewOpen(true);
      return;
    }

    setLoadingPreview(true);
    try {
      const blob = await applicationsApi.fetchApplicationResumeBlob(
        applicationId,
        {
          download: false,
          asRecruiter,
        }
      );
      const pdfBlob = isPdf
        ? new Blob([blob], { type: "application/pdf" })
        : blob;
      const objectUrl = window.URL.createObjectURL(pdfBlob);
      setBlobUrl(objectUrl);
      setPreviewOpen(true);
    } catch (err) {
      toast.error(
        err?.response?.data?.message || "Could not load resume preview."
      );
    } finally {
      setLoadingPreview(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-100 text-brand">
            <FileText size={20} />
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-900">
              {fileName || "Submitted Resume"}
            </p>
            <p className="text-xs text-slate-500">
              {mimeType || "Resume Document"}
              {fileSize ? ` · ${formatFileSize(fileSize)}` : ""}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isPdf && (
            <button
              type="button"
              onClick={togglePreview}
              disabled={loadingPreview}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              {loadingPreview ? (
                <Loader2 size={14} className="animate-spin text-brand" />
              ) : previewOpen ? (
                <EyeOff size={14} className="text-slate-500" />
              ) : (
                <Eye size={14} className="text-brand" />
              )}
              {previewOpen ? "Hide Preview" : "View Resume"}
            </button>
          )}

          {blobUrl && (
            <a
              href={blobUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <ExternalLink size={13} />
              Open Tab
            </a>
          )}

          <ResumeDownload
            applicationId={applicationId}
            fileName={fileName}
            asRecruiter={asRecruiter}
          />
        </div>
      </div>

      {previewOpen && blobUrl && isPdf && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-900/5">
          <iframe
            src={blobUrl}
            title={fileName || "Resume Preview"}
            className="h-[560px] w-full border-0"
          />
        </div>
      )}
    </div>
  );
}
