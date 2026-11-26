import { useState } from "react";
import {
  Sparkles,
  X,
  Check,
  RefreshCw,
  BriefcaseBusiness,
  Layers,
  ListChecks,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { aiApi } from "../../../services/aiApi";
import { Button } from "../../../components/ui/Button";

export function AIJobDescriptionModal({
  isOpen,
  onClose,
  onApply,
  initialTitle = "",
  initialCompany = null,
}) {
  const [title, setTitle] = useState(initialTitle);
  const [experienceLevel, setExperienceLevel] = useState("MID");
  const [workMode, setWorkMode] = useState("HYBRID");
  const [employmentType, setEmploymentType] = useState("FULL_TIME");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [generatedResult, setGeneratedResult] = useState(null);
  const [activeTab, setActiveTab] = useState("description"); // description | responsibilities | skills

  if (!isOpen) return null;

  async function handleGenerate(e) {
    e?.preventDefault();
    if (!title.trim()) {
      toast.error("Please provide a target job title.");
      return;
    }

    setLoading(true);
    try {
      const result = await aiApi.generateJobDescription({
        title: title.trim(),
        experience_level: experienceLevel,
        work_mode: workMode,
        employment_type: employmentType,
        company_name: initialCompany?.companyName || "",
        key_requirements_or_notes: notes.trim(),
      });

      setGeneratedResult(result);
      toast.success("Job description generated successfully!");
    } catch (err) {
      toast.error(
        err?.response?.data?.message ||
          "Could not generate job description. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  function handleApply() {
    if (!generatedResult) return;
    onApply(generatedResult);
    toast.success("Applied AI Job Description to form!");
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-3xl rounded-2xl border border-slate-200 bg-white shadow-2xl transition-all">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-brand to-indigo-600 text-white shadow-xs">
              <Sparkles size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                AI Job Description Generator
              </h2>
              <p className="text-xs text-slate-500">
                Create structured, inclusive, ATS-optimized job postings in seconds.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="max-h-[75vh] overflow-y-auto p-6 space-y-6">
          {/* Controls Form */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Target Job Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Senior Full Stack Engineer, Product Designer"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Seniority Level
                </label>
                <select
                  value={experienceLevel}
                  onChange={(e) => setExperienceLevel(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand focus:outline-none"
                >
                  <option value="ENTRY">Entry Level (0-2 yrs)</option>
                  <option value="MID">Mid Level (2-5 yrs)</option>
                  <option value="SENIOR">Senior Level (5-8 yrs)</option>
                  <option value="LEAD">Lead / Staff (8+ yrs)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Work Mode & Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={workMode}
                    onChange={(e) => setWorkMode(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-900 focus:border-brand focus:outline-none"
                  >
                    <option value="REMOTE">Remote</option>
                    <option value="HYBRID">Hybrid</option>
                    <option value="ONSITE">On-site</option>
                  </select>
                  <select
                    value={employmentType}
                    onChange={(e) => setEmploymentType(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-900 focus:border-brand focus:outline-none"
                  >
                    <option value="FULL_TIME">Full Time</option>
                    <option value="PART_TIME">Part Time</option>
                    <option value="CONTRACT">Contract</option>
                    <option value="INTERNSHIP">Internship</option>
                  </select>
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Key Skills & Custom Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Must have React, PostgreSQL, Tailwind. Looking for fast execution, fintech experience."
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <Button
                type="button"
                onClick={handleGenerate}
                loading={loading}
                icon={loading ? RefreshCw : Sparkles}
                className="bg-brand text-white hover:bg-brand/90"
              >
                {loading ? "Generating Description..." : "Generate with AI"}
              </Button>
            </div>
          </div>

          {/* Result Preview */}
          {generatedResult && (
            <div className="rounded-xl border border-brand/20 bg-brand/5 p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-brand/10 pb-3">
                <div>
                  <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-brand">
                    <CheckCircle2 size={13} /> Generated Preview
                  </span>
                  <h3 className="text-base font-bold text-slate-900">
                    {generatedResult.title}
                  </h3>
                </div>

                {/* Sub-tabs */}
                <div className="flex items-center gap-1 rounded-lg bg-white p-1 shadow-xs border border-slate-200 text-xs">
                  <button
                    type="button"
                    onClick={() => setActiveTab("description")}
                    className={`rounded-md px-3 py-1 font-semibold transition ${
                      activeTab === "description"
                        ? "bg-brand text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Description
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("responsibilities")}
                    className={`rounded-md px-3 py-1 font-semibold transition ${
                      activeTab === "responsibilities"
                        ? "bg-brand text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Responsibilities ({generatedResult.responsibilities?.length || 0})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("skills")}
                    className={`rounded-md px-3 py-1 font-semibold transition ${
                      activeTab === "skills"
                        ? "bg-brand text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Skills ({generatedResult.required_skills?.length || 0})
                  </button>
                </div>
              </div>

              {/* Tab Content */}
              {activeTab === "description" && (
                <div className="space-y-3">
                  <div className="rounded-lg bg-white p-3.5 border border-slate-200">
                    <p className="text-xs font-semibold uppercase text-slate-400 mb-1">
                      Summary
                    </p>
                    <p className="text-sm text-slate-700 leading-relaxed">
                      {generatedResult.summary}
                    </p>
                  </div>
                  <div className="rounded-lg bg-white p-3.5 border border-slate-200">
                    <p className="text-xs font-semibold uppercase text-slate-400 mb-1">
                      Full Description Markdown
                    </p>
                    <pre className="whitespace-pre-wrap font-sans text-xs text-slate-700 leading-relaxed max-h-56 overflow-y-auto">
                      {generatedResult.description}
                    </pre>
                  </div>
                </div>
              )}

              {activeTab === "responsibilities" && (
                <div className="rounded-lg bg-white p-4 border border-slate-200">
                  <ul className="space-y-2">
                    {generatedResult.responsibilities?.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-slate-700">
                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-brand shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {activeTab === "skills" && (
                <div className="rounded-lg bg-white p-4 border border-slate-200 space-y-4">
                  <div>
                    <p className="text-xs font-semibold text-slate-700 mb-2">
                      Required Skills
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {generatedResult.required_skills?.map((sk, idx) => (
                        <span
                          key={idx}
                          className="rounded-full bg-brand/10 border border-brand/20 px-3 py-1 text-xs font-medium text-brand"
                        >
                          {sk}
                        </span>
                      ))}
                    </div>
                  </div>

                  {generatedResult.preferred_skills?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-slate-700 mb-2">
                        Preferred / Nice to Have
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {generatedResult.preferred_skills?.map((sk, idx) => (
                          <span
                            key={idx}
                            className="rounded-full bg-slate-100 border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700"
                          >
                            {sk}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-100 flex items-center gap-4 text-xs text-slate-500">
                    <span>
                      <strong>Suggested Exp:</strong> {generatedResult.min_experience_years ?? 2} -{" "}
                      {generatedResult.max_experience_years ?? 5} yrs
                    </span>
                    <span>
                      <strong>Education:</strong> {generatedResult.suggested_education_level ?? "BACHELORS"}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-6 py-4 rounded-b-2xl">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="text-slate-600"
          >
            Cancel
          </Button>

          {generatedResult && (
            <Button
              type="button"
              onClick={handleApply}
              icon={Check}
              className="bg-brand text-white hover:bg-brand/90"
            >
              Apply to Job Form
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
