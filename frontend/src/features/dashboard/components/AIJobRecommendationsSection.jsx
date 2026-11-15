import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Sparkles,
  Building2,
  MapPin,
  BriefcaseBusiness,
  Wallet,
  Clock,
  ArrowRight,
  CheckCircle2,
  RefreshCw,
  Eye,
  Send,
  AlertCircle,
  FileText,
} from "lucide-react";

import { aiApi } from "../../../services/aiApi";
import { Button } from "../../../components/ui/Button";

function MatchScorePill({ score }) {
  const rounded = Math.round(score);
  let color = "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (rounded < 60) {
    color = "bg-slate-100 text-slate-700 border-slate-200";
  } else if (rounded < 75) {
    color = "bg-blue-50 text-blue-700 border-blue-200";
  } else if (rounded < 88) {
    color = "bg-indigo-50 text-indigo-700 border-indigo-200";
  }

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1 text-xs font-bold ${color}`}
    >
      <Sparkles size={13} className="shrink-0" />
      <span>{rounded}% Match</span>
    </div>
  );
}

export function AIJobRecommendationsSection({ candidateProfile }) {
  const [recommendations, setRecommendations] = useState(null);
  const [forceRefresh, setForceRefresh] = useState(false);

  const recommendationMutation = useMutation({
    mutationFn: async () => {
      return aiApi.getJobRecommendations({
        limit: 5,
        force_refresh: forceRefresh,
      });
    },
    onSuccess: (res) => {
      const recs = res?.data?.recommendations || res?.recommendations || [];
      setRecommendations(recs);
      if (recs.length > 0) {
        toast.success(`Found ${recs.length} top matching opportunities for your profile!`);
      } else {
        toast.info("No active published vacancies match your profile criteria yet.");
      }
    },
    onError: (err) => {
      toast.error(
        err?.response?.data?.message ||
        err?.response?.data?.detail?.message ||
        "Could not load AI recommendations right now."
      );
    },
  });

  const isLoading = recommendationMutation.isPending;

  return (
    <section className="rounded-3xl border border-indigo-100/80 bg-gradient-to-br from-indigo-50/40 via-white to-purple-50/30 p-6 sm:p-7 shadow-xs space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-200">
            <Sparkles size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight text-slate-950">
                AI Job Recommendations
              </h2>
              <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-700">
                Personalized
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              Matches your skills, experience, education, and preferences against published active vacancies using Gemini embeddings.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 sm:self-center">
          {recommendations && (
            <label className="flex items-center gap-1.5 text-xs font-medium text-slate-500 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={forceRefresh}
                onChange={(e) => setForceRefresh(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span>Refresh</span>
            </label>
          )}

          <Button
            type="button"
            onClick={() => recommendationMutation.mutate()}
            disabled={isLoading}
            className="bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-200 px-4 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                <span>Analyzing Jobs...</span>
              </>
            ) : (
              <>
                <Sparkles size={16} />
                <span>Find Best Jobs For Me</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="rounded-2xl border border-indigo-100 bg-white/80 p-8 text-center space-y-3">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-indigo-50 text-indigo-600 animate-spin">
            <RefreshCw size={24} />
          </div>
          <h4 className="text-base font-bold text-slate-900">
            Finding Top Relevant Jobs For You
          </h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Comparing your verified profile, resume text, and career history against published jobs using 768-dim semantic embeddings...
          </p>
        </div>
      )}

      {/* Recommendation Cards */}
      {recommendations && !isLoading && (
        <div className="space-y-4">
          {recommendations.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
              <BriefcaseBusiness size={32} className="mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-semibold text-slate-700">
                No matching published vacancies right now
              </p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Check back soon as new companies publish opportunities, or update your profile skills to expand matches.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-1">
              {recommendations.map((job, idx) => (
                <div
                  key={job.job_id || idx}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs hover:border-indigo-300 hover:shadow-soft transition space-y-4"
                >
                  {/* Job Header */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex items-start gap-3.5">
                      {job.company_logo ? (
                        <img
                          src={job.company_logo}
                          alt={job.company_name}
                          className="h-12 w-12 rounded-2xl object-cover border border-slate-100"
                        />
                      ) : (
                        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-slate-600 font-bold text-sm">
                          {(job.company_name || "C").slice(0, 2).toUpperCase()}
                        </div>
                      )}

                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-slate-900">
                            {job.job_title}
                          </h3>
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                            #{job.rank || idx + 1}
                          </span>
                        </div>
                        <p className="text-xs font-medium text-slate-600 mt-0.5">
                          {job.company_name}
                        </p>

                        <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                          {job.location && (
                            <span className="flex items-center gap-1">
                              <MapPin size={12} className="text-slate-400" />
                              {job.location}
                            </span>
                          )}
                          {job.employment_type && (
                            <span className="flex items-center gap-1">
                              <Clock size={12} className="text-slate-400" />
                              {job.employment_type.replace("_", " ")}
                            </span>
                          )}
                          {job.experience_required && (
                            <span className="flex items-center gap-1">
                              <BriefcaseBusiness size={12} className="text-slate-400" />
                              {job.experience_required}
                            </span>
                          )}
                          {job.salary_range && (
                            <span className="flex items-center gap-1 font-semibold text-emerald-700">
                              <Wallet size={12} />
                              {job.salary_range}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2">
                      <MatchScorePill score={job.match_percentage ?? job.overall_score} />

                      {job.has_applied ? (
                        <div className="inline-flex items-center gap-1 rounded-xl bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 border border-blue-200">
                          <CheckCircle2 size={13} />
                          <span>Applied: {job.application_status || "SUBMITTED"}</span>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {/* Skills matched list */}
                  {job.matched_skills && job.matched_skills.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                      <span className="text-[11px] font-semibold text-slate-500 mr-1">
                        Matched Skills:
                      </span>
                      {job.matched_skills.map((skill) => (
                        <span
                          key={skill}
                          className="rounded-md bg-emerald-50 px-2 py-0.5 font-medium text-emerald-800 border border-emerald-100"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* AI Recommendation Explanation */}
                  {(job.explanation || job.ai_explanation) && (
                    <div className="rounded-xl bg-slate-50/80 p-3 text-xs text-slate-700 border border-slate-100">
                      <span className="font-bold text-slate-900 block mb-0.5 flex items-center gap-1">
                        <Sparkles size={12} className="text-indigo-600" />
                        AI Explanation:
                      </span>
                      <p className="leading-relaxed text-slate-600">
                        {job.explanation || job.ai_explanation}
                      </p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="pt-2 flex flex-wrap items-center justify-end gap-2.5 border-t border-slate-100">
                    <Link
                      to={`/app/jobs/${job.job_id}`}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <Eye size={13} />
                      <span>View Job</span>
                    </Link>

                    {job.has_applied ? (
                      <Link
                        to="/app/applications"
                        className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                      >
                        <CheckCircle2 size={13} className="text-emerald-600" />
                        <span>View Application Status</span>
                      </Link>
                    ) : (
                      <Link
                        to={`/app/jobs/${job.job_id}/apply`}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700"
                      >
                        <Send size={13} />
                        <span>Apply Now</span>
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
