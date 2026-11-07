import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  FileText,
  Clock,
  CheckCircle2,
  CalendarClock,
  Award,
  XCircle,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { notificationsApi } from "../api/notificationsApi";
import { DateRangeFilter } from "../../admin/components/DateRangeFilter";
import { AdminStatCard } from "../../admin/components/AdminStatCard";

export function CandidateAnalyticsPage() {
  const [dateFilter, setDateFilter] = useState({ range: "30d", from: "", to: "" });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const res = await notificationsApi.getCandidateAnalytics({
        range: dateFilter.range,
        from: dateFilter.from || undefined,
        to: dateFilter.to || undefined,
      });
      setData(res);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to load candidate analytics");
    } finally {
      setLoading(false);
    }
  }, [dateFilter]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const s = data?.summary || {};
  const conv = data?.conversionRates || {};
  const byStatus = data?.applicationsByStatus || [];
  const maxStatusCount = Math.max(1, ...byStatus.map((x) => x.count || 0));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-brand">
            CANDIDATE INSIGHTS
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            My Recruitment Analytics
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Track your application pipeline, interview conversion rates, and recent hiring activity.
          </p>
        </div>

        <DateRangeFilter
          range={dateFilter.range}
          from={dateFilter.from}
          to={dateFilter.to}
          onChange={setDateFilter}
        />
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AdminStatCard
          label="Total Applications"
          value={s.totalApplications ?? 0}
          subtext={`In selected period: ${s.applicationsInPeriod ?? 0}`}
          icon={FileText}
          tone="blue"
        />
        <AdminStatCard
          label="Under Review & Shortlisted"
          value={(s.underReview ?? 0) + (s.shortlisted ?? 0)}
          subtext={`Shortlist rate: ${conv.shortlistRate ?? 0}%`}
          icon={Clock}
          tone="indigo"
        />
        <AdminStatCard
          label="Interview Invitations"
          value={s.interviewInvitations ?? 0}
          subtext={`Upcoming: ${s.upcomingInterviews ?? 0} • Completed: ${s.completedInterviews ?? 0}`}
          icon={CalendarClock}
          tone="amber"
        />
        <AdminStatCard
          label="Offers & Hires"
          value={(s.offersReceived ?? 0) + (s.hiredApplications ?? 0)}
          subtext={`Offers: ${s.offersReceived ?? 0} • Hired: ${s.hiredApplications ?? 0}`}
          icon={Award}
          tone="emerald"
        />
      </div>

      {/* Funnel Conversion & Status Distribution */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">
              Applications by Stage
            </h2>
            <span className="text-xs text-slate-400">Live pipeline breakdown</span>
          </div>
          <div className="mt-4 space-y-3">
            {byStatus.map((item) => {
              const width = Math.max(
                4,
                Math.round(((item.count || 0) / maxStatusCount) * 100)
              );
              return (
                <div key={item.status} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">
                      {item.status.replace(/_/g, " ")}
                    </span>
                    <span className="font-bold text-slate-900">{item.count}</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100">
                    <div
                      style={{ width: `${width}%` }}
                      className="h-2 rounded-full bg-brand"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center gap-2">
            <TrendingUp size={18} className="text-emerald-600" />
            <h2 className="text-base font-bold text-slate-900">
              Personal Conversion Ratios
            </h2>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs font-medium text-slate-500">Shortlist Rate</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {conv.shortlistRate ?? 0}%
              </p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs font-medium text-slate-500">Interview Rate</p>
              <p className="mt-1 text-2xl font-bold text-indigo-700">
                {conv.interviewRate ?? 0}%
              </p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs font-medium text-slate-500">Offer Rate</p>
              <p className="mt-1 text-2xl font-bold text-amber-700">
                {conv.offerRate ?? 0}%
              </p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs font-medium text-slate-500">Hire Rate</p>
              <p className="mt-1 text-2xl font-bold text-emerald-700">
                {conv.hireRate ?? 0}%
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4 border-t border-slate-100 pt-4 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={15} className="text-emerald-600" />
              <span>Submitted: {s.submitted ?? 0}</span>
            </div>
            <div className="flex items-center gap-2">
              <XCircle size={15} className="text-rose-500" />
              <span>
                Rejected: {s.rejectedApplications ?? 0} • Withdrawn:{" "}
                {s.withdrawnApplications ?? 0}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Application Activity */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">
            Recent Application Activity
          </h2>
          <Link
            to="/app/applications"
            className="text-xs font-bold text-brand hover:underline"
          >
            View all applications
          </Link>
        </div>

        {loading ? (
          <p className="mt-4 text-xs text-slate-400">Loading activity...</p>
        ) : !data?.recentApplications?.length ? (
          <p className="mt-4 text-xs text-slate-400">
            You haven&apos;t submitted any applications yet.
          </p>
        ) : (
          <div className="mt-4 divide-y divide-slate-100">
            {data.recentApplications.map((app) => (
              <div
                key={app.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"
              >
                <div>
                  <Link
                    to={`/app/applications/${app.id}`}
                    className="font-bold text-slate-900 hover:text-brand"
                  >
                    {app.job?.title || "Job Role"}
                  </Link>
                  <p className="text-xs text-slate-500">
                    {app.company?.name || "Company"} • Applied{" "}
                    {new Date(app.appliedAt).toLocaleDateString()}
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                  {app.status.replace(/_/g, " ")}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
