import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { applicationsApi } from "../api/applicationsApi";

export function ResumeDownload({
  applicationId,
  fileName = "resume.pdf",
  asRecruiter = false,
  className = "",
  label = "Download Resume",
}) {
  const [downloading, setDownloading] = useState(false);

  async function handleDownload() {
    if (!applicationId || downloading) return;
    setDownloading(true);
    try {
      const blob = await applicationsApi.fetchApplicationResumeBlob(
        applicationId,
        {
          download: true,
          asRecruiter,
        }
      );
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName || "resume.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(
        err?.response?.data?.message ||
          "Could not download resume. Please verify your access permissions."
      );
    } finally {
      setDownloading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={downloading}
      className={
        className ||
        "inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
      }
    >
      {downloading ? (
        <Loader2 size={14} className="animate-spin text-brand" />
      ) : (
        <Download size={14} className="text-brand" />
      )}
      {downloading ? "Downloading..." : label}
    </button>
  );
}
