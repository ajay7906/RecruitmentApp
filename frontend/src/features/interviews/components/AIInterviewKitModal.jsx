import { useState } from "react";
import {
  Sparkles,
  X,
  Copy,
  Check,
  RefreshCw,
  HelpCircle,
  Award,
  Layers,
  ChevronDown,
  ChevronUp,
  FileQuestion,
  Star,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { aiApi } from "../../../services/aiApi";
import { Button } from "../../../components/ui/Button";

const ROUND_TYPES = [
  { id: "TECHNICAL", label: "Technical Deep-Dive", desc: "Core skills, hands-on implementation & debugging" },
  { id: "SYSTEM_DESIGN", label: "System Design & Architecture", desc: "Scale, data design, reliability & trade-offs" },
  { id: "BEHAVIORAL", label: "Behavioral & Culture Fit", desc: "Teamwork, communication, conflict resolution & grit" },
  { id: "INITIAL_SCREEN", label: "Initial Screening", desc: "Career timeline, compensation, availability & resume verification" },
];

export function AIInterviewKitModal({
  isOpen,
  onClose,
  applicationId,
  jobId,
  candidateName = "Candidate",
  jobTitle = "Role",
}) {
  const [selectedRound, setSelectedRound] = useState("TECHNICAL");
  const [loading, setLoading] = useState(false);
  const [kit, setKit] = useState(null);
  const [expandedIndices, setExpandedIndices] = useState({});
  const [questionScores, setQuestionScores] = useState({});
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  async function handleGenerate() {
    setLoading(true);
    try {
      const data = await aiApi.generateTailoredInterviewQuestions({
        applicationId,
        jobId,
        roundType: selectedRound,
      });
      setKit(data);
      // Expand all by default
      const allExpanded = {};
      (data.questions || []).forEach((_, idx) => {
        allExpanded[idx] = true;
      });
      setExpandedIndices(allExpanded);
      setQuestionScores({});
      toast.success("Tailored interview questions generated!");
    } catch (err) {
      toast.error(
        err?.response?.data?.message ||
          "Could not generate tailored interview kit. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  function toggleExpand(idx) {
    setExpandedIndices((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  }

  function handleScore(idx, score) {
    setQuestionScores((prev) => ({
      ...prev,
      [idx]: prev[idx] === score ? undefined : score,
    }));
  }

  function handleCopyAll() {
    if (!kit || !kit.questions?.length) return;
    const lines = [
      `# Tailored Interview Kit: ${kit.candidate_name || candidateName} for ${kit.job_title || jobTitle}`,
      `Round: ${kit.interview_round}`,
      `Focus: ${kit.overall_interview_focus}`,
      "",
      "---",
      "",
    ];

    kit.questions.forEach((q, i) => {
      lines.push(`### ${i + 1}. [${q.category}] (${q.difficulty})`);
      lines.push(`**Question:** ${q.question}`);
      lines.push(`**Context / Rationale:** ${q.context_or_rationale}`);
      if (q.what_to_look_for?.length) {
        lines.push("**Key Signals to Listen For:**");
        q.what_to_look_for.forEach((sig) => lines.push(`- ${sig}`));
      }
      lines.push("");
    });

    navigator.clipboard.writeText(lines.join("\n"));
    setCopied(true);
    toast.success("Interview kit copied to clipboard!");
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-4xl rounded-2xl border border-slate-200 bg-white shadow-2xl transition-all">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-brand text-white shadow-xs">
              <FileQuestion size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">
                  Tailored AI Interview Kit
                </h2>
                <span className="rounded-full bg-brand/10 px-2.5 py-0.5 text-xs font-semibold text-brand">
                  Gemini Bar-Raiser
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Customized for <strong>{candidateName}</strong> applying for{" "}
                <strong>{jobTitle}</strong>.
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
          {/* Round Selector Bar */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Select Interview Stage
            </label>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
              {ROUND_TYPES.map((r) => {
                const isSelected = selectedRound === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setSelectedRound(r.id)}
                    className={`flex flex-col text-left rounded-xl border p-3 transition ${
                      isSelected
                        ? "border-brand bg-white shadow-sm ring-2 ring-brand/20"
                        : "border-slate-200 bg-white/70 hover:border-slate-300 hover:bg-white"
                    }`}
                  >
                    <span
                      className={`text-xs font-bold ${
                        isSelected ? "text-brand" : "text-slate-800"
                      }`}
                    >
                      {r.label}
                    </span>
                    <span className="mt-1 text-[11px] text-slate-500 leading-tight">
                      {r.desc}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-slate-200/70 pt-3">
              <p className="text-xs text-slate-500">
                Analyzes resume text, parsed technical skills, and job description requirements.
              </p>
              <Button
                type="button"
                onClick={handleGenerate}
                loading={loading}
                icon={loading ? RefreshCw : Sparkles}
                className="bg-brand text-white hover:bg-brand/90"
              >
                {loading ? "Synthesizing Questions..." : kit ? "Regenerate Questions" : "Generate Interview Questions"}
              </Button>
            </div>
          </div>

          {/* Generated Questions List */}
          {kit ? (
            <div className="space-y-4">
              {/* Focus Banner */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-indigo-100 bg-indigo-50/60 p-4">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700">
                    Target Evaluation Focus
                  </span>
                  <p className="mt-0.5 text-xs text-indigo-900 leading-relaxed font-medium">
                    {kit.overall_interview_focus}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCopyAll}
                  icon={copied ? Check : Copy}
                  className="bg-white text-xs border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                >
                  {copied ? "Copied All" : "Copy Questions"}
                </Button>
              </div>

              {/* Questions */}
              <div className="space-y-3">
                {kit.questions?.map((q, idx) => {
                  const isExpanded = expandedIndices[idx];
                  const currentScore = questionScores[idx];
                  return (
                    <div
                      key={idx}
                      className="rounded-xl border border-slate-200 bg-white shadow-xs transition hover:border-slate-300"
                    >
                      {/* Question Top Bar */}
                      <div className="flex items-start justify-between gap-3 p-4">
                        <div className="flex items-start gap-3">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700">
                            {idx + 1}
                          </span>
                          <div>
                            <div className="flex flex-wrap items-center gap-2 mb-1.5">
                              <span className="rounded-md bg-brand/10 px-2 py-0.5 text-[11px] font-semibold text-brand">
                                {q.category}
                              </span>
                              <span
                                className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                                  q.difficulty === "Advanced"
                                    ? "bg-purple-100 text-purple-700"
                                    : q.difficulty === "Basic"
                                    ? "bg-slate-100 text-slate-700"
                                    : "bg-blue-100 text-blue-700"
                                }`}
                              >
                                {q.difficulty}
                              </span>
                            </div>
                            <h4 className="text-sm font-semibold text-slate-900 leading-snug">
                              {q.question}
                            </h4>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* Live Scorecard 1 to 5 */}
                          <div className="hidden sm:flex items-center gap-1 rounded-lg bg-slate-50 border border-slate-200 p-1 mr-2">
                            <span className="text-[10px] font-semibold text-slate-400 px-1">
                              Rating:
                            </span>
                            {[1, 2, 3, 4, 5].map((num) => (
                              <button
                                key={num}
                                type="button"
                                onClick={() => handleScore(idx, num)}
                                className={`h-5 w-5 rounded text-[11px] font-bold transition ${
                                  currentScore === num
                                    ? "bg-brand text-white shadow-xs"
                                    : "text-slate-600 hover:bg-slate-200"
                                }`}
                              >
                                {num}
                              </button>
                            ))}
                          </div>

                          <button
                            type="button"
                            onClick={() => toggleExpand(idx)}
                            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                          >
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                        </div>
                      </div>

                      {/* Expandable Details: Context & What to Look For */}
                      {isExpanded && (
                        <div className="border-t border-slate-100 bg-slate-50/50 p-4 space-y-3 rounded-b-xl text-xs">
                          <div>
                            <span className="font-semibold text-slate-700">
                              Why ask this (Context & Rationale):
                            </span>
                            <p className="mt-0.5 text-slate-600 leading-relaxed">
                              {q.context_or_rationale}
                            </p>
                          </div>

                          {q.what_to_look_for?.length > 0 && (
                            <div>
                              <span className="font-semibold text-slate-700">
                                Key Signals / What to Look For:
                              </span>
                              <ul className="mt-1 space-y-1">
                                {q.what_to_look_for.map((sig, sigIdx) => (
                                  <li
                                    key={sigIdx}
                                    className="flex items-start gap-2 text-slate-600"
                                  >
                                    <CheckCircle2
                                      size={13}
                                      className="mt-0.5 text-emerald-600 shrink-0"
                                    />
                                    <span>{sig}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center bg-white">
              <FileQuestion className="mx-auto text-slate-400" size={32} />
              <h4 className="mt-2 text-sm font-semibold text-slate-800">
                Ready to generate tailored interview questions
              </h4>
              <p className="mx-auto mt-1 max-w-sm text-xs text-slate-500">
                Choose an interview round above and click Generate to produce role-specific, candidate-customized interview questions with structured scoring rubrics.
              </p>
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
            Close
          </Button>

          {kit && (
            <Button
              type="button"
              variant="outline"
              icon={copied ? Check : Copy}
              onClick={handleCopyAll}
              className="text-xs"
            >
              {copied ? "Copied to Clipboard" : "Export Kit to Clipboard"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
