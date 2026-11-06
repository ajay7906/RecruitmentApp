import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  FileText,
  Upload,
  CheckCircle2,
  UserRound,
  HelpCircle,
  Send,
  Trash2,
  Plus,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  ALLOWED_RESUME_MIME_TYPES,
  MAX_RESUME_SIZE_BYTES,
  formatFileSize,
} from "../schema/applicationSchemas";
import { Button } from "../../../components/ui/Button";
import { profileInputClass } from "../../candidate-profile/components/ProfileField";
import { PrimaryResumeSelector } from "../../candidate-profile/components/PrimaryResumeSelector";

function normalizeInitialSkills(rawSkills = []) {
  if (!Array.isArray(rawSkills)) return [];
  return rawSkills
    .map((item) => (typeof item === "string" ? item : item?.name || ""))
    .map((s) => s.trim())
    .filter(Boolean);
}

export function ApplicationForm({
  job,
  candidateProfile,
  user,
  isSubmitting = false,
  onSubmitApplication,
  onCancel,
}) {
  const fileInputRef = useRef(null);
  const storedResumes = Array.isArray(candidateProfile?.resumes)
    ? candidateProfile.resumes
    : [];
  const defaultResume =
    storedResumes.find((r) => r.isPrimary) || storedResumes[0] || null;
  const hasSavedResume =
    storedResumes.length > 0 || Boolean(candidateProfile?.hasResume);

  const [selectedResumeId, setSelectedResumeId] = useState(
    defaultResume?.id || ""
  );
  const [useProfileResume, setUseProfileResume] = useState(hasSavedResume);
  const [saveResumeToProfile, setSaveResumeToProfile] = useState(true);
  const [resumeUpload, setResumeUpload] = useState(null);

  const [coverLetter, setCoverLetter] = useState("");
  const [additionalInformation, setAdditionalInformation] = useState("");
  const [skills, setSkills] = useState(() =>
    normalizeInitialSkills(candidateProfile?.skills)
  );
  const [skillInput, setSkillInput] = useState("");

  const questions = Array.isArray(job?.applicationQuestions)
    ? job.applicationQuestions
    : [];

  const [answersMap, setAnswersMap] = useState(() => {
    const initial = {};
    for (const q of questions) {
      const key = q.id || q.question;
      initial[key] = q.type === "Multiple Choice" ? [] : "";
    }
    return initial;
  });

  function handleFileChange(e) {
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

    if (file.size > MAX_RESUME_SIZE_BYTES) {
      toast.error("Resume file size must be 5 MB or smaller.");
      e.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setResumeUpload({
          fileName: file.name,
          mimeType: file.type || "application/pdf",
          fileSize: file.size,
          contentBase64: reader.result,
        });
        setUseProfileResume(false);
      }
    };
    reader.onerror = () => {
      toast.error("Could not read the selected resume file.");
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function handleAddSkill() {
    const trimmed = skillInput.trim();
    if (!trimmed) return;
    if (!skills.includes(trimmed)) {
      setSkills((prev) => [...prev, trimmed]);
    }
    setSkillInput("");
  }

  function handleRemoveSkill(skillToRemove) {
    setSkills((prev) => prev.filter((s) => s !== skillToRemove));
  }

  function handleQuestionChange(key, value) {
    setAnswersMap((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function handleMultiChoiceToggle(key, optionVal) {
    setAnswersMap((prev) => {
      const current = Array.isArray(prev[key]) ? prev[key] : [];
      const exists = current.includes(optionVal);
      return {
        ...prev,
        [key]: exists
          ? current.filter((x) => x !== optionVal)
          : [...current, optionVal],
      };
    });
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (isSubmitting) return;

    const hasValidResume =
      Boolean(resumeUpload) ||
      Boolean(selectedResumeId) ||
      (useProfileResume && hasSavedResume);
    if (job.requireResume && !hasValidResume) {
      toast.error(
        "Please upload your resume or select one of your stored resumes."
      );
      return;
    }

    if (job.requireCoverLetter && coverLetter.trim().length < 10) {
      toast.error(
        "A cover letter (at least 10 characters) is required for this job."
      );
      return;
    }

    const formattedAnswers = [];
    for (const q of questions) {
      const key = q.id || q.question;
      const val = answersMap[key];
      const isProvided = Array.isArray(val)
        ? val.length > 0
        : String(val ?? "").trim().length > 0;

      if (q.required && !isProvided) {
        toast.error(`Please answer the mandatory question: "${q.question}"`);
        return;
      }

      formattedAnswers.push({
        questionId: String(q.id || q.question),
        question: q.question,
        type: q.type || "Short Text",
        required: Boolean(q.required),
        answer: val,
      });
    }

    onSubmitApplication({
      jobId: job.id,
      resumeId: !resumeUpload && selectedResumeId ? selectedResumeId : null,
      useProfileResume: Boolean(useProfileResume && !resumeUpload),
      saveResumeToProfile: Boolean(saveResumeToProfile),
      resumeUpload: resumeUpload
        ? {
            fileName: resumeUpload.fileName,
            mimeType: resumeUpload.mimeType,
            contentBase64: resumeUpload.contentBase64,
          }
        : null,
      coverLetter: coverLetter.trim() || null,
      answers: formattedAnswers,
      additionalInformation: additionalInformation.trim() || null,
      candidateSkills: skills,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      {/* 1. Candidate Profile Snapshot */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-blue-50 text-brand">
              <UserRound size={18} />
            </span>
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Your Candidate Profile Summary
              </h2>
              <p className="text-xs text-slate-500">
                Retrieved automatically from your structured candidate profile.
              </p>
            </div>
          </div>
          <Link
            to="/app/profile"
            className="text-xs font-semibold text-brand hover:underline"
          >
            Update Profile →
          </Link>
        </div>

        <div className="mt-4 grid gap-4 rounded-xl bg-slate-50 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs text-slate-400">Full Name</p>
            <p className="mt-0.5 text-sm font-semibold text-slate-900">
              {candidateProfile?.user?.fullName || user?.fullName || "Candidate"}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Email Address</p>
            <p className="mt-0.5 text-sm font-medium text-slate-800">
              {candidateProfile?.user?.email || user?.email}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Phone</p>
            <p className="mt-0.5 text-sm font-medium text-slate-800">
              {candidateProfile?.phone || "Not specified"}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Experience</p>
            <p className="mt-0.5 text-sm font-medium text-slate-800">
              {candidateProfile?.yearsOfExperience != null
                ? `${candidateProfile.yearsOfExperience} years`
                : "Not specified"}
            </p>
          </div>
        </div>

        {/* Relevant Skills Tagging */}
        <div className="mt-4">
          <label className="mb-1.5 block text-xs font-semibold text-slate-700">
            Relevant Skills for this Role
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddSkill();
                }
              }}
              placeholder="Add a skill (e.g. React.js, Node.js, PostgreSQL) and press Enter"
              className={profileInputClass}
            />
            <Button
              type="button"
              variant="secondary"
              onClick={handleAddSkill}
              className="shrink-0 gap-1"
            >
              <Plus size={15} />
              Add
            </Button>
          </div>
          {skills.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {skills.map((sk) => (
                <span
                  key={sk}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-brand"
                >
                  {sk}
                  <button
                    type="button"
                    onClick={() => handleRemoveSkill(sk)}
                    className="rounded-full p-0.5 hover:bg-blue-100"
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 2. Resume Section (Supports multiple stored resumes + new upload) */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-blue-50 text-brand">
              <FileText size={18} />
            </span>
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Resume / CV{" "}
                {job.requireResume && <span className="text-red-500">*</span>}
              </h2>
              <p className="text-xs text-slate-500">
                Select one of your stored resumes or upload a role-specific CV
                (PDF, DOC, DOCX up to 5 MB).
              </p>
            </div>
          </div>
          <Link
            to="/app/resumes"
            className="text-xs font-semibold text-brand hover:underline"
          >
            Manage Resumes →
          </Link>
        </div>

        <div className="mt-4 space-y-3">
          {storedResumes.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-600">
                Choose from your stored resumes:
              </p>
              <PrimaryResumeSelector
                resumes={storedResumes}
                selectedResumeId={!resumeUpload ? selectedResumeId : ""}
                onChange={(id) => {
                  setSelectedResumeId(id);
                  setUseProfileResume(true);
                  setResumeUpload(null);
                }}
              />
            </div>
          ) : hasSavedResume ? (
            <label
              className={`flex cursor-pointer items-center justify-between rounded-xl border p-4 transition ${
                useProfileResume && !resumeUpload
                  ? "border-brand bg-blue-50/50 ring-2 ring-blue-500/15"
                  : "border-slate-200 bg-slate-50/60 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  name="resumeSource"
                  checked={useProfileResume && !resumeUpload}
                  onChange={() => {
                    setUseProfileResume(true);
                    setResumeUpload(null);
                  }}
                  className="h-4 w-4 text-brand focus:ring-brand"
                />
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    Use saved profile resume:{" "}
                    <span className="text-brand">
                      {candidateProfile.resumeFileName || "resume.pdf"}
                    </span>
                  </p>
                  <p className="text-xs text-slate-500">
                    {candidateProfile.resumeFileSize
                      ? formatFileSize(candidateProfile.resumeFileSize)
                      : "Stored securely on your profile"}
                  </p>
                </div>
              </div>
              <CheckCircle2
                size={18}
                className={
                  useProfileResume && !resumeUpload
                    ? "text-brand"
                    : "text-slate-300"
                }
              />
            </label>
          ) : null}

          {/* Upload new resume option */}
          <div
            className={`rounded-xl border p-4 transition ${
              resumeUpload
                ? "border-brand bg-blue-50/40 ring-2 ring-blue-500/15"
                : "border-dashed border-slate-300 bg-white"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={handleFileChange}
              className="hidden"
            />

            {resumeUpload ? (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-100 text-brand">
                    <FileText size={20} />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {resumeUpload.fileName}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatFileSize(resumeUpload.fileSize)} · Ready to submit
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    className="py-1.5 text-xs"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Change File
                  </Button>
                  <button
                    type="button"
                    onClick={() => {
                      setResumeUpload(null);
                      if (hasSavedResume) setUseProfileResume(true);
                    }}
                    className="inline-flex items-center gap-1 rounded-lg p-2 text-xs font-semibold text-red-600 hover:bg-red-50"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    {hasSavedResume
                      ? "Or upload a new tailored resume for this role"
                      : "Upload your resume"}
                  </p>
                  <p className="text-xs text-slate-500">
                    PDF, DOC, or DOCX up to 5 MB
                  </p>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  className="gap-2 text-xs"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload size={14} />
                  Choose Resume File
                </Button>
              </div>
            )}

            {resumeUpload && (
              <label className="mt-3 flex items-center gap-2 border-t border-slate-200/70 pt-3 text-xs text-slate-600">
                <input
                  type="checkbox"
                  checked={saveResumeToProfile}
                  onChange={(e) => setSaveResumeToProfile(e.target.checked)}
                  className="rounded border-slate-300 text-brand focus:ring-brand"
                />
                Save this resume to my Resume Manager and set as Primary
              </label>
            )}
          </div>
        </div>
      </section>

      {/* 3. Dynamic Screening Questions */}
      {questions.length > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-blue-50 text-brand">
              <HelpCircle size={18} />
            </span>
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Application Questions
              </h2>
              <p className="text-xs text-slate-500">
                Please answer the employer&apos;s screening questions below.
              </p>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            {questions.map((q, idx) => {
              const key = q.id || q.question;
              const val = answersMap[key];
              const options = Array.isArray(q.options) ? q.options : [];

              return (
                <div
                  key={key || idx}
                  className="rounded-xl border border-slate-200 bg-slate-50/50 p-4"
                >
                  <label className="mb-2 block text-sm font-semibold text-slate-900">
                    {idx + 1}. {q.question}{" "}
                    {q.required && <span className="text-red-500">*</span>}
                  </label>

                  {q.type === "Long Text" ? (
                    <textarea
                      rows={3}
                      value={val || ""}
                      onChange={(e) =>
                        handleQuestionChange(key, e.target.value)
                      }
                      placeholder="Write your response..."
                      className={profileInputClass}
                    />
                  ) : q.type === "Yes/No" ? (
                    <div className="flex items-center gap-4">
                      {["Yes", "No"].map((choice) => (
                        <label
                          key={choice}
                          className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-700"
                        >
                          <input
                            type="radio"
                            name={`q-${key}`}
                            checked={val === choice}
                            onChange={() => handleQuestionChange(key, choice)}
                            className="h-4 w-4 text-brand focus:ring-brand"
                          />
                          {choice}
                        </label>
                      ))}
                    </div>
                  ) : q.type === "Single Choice" && options.length > 0 ? (
                    <div className="space-y-2">
                      {options.map((opt) => (
                        <label
                          key={opt}
                          className="flex cursor-pointer items-center gap-2 text-sm text-slate-700"
                        >
                          <input
                            type="radio"
                            name={`q-${key}`}
                            checked={val === opt}
                            onChange={() => handleQuestionChange(key, opt)}
                            className="h-4 w-4 text-brand focus:ring-brand"
                          />
                          {opt}
                        </label>
                      ))}
                    </div>
                  ) : q.type === "Multiple Choice" && options.length > 0 ? (
                    <div className="space-y-2">
                      {options.map((opt) => {
                        const checked =
                          Array.isArray(val) && val.includes(opt);
                        return (
                          <label
                            key={opt}
                            className="flex cursor-pointer items-center gap-2 text-sm text-slate-700"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() =>
                                handleMultiChoiceToggle(key, opt)
                              }
                              className="rounded border-slate-300 text-brand focus:ring-brand"
                            />
                            {opt}
                          </label>
                        );
                      })}
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={val || ""}
                      onChange={(e) =>
                        handleQuestionChange(key, e.target.value)
                      }
                      placeholder="Your answer..."
                      className={profileInputClass}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 4. Cover Letter & Additional Information */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-slate-900">
            Cover Letter{" "}
            {job.requireCoverLetter ? (
              <span className="text-red-500">*</span>
            ) : (
              <span className="text-xs font-normal text-slate-400">
                (Optional)
              </span>
            )}
          </label>
          <textarea
            rows={5}
            value={coverLetter}
            onChange={(e) => setCoverLetter(e.target.value)}
            maxLength={8000}
            placeholder="Introduce yourself, highlight relevant achievements, and explain why you are a great fit for this position..."
            className={profileInputClass}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-slate-900">
            Additional Information{" "}
            <span className="text-xs font-normal text-slate-400">
              (Optional)
            </span>
          </label>
          <textarea
            rows={3}
            value={additionalInformation}
            onChange={(e) => setAdditionalInformation(e.target.value)}
            maxLength={4000}
            placeholder="Notice period, preferred start date, portfolio notes, or anything else you want to share..."
            className={profileInputClass}
          />
        </div>
      </section>

      {/* Submit Bar */}
      <div className="flex flex-wrap items-center justify-end gap-3">
        {onCancel && (
          <Button
            type="button"
            variant="secondary"
            disabled={isSubmitting}
            onClick={onCancel}
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          disabled={isSubmitting}
          className="gap-2 px-6 py-3"
        >
          <Send size={16} />
          {isSubmitting ? "Submitting Application..." : "Submit Application"}
        </Button>
      </div>
    </form>
  );
}
