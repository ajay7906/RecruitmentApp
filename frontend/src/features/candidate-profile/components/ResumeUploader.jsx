import { useRef, useState } from "react";
import { Upload, FileText, X, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import {
  ALLOWED_RESUME_MIME_TYPES,
  MAX_RESUME_SIZE_BYTES,
  formatFileSize,
} from "../../applications/schema/applicationSchemas";
import { Button } from "../../../components/ui/Button";
import { profileInputClass } from "./ProfileField";

export function ResumeUploader({
  mode = "upload", // "upload" | "replace"
  targetResume = null,
  isPending = false,
  onSubmit,
  onCancel,
}) {
  const fileInputRef = useRef(null);
  const [title, setTitle] = useState(targetResume?.title || "");
  const [isPrimary, setIsPrimary] = useState(
    mode === "replace" ? Boolean(targetResume?.isPrimary) : true
  );
  const [selectedFile, setSelectedFile] = useState(null);

  function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split(".").pop()?.toLowerCase();
    const validExt = ["pdf", "doc", "docx"].includes(ext);

    if (!ALLOWED_RESUME_MIME_TYPES.includes(file.type) && !validExt) {
      toast.error(
        "Unsupported file format. Please upload a PDF, DOC, or DOCX resume."
      );
      e.target.value = "";
      return;
    }

    if (file.size === 0) {
      toast.error("Selected file is empty.");
      e.target.value = "";
      return;
    }

    if (file.size > MAX_RESUME_SIZE_BYTES) {
      toast.error("Resume file size must be 5 MB or smaller.");
      e.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setSelectedFile({
          fileName: file.name,
          mimeType: file.type || "application/pdf",
          fileSize: file.size,
          contentBase64: reader.result,
        });
        if (!title.trim()) {
          setTitle(file.name.replace(/\.[^/.]+$/, ""));
        }
      }
    };
    reader.onerror = () => {
      toast.error("Failed to read resume file.");
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!selectedFile) {
      toast.error("Please choose a PDF, DOC, or DOCX resume file.");
      return;
    }

    onSubmit({
      title: title.trim() || selectedFile.fileName,
      fileName: selectedFile.fileName,
      mimeType: selectedFile.mimeType,
      contentBase64: selectedFile.contentBase64,
      isPrimary,
      makePrimary: isPrimary,
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 space-y-4"
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900">
            {mode === "replace"
              ? `Upload New Version for "${targetResume?.title}" (v${
                  (targetResume?.version || 1) + 1
                })`
              : "Upload New Resume"}
          </h3>
          <p className="text-xs text-slate-500">
            {mode === "replace"
              ? "Previous version and historical job application references will be preserved."
              : "Supported formats: PDF, DOC, DOCX (Max 5 MB)."}
          </p>
        </div>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700"
          >
            <X size={16} />
          </button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">
            Resume Label / Role Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            placeholder="e.g. Full Stack Developer Resume"
            className={profileInputClass}
          />
        </div>

        <div className="flex items-end">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button
            type="button"
            variant="secondary"
            className="w-full gap-2"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={15} />
            {selectedFile ? "Change File" : "Select PDF / DOC / DOCX"}
          </Button>
        </div>
      </div>

      {selectedFile && (
        <div className="flex items-center justify-between rounded-xl border border-blue-200 bg-white p-3.5">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-blue-50 text-brand">
              <FileText size={18} />
            </span>
            <div>
              <p className="text-xs font-semibold text-slate-900">
                {selectedFile.fileName}
              </p>
              <p className="text-[11px] text-slate-500">
                {formatFileSize(selectedFile.fileSize)} · Verified locally
              </p>
            </div>
          </div>
          <CheckCircle2 size={18} className="text-emerald-600" />
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-700">
          <input
            type="checkbox"
            checked={isPrimary}
            onChange={(e) => setIsPrimary(e.target.checked)}
            className="rounded border-slate-300 text-brand focus:ring-brand"
          />
          Set as my Primary Resume
        </label>

        <div className="flex items-center gap-2">
          {onCancel && (
            <Button
              type="button"
              variant="secondary"
              disabled={isPending}
              onClick={onCancel}
            >
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isPending || !selectedFile}>
            {isPending
              ? "Uploading..."
              : mode === "replace"
              ? "Save New Version"
              : "Upload Resume"}
          </Button>
        </div>
      </div>
    </form>
  );
}
