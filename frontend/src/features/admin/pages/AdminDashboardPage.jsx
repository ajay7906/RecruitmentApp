import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  UserRound,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  Clock,
  ShieldAlert,
  FileText,
  CalendarClock,
  Award,
  Flag,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { adminApi } from "../api/adminApi";
import { AdminStatCard } from "../components/AdminStatCard";
import { DateRangeFilter } from "../components/DateRangeFilter";
import { ActivityTimeline } from "../components/ActivityTimeline";

function MiniTrendChart({ title, series = [], colorClass = "bg-brand" }) {
  const maxVal = Math.max(1, ...series.map((d) => d.count));
  const recent = series.slice(-14);
  const totalInSeries = series.reduce((acc, d) => acc + d.count, 0);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {title}
          </p>
          <p className="mt-1 text-xl font-bold text-slate-900">
            {totalInSeries} <span className="text-xs font-normal text-slate-500">in selected period</span>
          </p>
        </div>
      </div>

      <div className="mt-4 flex h-24 items-end gap-1.5">
        {recent.length === 0 ? (
          <p className="text-xs text-slate-400">No data points in range</p>
        ) : (
          recent.map((pt) => {
            const heightPct = Math.max(8, Math.round((pt.count / maxVal) * 100));
            return (
              <div
                key={pt.date}
                title={`${pt.date}: ${pt.count}`}
                className="group flex flex-1 flex-col items-center gap-1"
              >
                <div className="flex h-20 w-full items-end rounded-t bg-slate-100/70">
                  <div
                    style={{ height: `${heightPct}%` }}
                    className={`w-full rounded-t transition-all ${colorClass}`}
                  />
                </div>
                <span className="text-[9px] text-slate-400">
                  {pt.date.slice(8)}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export function AdminDashboardPage() {
  const [dateFilter, setDateFilter] = useState({ range: "30d", from: "", to: "" });
  const [statsData, setStatsData] = useState(null);
  const [activities, setActivities] = useState([]);
  const [pendingCompanies, setPendingCompanies] = useState([]);
  const [pendingJobs, setPendingJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, actRes, compRes, jobRes] = await Promise.all([
        adminApi.getDashboardStats(dateFilter),
        adminApi.getDashboardActivities({ limit: 8, ...dateFilter }),
        adminApi.listCompanies({ status: "PENDING_APPROVAL", limit: 5 }).catch(() => ({ companies: [] })),
        adminApi.listJobs({ pendingOnly: true, limit: 5 }).catch(() => ({ jobs: [] })),
      ]);
      setStatsData(statsRes);
      setActivities(actRes?.activities || []);
      setPendingCompanies(compRes?.companies || []);
      setPendingJobs(jobRes?.jobs || []);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to load admin dashboard metrics");
    } finally {
      setLoading(false);
    }
  }, [dateFilter]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const s = statsData?.summary || {};
  const p = statsData?.period || {};
  const charts = statsData?.charts || {};

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Platform Control Center
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Real-time administrative metrics, pending approvals, and platform health.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <DateRangeFilter
            range={dateFilter.range}
            from={dateFilter.from}
            to={dateFilter.to}
            onChange={setDateFilter}
          />
          <button
            type="button"
            onClick={loadDashboard}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AdminStatCard
          label="Total Users"
          value={s.totalUsers ?? 0}
          subtext={`+${p.newUsers ?? 0} in period • ${s.totalAdmins ?? 0} admins`}
          icon={Users}
          tone="blue"
          to="/admin/users"
        />
        <AdminStatCard
          label="Candidates & Recruiters"
          value={`${s.totalCandidates ?? 0} / ${s.totalRecruiters ?? 0}`}
          subtext={`+${p.newCandidates ?? 0} candidates, +${p.newRecruiters ?? 0} recruiters`}
          icon={UserRound}
          tone="indigo"
          to="/admin/users"
        />
        <AdminStatCard
          label="Total Companies"
          value={s.totalCompanies ?? 0}
          subtext={`${s.approvedCompanies ?? 0} approved • ${s.rejectedCompanies ?? 0} rejected`}
          icon={Building2}
          tone="emerald"
          to="/admin/companies"
        />
        <AdminStatCard
          label="Pending Company Approvals"
          value={s.pendingCompanyApprovals ?? 0}
          subtext="Awaiting administrative verification"
          icon={Clock}
          tone="amber"
          to="/admin/companies/approvals"
        />
        <AdminStatCard
          label="Total Jobs"
          value={s.totalJobs ?? 0}
          subtext={`${s.publishedJobs ?? 0} published • ${s.closedJobs ?? 0} closed`}
          icon={BriefcaseBusiness}
          tone="blue"
          to="/admin/jobs"
        />
        <AdminStatCard
          label="Pending / Flagged Jobs"
          value={s.pendingJobApprovals ?? 0}
          subtext={`${s.flaggedJobs ?? 0} flagged for review`}
          icon={ShieldAlert}
          tone="amber"
          to="/admin/jobs/approvals"
        />
        <AdminStatCard
          label="Applications & Interviews"
          value={`${s.totalApplications ?? 0} / ${s.totalInterviews ?? 0}`}
          subtext={`+${p.newApplications ?? 0} applications in period`}
          icon={FileText}
          tone="purple"
          to="/admin/applications"
        />
        <AdminStatCard
          label="Total Hired Candidates"
          value={s.totalHiredCandidates ?? 0}
          subtext={`+${p.newHires ?? 0} hires in period`}
          icon={Award}
          tone="emerald"
          to="/admin/analytics"
        />
      </div>

      {/* Security & Moderation Alert Strip */}
      <div className="grid gap-4 sm:grid-cols-3">
        <AdminStatCard
          label="Suspended User Accounts"
          value={s.suspendedAccounts ?? 0}
          subtext={`${s.inactiveAccounts ?? 0} inactive • ${s.unverifiedAccounts ?? 0} unverified`}
          icon={ShieldAlert}
          tone="rose"
          to="/admin/users?status=SUSPENDED"
        />
        <AdminStatCard
          label="Suspended Companies"
          value={s.suspendedCompanies ?? 0}
          subtext="Restricted from publishing new jobs"
          icon={Building2}
          tone="rose"
          to="/admin/companies?status=SUSPENDED"
        />
        <AdminStatCard
          label="Open Moderation Reports"
          value={s.openReports ?? 0}
          subtext="User, company & job reports awaiting action"
          icon={Flag}
          tone="amber"
          to="/admin/reports"
        />
      </div>

      {/* Growth Trend Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <MiniTrendChart
          title="User Registration Trend"
          series={charts.userRegistrations || []}
          colorClass="bg-brand"
        />
        <MiniTrendChart
          title="Company Onboarding Trend"
          series={charts.companyRegistrations || []}
          colorClass="bg-emerald-500"
        />
        <MiniTrendChart
          title="Job Posting Trend"
          series={charts.jobPostings || []}
          colorClass="bg-indigo-500"
        />
        <MiniTrendChart
          title="Job Application Volume"
          series={charts.applicationsSubmitted || []}
          colorClass="bg-amber-500"
        />
      </div>

      {/* Action Queues & Live Activity Feed */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Pending Company Approvals Queue */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">
              Pending Company Approvals
            </h2>
            <Link
              to="/admin/companies/approvals"
              className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
            >
              View all <ArrowRight size={13} />
            </Link>
          </div>
          <div className="mt-4 divide-y divide-slate-100">
            {pendingCompanies.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                <CheckCircle2 className="mx-auto mb-1.5 h-6 w-6 text-emerald-500" />
                All company registrations have been reviewed.
              </div>
            ) : (
              pendingCompanies.map((comp) => (
                <div key={comp.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{comp.name}</p>
                    <p className="text-xs text-slate-500">
                      {comp.industry || "Industry N/A"} • Owner: {comp.owner?.fullName || comp.owner?.email}
                    </p>
                  </div>
                  <Link
                    to={`/admin/companies/${comp.id}`}
                    className="rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-100"
                  >
                    Review
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Pending / Flagged Jobs Queue */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">
              Job Moderation Queue
            </h2>
            <Link
              to="/admin/jobs/approvals"
              className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
            >
              View all <ArrowRight size={13} />
            </Link>
          </div>
          <div className="mt-4 divide-y divide-slate-100">
            {pendingJobs.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                <CheckCircle2 className="mx-auto mb-1.5 h-6 w-6 text-emerald-500" />
                No pending or flagged jobs require review.
              </div>
            ) : (
              pendingJobs.map((job) => (
                <div key={job.id} className="flex items-center justify-between py-3">
                  <div className="min-w-0 pr-2">
                    <p className="truncate text-sm font-semibold text-slate-900">{job.title}</p>
                    <p className="text-xs text-slate-500">
                      {job.company?.name} • {job.status}
                    </p>
                  </div>
                  <Link
                    to={`/admin/jobs/${job.id}`}
                    className="shrink-0 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-brand hover:bg-blue-100"
                  >
                    Inspect
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Platform Activities */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-bold text-slate-900">
              Recent Platform Activities
            </h2>
            <Link
              to="/admin/activities"
              className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
            >
              Full timeline <ArrowRight size={13} />
            </Link>
          </div>
          <ActivityTimeline activities={activities.slice(0, 5)} />
        </div>
      </div>
    </div>
  );
}
