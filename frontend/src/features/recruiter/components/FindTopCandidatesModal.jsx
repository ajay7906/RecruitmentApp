import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  X,
  Sparkles,
  Users2,
  BriefcaseBusiness,
  MapPin,
  GraduationCap,
  Award,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  FileText,
  Clock,
  Building2,
  ArrowRight,
} from "lucide-react";

import { jobsApi } from "../../jobs/api/jobsApi";
import { aiApi } from "../../../services/aiApi";
import { Button } from "../../../components/ui/Button";

function ScoreBadge({ score, category }) {
  const rounded = Math.round(score);
  let colorClass = "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (rounded < 50) {
    colorClass = "bg-rose-50 text-rose-700 border-rose-200";
  } else if (rounded < 70) {
    colorClass = "bg-amber-50 text-amber-700 border-amber-200";
  } else if (rounded < 85) {
    colorClass = "bg-blue-50 text-blue-700 border-blue-200";
  }

  return (
    <div className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1 font-bold ${colorClass}`}>
      <Sparkles size={14} className="shrink-0" />
      <span className="text-base tracking-tight">{rounded}%</span>
      <span className="text-[11px] font-semibold uppercase tracking-wider opacity-85">
        {category ? category.replace("_", " ") : "Match"}
      </span>
    </div>
  );
}

export function FindTopCandidatesModal({
  open,
  onClose,
  initialJobId = null,
  initialJob = null,
}) {
  const [selectedJobId, setSelectedJobId] = useState(initialJobId || "");
  const [matchingId, setMatchingId] = useState(null);
  const [isPolling, setIsPolling] = useState(false);
  const [activeCandidateDetail, setActiveCandidateDetail] = useState(null);
  const [forceRefresh, setForceRefresh] = useState(false);
  const [matchingResults, setMatchingResults] = useState(null);

  // Load recruiter's jobs if not supplied or allowing change
  const myJobsQuery = useQuery({
    queryKey: ["jobs", "my-for-ai-matching"],
    queryFn: () => jobsApi.getMyJobs({ limit: 100 }),
    enabled: open,
  });

  const jobsList = myJobsQuery.data?.data?.jobs ?? myJobsQuery.data?.jobs ?? [];

  // When initialJobId changes or modal opens
  useEffect(() => {
    if (open) {
      if (initialJobId) {
        setSelectedJobId(initialJobId);
      } else if (jobsList.length > 0 && !selectedJobId) {
        setSelectedJobId(jobsList[0].id);
      }
      setActiveCandidateDetail(null);
      setMatchingResults(null);
      setMatchingId(null);
      setIsPolling(false);
    }
  }, [open, initialJobId, jobsList.length]);

  // Find currently selected job details
  const selectedJob =
    (initialJob && initialJob.id === selectedJobId ? initialJob : null) ||
    jobsList.find((j) => j.id === selectedJobId) ||
    null;

  // Poll matching status
  useEffect(() => {
    let interval = null;
    if (isPolling && matchingId) {
      interval = setInterval(async () => {
        try {
          const res = await aiApi.getMatchingStatus(matchingId);
          const data = res?.data || res;
          if (data.status === "COMPLETED") {
            setMatchingResults(data);
            setIsPolling(false);
            toast.success("AI candidate evaluation completed!");
          } else if (data.status === "FAILED") {
            setIsPolling(false);
            toast.error(data.error_message || "Matching calculation failed.");
          }
        } catch (err) {
          setIsPolling(false);
          toast.error("Failed to retrieve matching status.");
        }
      }, 1500);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPolling, matchingId]);

  const startMatchingMutation = useMutation({
    mutationFn: async () => {
      if (!selectedJobId) throw new Error("Please select a job first.");
      return aiApi.startJobMatching(selectedJobId, {
        top_k: 5,
        force_refresh: forceRefresh,
        async_execution: true,
      });
    },
    onSuccess: (data) => {
      const resData = data?.data || data;
      // If completed synchronously
      if (resData.status === "COMPLETED" && (resData.top_candidates || resData.results)) {
        setMatchingResults({
          ...resData,
          top_candidates: resData.top_candidates || resData.results || [],
        });
        setIsPolling(false);
        toast.success("Top candidates ready!");
      } else {
        setMatchingId(resData.matching_id);
        setIsPolling(true);
      }
    },
    onError: (err) => {
      setIsPolling(false);
      toast.error(
        err?.response?.data?.message ||
        err?.response?.data?.detail?.message ||
        err.message ||
        "Could not initiate candidate matching."
      );
    },
  });

  if (!open) return null;

  const topCandidates =
    matchingResults?.top_candidates || matchingResults?.results || [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="relative z-10 flex max-h-[92vh] w-full max-w-4xl flex-col rounded-3xl bg-white shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4.5 bg-gradient-to-r from-indigo-50/50 via-white to-purple-50/30">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-200">
              <Sparkles size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight text-slate-900">
                  AI Candidate Matcher
                </h2>
                <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-700">
                  Top 5 Candidates
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Deterministic hybrid scoring (40% Skills, 25% Experience, 15% Projects, 10% Education, 5% Certs, 5% JD Alignment)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Job Selection & Job Information Card */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4.5 space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 block mb-1.5">
                  Select Recruiter Job
                </label>
                <select
                  value={selectedJobId}
                  onChange={(e) => {
                    setSelectedJobId(e.target.value);
                    setMatchingResults(null);
                    setMatchingId(null);
                  }}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-900 shadow-2xs focus:border-indigo-500 focus:outline-none"
                >
                  {jobsList.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.job_title || j.jobTitle} - {j.company?.name || j.companyName || "Company"} ({j.status})
                    </option>
                  ))}
                </select>
              </div>

              {selectedJob && (
                <div className="flex items-center gap-2 sm:self-end pt-1 sm:pt-0">
                  <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={forceRefresh}
                      onChange={(e) => setForceRefresh(e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Force Recalculate</span>
                  </label>
                  <Button
                    onClick={() => startMatchingMutation.mutate()}
                    disabled={startMatchingMutation.isPending || isPolling}
                    className="bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm"
                  >
                    {startMatchingMutation.isPending || isPolling ? (
                      <>
                        <RefreshCw size={15} className="animate-spin" />
                        <span>Matching Candidates...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={15} />
                        <span>Find Top 5 Candidates</span>
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>

            {/* Selected Job Overview */}
            {selectedJob && (
              <div className="pt-2 border-t border-slate-200/80 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 font-medium">Department:</span>
                  <p className="font-semibold text-slate-800 truncate">
                    {selectedJob.department || "General"}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Experience:</span>
                  <p className="font-semibold text-slate-800">
                    {selectedJob.min_experience ?? selectedJob.minExperience ?? 0}+ years
                  </p>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Location:</span>
                  <p className="font-semibold text-slate-800 truncate">
                    {selectedJob.location || selectedJob.city || selectedJob.work_mode || "Flexible"}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Target Skills:</span>
                  <p className="font-semibold text-slate-800 truncate">
                    {(selectedJob.required_skills || selectedJob.requiredSkills || []).slice(0, 3).join(", ") || "General"}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Loading / Polling Indicator */}
          {isPolling && (
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-6 text-center space-y-3">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-white shadow-sm text-indigo-600 animate-bounce">
                <Sparkles size={24} />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Evaluating Candidate Applications with Gemini AI
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Filtering applicants, ranking semantic vectors, and generating structured evidence-backed evaluations...
              </p>
              <div className="w-48 h-1.5 bg-indigo-100 rounded-full mx-auto overflow-hidden">
                <div className="h-full bg-indigo-600 rounded-full animate-pulse w-3/4" />
              </div>
            </div>
          )}

          {/* Results Section */}
          {matchingResults && !isPolling && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span>Top Ranked Candidates</span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                    {topCandidates.length} found
                  </span>
                </h3>
                <span className="text-xs text-slate-400">
                  Ranked from highest to lowest score
                </span>
              </div>

              {topCandidates.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center">
                  <Users2 size={36} className="mx-auto text-slate-300 mb-2" />
                  <p className="text-sm font-semibold text-slate-700">No applicant matches found</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Either no candidates have applied for this job yet, or applicants were withdrawn/rejected.
                  </p>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {topCandidates.map((candidate, idx) => (
                    <div
                      key={candidate.candidate_id || idx}
                      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs hover:border-indigo-300 transition"
                    >
                      {/* Candidate Header */}
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="flex items-start gap-3.5">
                          <div className="relative">
                            {candidate.profile_image ? (
                              <img
                                src={candidate.profile_image}
                                alt={candidate.candidate_name}
                                className="h-12 w-12 rounded-2xl object-cover border border-slate-200"
                              />
                            ) : (
                              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-indigo-50 font-bold text-indigo-700 border border-indigo-100 text-sm">
                                {(candidate.candidate_name || "C")
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")
                                  .slice(0, 2)
                                  .toUpperCase()}
                              </div>
                            )}
                            <span className="absolute -top-1.5 -left-1.5 grid h-5 w-5 place-items-center rounded-full bg-slate-900 text-[10px] font-bold text-white shadow-xs">
                              #{candidate.rank || idx + 1}
                            </span>
                          </div>

                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-base font-bold text-slate-900">
                                {candidate.candidate_name || "Applicant"}
                              </h4>
                              {candidate.application_status && (
                                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 uppercase">
                                  {candidate.application_status}
                                </span>
                              )}
                            </div>
                            <p className="text-xs font-medium text-slate-600 mt-0.5">
                              {candidate.designation || "Candidate"}
                            </p>
                            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                              {candidate.experience_years !== undefined && candidate.experience_years !== null && (
                                <span className="flex items-center gap-1">
                                  <BriefcaseBusiness size={12} className="text-slate-400" />
                                  {candidate.experience_years} yrs exp
                                </span>
                              )}
                              {candidate.location && (
                                <span className="flex items-center gap-1">
                                  <MapPin size={12} className="text-slate-400" />
                                  {candidate.location}
                                </span>
                              )}
                              {candidate.education && (
                                <span className="flex items-center gap-1">
                                  <GraduationCap size={12} className="text-slate-400" />
                                  {candidate.education}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2">
                          <ScoreBadge
                            score={candidate.match_percentage ?? candidate.overall_score}
                            category={candidate.recommendation_category}
                          />
                          <Link
                            to={`/app/recruiter/applications/${candidate.application_id}`}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                          >
                            <span>Review Application</span>
                            <ExternalLink size={12} />
                          </Link>
                        </div>
                      </div>

                      {/* Skills match/missing pills */}
                      <div className="mt-4 pt-3.5 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="font-semibold text-emerald-700 flex items-center gap-1 mb-1">
                            <CheckCircle2 size={13} />
                            <span>Matched Skills:</span>
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {(candidate.matched_skills || []).length > 0 ? (
                              candidate.matched_skills.map((s) => (
                                <span
                                  key={s}
                                  className="rounded-md bg-emerald-50 px-2 py-0.5 font-medium text-emerald-800 border border-emerald-100"
                                >
                                  {s}
                                </span>
                              ))
                            ) : (
                              <span className="text-slate-400 italic">None detected</span>
                            )}
                          </div>
                        </div>

                        <div>
                          <span className="font-semibold text-rose-700 flex items-center gap-1 mb-1">
                            <AlertCircle size={13} />
                            <span>Missing Skills:</span>
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {(candidate.missing_skills || []).length > 0 ? (
                              candidate.missing_skills.map((s) => (
                                <span
                                  key={s}
                                  className="rounded-md bg-rose-50 px-2 py-0.5 font-medium text-rose-800 border border-rose-100"
                                >
                                  {s}
                                </span>
                              ))
                            ) : (
                              <span className="text-emerald-600 font-medium">All core target skills matched!</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* AI Explanation Box */}
                      {(candidate.explanation || candidate.ai_explanation) && (
                        <div className="mt-3.5 rounded-xl bg-slate-50 p-3 text-xs text-slate-700 border border-slate-100">
                          <span className="font-bold text-slate-900 block mb-0.5 flex items-center gap-1">
                            <Sparkles size={12} className="text-indigo-600" />
                            AI Explanation:
                          </span>
                          <p className="leading-relaxed">
                            {candidate.explanation || candidate.ai_explanation}
                          </p>
                        </div>
                      )}

                      {/* Relevant Experience Summary */}
                      {candidate.relevant_experience_summary && (
                        <div className="mt-2 text-[11px] text-slate-500">
                          <span className="font-semibold text-slate-700">Experience Summary: </span>
                          {candidate.relevant_experience_summary}
                        </div>
                      )}

                      {/* Toggle Detailed Evaluation */}
                      <div className="mt-3.5 pt-2 flex items-center justify-between text-xs">
                        <button
                          type="button"
                          onClick={() =>
                            setActiveCandidateDetail(
                              activeCandidateDetail?.candidate_id === candidate.candidate_id
                                ? null
                                : candidate
                            )
                          }
                          className="inline-flex items-center gap-1 font-semibold text-slate-600 hover:text-indigo-600"
                        >
                          <span>
                            {activeCandidateDetail?.candidate_id === candidate.candidate_id
                              ? "Hide Evaluation Breakdown"
                              : "View Detailed Evaluation"}
                          </span>
                          {activeCandidateDetail?.candidate_id === candidate.candidate_id ? (
                            <ChevronUp size={14} />
                          ) : (
                            <ChevronDown size={14} />
                          )}
                        </button>
                      </div>

                      {/* Expanded Detailed Evaluation Panel */}
                      {activeCandidateDetail?.candidate_id === candidate.candidate_id && (
                        <div className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50/30 p-4 space-y-3.5 text-xs">
                          <h5 className="font-bold text-slate-900 flex items-center gap-1.5">
                            <Award size={14} className="text-indigo-600" />
                            Deterministic Criteria Breakdown (100%)
                          </h5>

                          {/* 6 Criteria Bar Breakdown */}
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                            <div className="rounded-lg bg-white p-2.5 border border-slate-100">
                              <span className="text-slate-400 block text-[10px] font-semibold uppercase">
                                Skills (40%)
                              </span>
                              <span className="text-sm font-bold text-slate-900">
                                {Math.round(candidate.skill_score || 0)}%
                              </span>
                            </div>
                            <div className="rounded-lg bg-white p-2.5 border border-slate-100">
                              <span className="text-slate-400 block text-[10px] font-semibold uppercase">
                                Experience (25%)
                              </span>
                              <span className="text-sm font-bold text-slate-900">
                                {Math.round(candidate.experience_score || 0)}%
                              </span>
                            </div>
                            <div className="rounded-lg bg-white p-2.5 border border-slate-100">
                              <span className="text-slate-400 block text-[10px] font-semibold uppercase">
                                Projects (15%)
                              </span>
                              <span className="text-sm font-bold text-slate-900">
                                {Math.round(candidate.project_score || 0)}%
                              </span>
                            </div>
                            <div className="rounded-lg bg-white p-2.5 border border-slate-100">
                              <span className="text-slate-400 block text-[10px] font-semibold uppercase">
                                Education (10%)
                              </span>
                              <span className="text-sm font-bold text-slate-900">
                                {Math.round(candidate.education_score || 80)}%
                              </span>
                            </div>
                            <div className="rounded-lg bg-white p-2.5 border border-slate-100">
                              <span className="text-slate-400 block text-[10px] font-semibold uppercase">
                                Certifications (5%)
                              </span>
                              <span className="text-sm font-bold text-slate-900">
                                {Math.round(candidate.certifications_score || 75)}%
                              </span>
                            </div>
                            <div className="rounded-lg bg-white p-2.5 border border-slate-100">
                              <span className="text-slate-400 block text-[10px] font-semibold uppercase">
                                JD Alignment (5%)
                              </span>
                              <span className="text-sm font-bold text-slate-900">
                                {Math.round(candidate.jd_alignment_score || candidate.similarity_score || 0)}%
                              </span>
                            </div>
                          </div>

                          {/* Strengths & Weaknesses */}
                          {((candidate.strengths || []).length > 0 || (candidate.weaknesses || []).length > 0) && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                              {candidate.strengths && candidate.strengths.length > 0 && (
                                <div className="rounded-lg bg-white p-3 border border-slate-100 space-y-1">
                                  <span className="font-semibold text-emerald-800 block text-[11px]">
                                    Candidate Strengths:
                                  </span>
                                  <ul className="list-disc list-inside text-slate-600 space-y-0.5 text-[11px]">
                                    {candidate.strengths.map((str, i) => (
                                      <li key={i}>{str}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {candidate.weaknesses && candidate.weaknesses.length > 0 && (
                                <div className="rounded-lg bg-white p-3 border border-slate-100 space-y-1">
                                  <span className="font-semibold text-amber-800 block text-[11px]">
                                    Areas for Consideration:
                                  </span>
                                  <ul className="list-disc list-inside text-slate-600 space-y-0.5 text-[11px]">
                                    {candidate.weaknesses.map((w, i) => (
                                      <li key={i}>{w}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Resume Evidence Snippets */}
                          {candidate.evidence && candidate.evidence.length > 0 && (
                            <div className="space-y-1.5 pt-1">
                              <span className="font-semibold text-slate-800 block text-[11px]">
                                Resume Evidence Snippets:
                              </span>
                              <div className="space-y-1">
                                {candidate.evidence.slice(0, 3).map((ev, i) => (
                                  <div
                                    key={i}
                                    className="rounded-lg bg-white p-2 border border-slate-200 text-[11px] text-slate-600"
                                  >
                                    <span className="font-bold text-slate-800">{ev.claim}: </span>
                                    <span className="italic">"{ev.resume_excerpt}"</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4 bg-slate-50">
          <span className="text-xs text-slate-400">
            {selectedJob ? `Selected: ${selectedJob.job_title || selectedJob.jobTitle}` : "No job selected"}
          </span>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
