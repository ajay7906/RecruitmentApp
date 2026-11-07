import { useState, useEffect, useCallback } from "react";
import { Users, Building2, BriefcaseBusiness, Award } from "lucide-react";
import { toast } from "sonner";
import { adminApi } from "../api/adminApi";
import { DateRangeFilter } from "../components/DateRangeFilter";
import { AdminStatCard } from "../components/AdminStatCard";

function DistributionBarList({ title, items = [], labelKey, countKey = "count", barColor = "bg-brand" }) {
  const maxVal = Math.max(1, ...items.map((i) => i[countKey] || 0));
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
      <h3 className="text-sm font-bold text-slate-900">{title}</h3>
      <div className="mt-4 space-y-3">
        {items.length === 0 ? (
          <p className="text-xs text-slate-400">No data available</p>
        ) : (
          items.map((item, idx) => {
            const label = item[labelKey] || "Unspecified";
            const count = item[countKey] || 0;
            const width = Math.max(4, Math.round((count / maxVal) * 100));
            return (
              <div key={`${label}-${idx}`} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-700">
                    {String(label).replace(/_/g, " ")}
                  </span>
                  <span className="font-bold text-slate-900">{count}</span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-100">
                  <div
                    style={{ width: `${width}%` }}
                    className={`h-2 rounded-full ${barColor}`}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export function AdminAnalyticsPage() {
  const [dateFilter, setDateFilter] = useState({ range: "30d", from: "", to: "" });
  const [usersData, setUsersData] = useState(null);
  const [companiesData, setCompaniesData] = useState(null);
  const [jobsData, setJobsData] = useState(null);
  const [recruitmentData, setRecruitmentData] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const [u, c, j, r] = await Promise.all([
        adminApi.getUserAnalytics(dateFilter),
        adminApi.getCompanyAnalytics(dateFilter),
        adminApi.getJobAnalytics(dateFilter),
        adminApi.getRecruitmentAnalytics(dateFilter),
      ]);
      setUsersData(u);
      setCompaniesData(c);
      setJobsData(j);
      setRecruitmentData(r);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to load platform analytics");
    } finally {
      setLoading(false);
    }
  }, [dateFilter]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const conv = recruitmentData?.conversionRates || {};
  const funnel = recruitmentData?.funnel || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Reports & Platform Analytics
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Live database aggregations across user acquisition, company verification, job inventory, and recruitment funnel conversion.
          </p>
        </div>
        <DateRangeFilter
          range={dateFilter.range}
          from={dateFilter.from}
          to={dateFilter.to}
          onChange={setDateFilter}
        />
      </div>

      {/* Period Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AdminStatCard
          label="New Users in Period"
          value={usersData?.totals?.newInPeriod ?? 0}
          subtext={`Total platform users: ${usersData?.totals?.total ?? 0}`}
          icon={Users}
          tone="blue"
        />
        <AdminStatCard
          label="New Companies in Period"
          value={companiesData?.totals?.newInPeriod ?? 0}
          subtext={`Approved: ${companiesData?.totals?.APPROVED ?? 0} • Pending: ${companiesData?.totals?.PENDING_APPROVAL ?? 0}`}
          icon={Building2}
          tone="emerald"
        />
        <AdminStatCard
          label="New Jobs in Period"
          value={jobsData?.totals?.newInPeriod ?? 0}
          subtext={`Published: ${jobsData?.totals?.published ?? 0} • Closed: ${jobsData?.totals?.closed ?? 0}`}
          icon={BriefcaseBusiness}
          tone="indigo"
        />
        <AdminStatCard
          label="Overall Hire Conversion"
          value={`${conv.overallHireRatePct ?? 0}%`}
          subtext={`${recruitmentData?.totals?.hired ?? 0} hired from ${recruitmentData?.totals?.totalApplications ?? 0} applications`}
          icon={Award}
          tone="purple"
        />
      </div>

      {/* Recruitment Funnel Visualization */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              End-to-End Recruitment Funnel
            </h2>
            <p className="text-xs text-slate-500">
              Stage-by-stage progression and conversion ratios for the selected date range
            </p>
          </div>
          <div className="flex flex-wrap gap-3 text-xs">
            <span className="rounded-lg bg-blue-50 px-2.5 py-1 font-semibold text-blue-700">
              Shortlist Rate: {conv.applicationToShortlistPct ?? 0}%
            </span>
            <span className="rounded-lg bg-indigo-50 px-2.5 py-1 font-semibold text-indigo-700">
              Interview Rate: {conv.shortlistToInterviewPct ?? 0}%
            </span>
            <span className="rounded-lg bg-amber-50 px-2.5 py-1 font-semibold text-amber-800">
              Offer Rate: {conv.interviewToOfferPct ?? 0}%
            </span>
            <span className="rounded-lg bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700">
              Offer→Hire: {conv.offerToHirePct ?? 0}%
            </span>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-5">
          {funnel.map((step) => (
            <div
              key={step.stage}
              className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-center"
            >
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                {step.label}
              </p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{step.count}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Distribution Breakdowns */}
      {loading ? (
        <div className="p-8 text-center text-sm text-slate-500">Computing analytics...</div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <DistributionBarList
            title="User Distribution by Role"
            items={usersData?.roleDistribution || []}
            labelKey="role"
            barColor="bg-brand"
          />
          <DistributionBarList
            title="User Distribution by Account Status"
            items={usersData?.statusDistribution || []}
            labelKey="status"
            barColor="bg-indigo-500"
          />
          <DistributionBarList
            title="Companies by Approval Status"
            items={companiesData?.statusDistribution || []}
            labelKey="status"
            barColor="bg-emerald-500"
          />
          <DistributionBarList
            title="Top Company Industries"
            items={companiesData?.industryDistribution || []}
            labelKey="industry"
            barColor="bg-teal-500"
          />
          <DistributionBarList
            title="Jobs by Employment Type"
            items={jobsData?.employmentTypeDistribution || []}
            labelKey="employmentType"
            barColor="bg-purple-500"
          />
          <DistributionBarList
            title="Jobs by Work Mode"
            items={jobsData?.workModeDistribution || []}
            labelKey="workMode"
            barColor="bg-amber-500"
          />
        </div>
      )}
    </div>
  );
}
