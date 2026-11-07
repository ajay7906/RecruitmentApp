import { useState, useEffect, useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  Users2,
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

export function CompanyAnalyticsPage() {
  const { id } = useParams();
  const [dateFilter, setDateFilter] = useState({ range: "30d", from: "", to: "" });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const loadCompanyAnalytics = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await notificationsApi.getCompanyAnalytics(id, {
        range: dateFilter.range,
        from: dateFilter.from || undefined,
        to: dateFilter.to || undefined,
      });
      setData(res);
    } catch (err) {
      const msg =
        err?.response?.data?.message || "Could not load company analytics";
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [id, dateFilter]);

  useEffect(() => {
    loadCompanyAnalytics();
  }, [loadCompanyAnalytics]);

  if (errorMsg) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-800">
        <p className="font-bold">Access Restricted or Unavailable</p>
        <p className="mt-1">{errorMsg}</p>
        <Link
          to={id ? `/app/companies/${id}/dashboard` : "/app/companies"}
          className="mt-4 inline-flex items-center gap-1.5 font-semibold text-rose-900 underline"
        >
          <ArrowLeft size={14} /> Return to Company Dashboard
        </Link>
      </div>
    );
  }

  const company = data?.company || {};
  const s = data?.summary || {};
  const conv = data?.conversionRates || {};
  const byStatus = data?.applicationsByStatus || [];
  const maxStatus = Math.max(1, ...byStatus.map((x) => x.count || 0));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            to={`/app/companies/${id}/dashboard`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900"
          >
            <ArrowLeft size={14} /> Back to {company.name || "Company"} Dashboard
          </Link>
          <div className="mt-2 flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-brand">
              <Building2 size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                {company.name || "Company"} — Organization Analytics
              </h1>
              <p className="text-xs text-slate-500">
                {company.industry || "Organization"} • Role: {company.myRole || "ADMIN"}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            to={`/app/companies/${id}/reports`}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
          >
            <Download size={14} /> Company Reports & Export
          </Link>
          <DateRangeFilter
            range={dateFilter.range}
            from={dateFilter.from}
            to={dateFilter.to}
            onChange={setDateFilter}
          />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <AdminStatCard
          label="Team Recruiters"
          value={s.totalRecruiters ?? 0}
          subtext="Active company members"
          icon={Users2}
          tone="blue"
        />
        <AdminStatCard
          label="Total Jobs"
          value={s.totalJobs ?? 0}
          subtext={`Published: ${s.publishedJobs ?? 0} • Closed: ${s.closedJobs ?? 0}`}
          icon={BriefcaseBusiness}
          tone="indigo"
        />
        <AdminStatCard
          label="Applications"
          value={s.totalApplications ?? 0}
          subtext={`Shortlisted: ${s.shortlistedCandidates ?? 0} (${conv.shortlistRate ?? 0}%)`}
          icon={FileText}
          tone="purple"
        />
        <AdminStatCard
          label="Interviews Conducted"
          value={s.interviewsConducted ?? 0}
          subtext={`Scheduled: ${s.interviewsScheduled ?? 0}`}
          icon={CalendarClock}
          tone="amber"
        />
        <AdminStatCard
          label="Candidates Hired"
          value={s.candidatesHired ?? 0}
          subtext={`Offers: ${s.offersMade ?? 0} • Hire rate: ${conv.hireRate ?? 0}%`}
          icon={Award}
          tone="emerald"
        />
      </div>

      {!loading && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900">
              Company Application Funnel
            </h3>
            <div className="mt-4 space-y-3">
              {byStatus.map((item) => {
                const width = Math.max(
                  4,
                  Math.round(((item.count || 0) / maxStatus) * 100)
                );
                return (
                  <div key={item.status} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700">
                        {item.status.replace(/_/g, " ")}
                      </span>
                      <span className="font-bold text-slate-900">
                        {item.count}
                      </span>
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
            <h3 className="text-sm font-bold text-slate-900">
              Conversion Rates & Inventory Breakdown
            </h3>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-slate-50 p-3.5">
                <p className="text-xs text-slate-500">Shortlist Conversion</p>
                <p className="mt-1 text-xl font-bold text-slate-900">
                  {conv.shortlistRate ?? 0}%
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3.5">
                <p className="text-xs text-slate-500">Interview Conversion</p>
                <p className="mt-1 text-xl font-bold text-indigo-700">
                  {conv.interviewRate ?? 0}%
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3.5">
                <p className="text-xs text-slate-500">Offer Conversion</p>
                <p className="mt-1 text-xl font-bold text-amber-700">
                  {conv.offerRate ?? 0}%
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3.5">
                <p className="text-xs text-slate-500">Hire Conversion</p>
                <p className="mt-1 text-xl font-bold text-emerald-700">
                  {conv.hireRate ?? 0}%
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
