import { useQuery } from "@tanstack/react-query";
import { X, History, Download, FileText, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { profileApi } from "../api/profileApi";
import { formatFileSize } from "../../applications/schema/applicationSchemas";
import { formatDate } from "../../../utils/formatters";

export function ResumeVersionHistory({ resumeId, open, onClose }) {
  const query = useQuery({
    queryKey: ["candidate", "resume-details", resumeId],
    queryFn: () => profileApi.getResumeDetails(resumeId),
    enabled: Boolean(open && resumeId),
  });

  if (!open || !resumeId) return null;

  const payload = query.data?.data ?? query.data ?? {};
  const resume = payload.resume;
  const versions = payload.versionHistory || [];
  const extractedPreview = payload.extractedTextPreview;

  async function handleDownloadVersion(ver) {
    try {
      const blob = await profileApi.downloadResumeBlob(ver.id, {
        download: true,
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = ver.originalFileName || `resume-v${ver.version}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(
        err?.response?.data?.message || "Could not download this version."
      );
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
      <div className="max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-blue-50 text-brand">
              <History size={18} />
            </span>
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Resume Version History & Processing Details
              </h3>
              <p className="text-xs text-slate-500">
                {resume?.title || "Resume Lineage"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={18} />
          </button>
        </div>

        {query.isPending ? (
          <div className="py-10 text-center text-sm text-slate-500">
            Loading version history...
          </div>
        ) : (
          <div className="mt-5 space-y-5">
            {/* Version Chain */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Version Lineage ({versions.length})
              </h4>
              <div className="mt-2.5 space-y-2.5">
                {versions.map((ver) => (
                  <div
                    key={ver.id}
                    className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3.5 ${
                      ver.isLatestVersion
                        ? "border-blue-200 bg-blue-50/40"
                        : "border-slate-200 bg-slate-50/60"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="rounded-lg bg-brand px-2.5 py-1 text-xs font-bold text-white">
                        v{ver.version}
                      </span>
                      <div>
                        <p className="text-xs font-bold text-slate-900">
                          {ver.originalFileName}{" "}
                          {ver.isLatestVersion && (
                            <span className="ml-1.5 text-[11px] font-semibold text-emerald-700">
                              (Current Version)
                            </span>
                          )}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Uploaded {formatDate(ver.uploadedAt)} ·{" "}
                          {formatFileSize(ver.fileSize)} ·{" "}
                          {ver.applicationsCount || 0} linked application(s)
                        </p>
                      </div>
                    </div>

                    {!ver.isDeleted && (
                      <button
                        type="button"
                        onClick={() => handleDownloadVersion(ver)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        <Download size={13} />
                        Download v{ver.version}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Document Processing Status & Extracted Plain Text Preview */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText size={16} className="text-brand" />
                  <h4 className="text-xs font-bold text-slate-900">
                    Document Text Processing Status
                  </h4>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-0.5 text-xs font-semibold text-slate-700 border border-slate-200">
                  <CheckCircle2 size={12} className="text-emerald-600" />
                  {resume?.resumeStatus || "STORED"}
                </span>
              </div>

              {extractedPreview ? (
                <div className="mt-3">
                  <p className="text-[11px] text-slate-500 mb-1.5">
                    Extracted plain text reference ({resume?.extractedCharCount}{" "}
                    characters indexed for future search/matching):
                  </p>
                  <pre className="max-h-44 overflow-y-auto whitespace-pre-wrap rounded-lg border border-slate-200 bg-white p-3 font-mono text-[11px] leading-5 text-slate-700">
                    {extractedPreview}
                  </pre>
                </div>
              ) : (
                <p className="mt-2 text-xs text-slate-500">
                  Original resume document is validated and stored securely.
                  Structured profile fields remain under your manual control.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
