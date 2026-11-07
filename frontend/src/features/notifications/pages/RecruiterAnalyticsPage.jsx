import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  BriefcaseBusiness,
  FileText,
  CalendarClock,
  Award,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { notificationsApi } from "../api/notificationsApi";
import { DateRangeFilter } from "../../admin/components/DateRangeFilter";
import { AdminStatCard } from "../../admin/components/AdminStatCard";

export function RecruiterAnalyticsPage() {
  const [dateFilter, setDateFilter] = useState({ range: "30d", from: "", to: "" });
  const [companyId, setCompanyId] = useState("");
  const [jobStatus, setJobStatus] = useState("");
  const [applicationStatus, setApplicationStatus] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const res = await notificationsApi.getRecruiterAnalytics({
        range: dateFilter.range,
        from: dateFilter.from || undefined,
        to: dateFilter.to || undefined,
        companyId: companyId || undefined,
        jobStatus: jobStatus || undefined,
        applicationStatus: applicationStatus || undefined,
      });
      setData(res);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to load recruiter analytics");
    } finally {
      setLoading(false);
    }
  }, [dateFilter, companyId, jobStatus, applicationStatus]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const jobs = data?.jobsSummary || {};
  const apps = data?.applicationsSummary || {};
  const interviews = data?.interviewsSummary || {};
  const conv = data?.conversionRates || {};
  const companies = data?.authorizedCompanies || [];
  const jobPerf = data?.jobPerformance || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-brand">
            RECRUITER ANALYTICS
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            Recruitment Pipeline & Job Performance
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Real-time metrics across your authorized companies, job postings, candidate applications, and interviews.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            to="/app/reports"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
          >
            <Download size={14} /> Open Reports & Exports
          </Link>
          <DateRangeFilter
            range={dateFilter.range}
            from={dateFilter.from}
            to={dateFilter.to}
            onChange={setDateFilter}
          />
        </div>
      </div>

      {/* Scope Filters */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <select
          value={companyId}
          onChange={(e) => setCompanyId(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
        >
          <option value="">All Authorized Companies</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.myRole})
            </option>
          ))}
        </select>

        <select
          value={jobStatus}
          onChange={(e) => setJobStatus(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
        >
          <option value="">All Job Statuses</option>
          <option value="PUBLISHED">Published</option>
          <option value="PAUSED">Paused</option>
          <option value="CLOSED">Closed</option>
          <option value="DRAFT">Draft</option>
        </select>

        <select
          value={applicationStatus}
          onChange={(e) => setApplicationStatus(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
        >
          <option value="">All Application Stages</option>
          <option value="SUBMITTED">Submitted</option>
          <option value="UNDER_REVIEW">Under Review</option>
          <option value="SHORTLISTED">Shortlisted</option>
          <option value="INTERVIEW">Interview</option>
          <option value="OFFERED">Offered</option>
          <option value="HIRED">Hired</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AdminStatCard
          label="Total Jobs Created"
          value={jobs.totalJobs ?? 0}
          subtext={`Published: ${jobs.publishedJobs ?? 0} • Paused: ${jobs.pausedJobs ?? 0} • Closed: ${jobs.closedJobs ?? 0}`}
          icon={BriefcaseBusiness}
          tone="blue"
        />
        <AdminStatCard
          label="Applications Received"
          value={apps.totalApplications ?? 0}
          subtext={`Shortlisted: ${apps.shortlisted ?? 0} (${conv.shortlistRate ?? 0}%)`}
          icon={FileText}
          tone="indigo"
        />
        <AdminStatCard
          label="Interviews"
          value={interviews.totalInterviews ?? 0}
          subtext={`Scheduled: ${interviews.scheduledInterviews ?? 0} • Completed: ${interviews.completedInterviews ?? 0}`}
          icon={CalendarClock}
          tone="amber"
        />
        <AdminStatCard
          label="Offers & Hires"
          value={apps.candidatesHired ?? 0}
          subtext={`Offers made: ${apps.offersMade ?? 0} • Hire rate: ${conv.hireRate ?? 0}%`}
          icon={Award}
          tone="emerald"
        />
      </div>

      {/* Job Performance Table */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <h2 className="text-base font-bold text-slate-900">
          Job Performance Breakdown
        </h2>
        <p className="text-xs text-slate-500">
          Applications, shortlists, interviews, and hires per job posting.
        </p>

        {loading ? (
          <p className="mt-4 text-xs text-slate-400">Loading job metrics...</p>
        ) : jobPerf.length === 0 ? (
          <p className="mt-4 text-xs text-slate-400">
            No jobs match the selected filters.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="pb-2.5 font-bold">Job Title</th>
                  <th className="pb-2.5 font-bold">Company</th>
                  <th className="pb-2.5 font-bold">Status</th>
                  <th className="pb-2.5 font-bold text-right">Applications</th>
                  <th className="pb-2.5 font-bold text-right">Shortlisted</th>
                  <th className="pb-2.5 font-bold text-right">Interviews</th>
                  <th className="pb-2.5 font-bold text-right">Offers</th>
                  <th className="pb-2.5 font-bold text-right">Hired</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {jobPerf.map((j) => (
                  <tr key={j.id} className="hover:bg-slate-50">
                    <td className="py-3 font-bold text-slate-900">
                      <Link
                        to={`/app/jobs/${j.id}/manage`}
                        className="hover:text-brand"
                      >
                        {j.title}
                      </Link>
                    </td>
                    <td className="py-3 text-slate-600">{j.companyName}</td>
                    <td className="py-3">
                      <span className="rounded bg-slate-100 px-2 py-0.5 font-bold text-slate-700">
                        {j.status}
                      </span>
                    </td>
                    <td className="py-3 text-right font-bold text-slate-900">
                      {j.applicationsCount}
                    </td>
                    <td className="py-3 text-right text-indigo-700 font-semibold">
                      {j.shortlistedCount}
                    </td>
                    <td className="py-3 text-right text-amber-700 font-semibold">
                      {j.interviewsCount}
                    </td>
                    <td className="py-3 text-right text-blue-700 font-semibold">
                      {j.offeredCount}
                    </td>
                    <td className="py-3 text-right text-emerald-700 font-bold">
                      {j.hiredCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
