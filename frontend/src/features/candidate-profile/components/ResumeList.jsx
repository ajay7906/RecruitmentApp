import { FileText, Plus } from "lucide-react";
import { ResumeCard } from "./ResumeCard";
import { Button } from "../../../components/ui/Button";

export function ResumeList({
  resumes = [],
  isUpdating = false,
  onUploadClick,
  onSetPrimary,
  onReplaceClick,
  onViewHistoryClick,
  onDeleteClick,
}) {
  if (resumes.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 p-10 text-center">
        <FileText size={32} className="mx-auto text-slate-400" />
        <h3 className="mt-3 text-base font-bold text-slate-900">
          No resumes uploaded yet
        </h3>
        <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-slate-500">
          Upload one or multiple tailored resumes (e.g. Frontend, Backend, Full
          Stack) in PDF, DOC, or DOCX format and mark your default primary
          resume.
        </p>
        {onUploadClick && (
          <div className="mt-4">
            <Button type="button" onClick={onUploadClick} className="gap-1.5">
              <Plus size={15} />
              Upload Your First Resume
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {resumes.map((resume) => (
        <ResumeCard
          key={resume.id}
          resume={resume}
          isUpdating={isUpdating}
          onSetPrimary={onSetPrimary}
          onReplaceClick={onReplaceClick}
          onViewHistoryClick={onViewHistoryClick}
          onDeleteClick={onDeleteClick}
        />
      ))}
    </div>
  );
}
