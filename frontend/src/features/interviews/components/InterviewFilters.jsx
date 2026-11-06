import React from 'react'
import { Search, RotateCcw } from 'lucide-react'
import { INTERVIEW_TYPES, INTERVIEW_STATUS_META } from '../schema/interviewSchemas'
import { Button } from '../../../components/ui/Button'

export function InterviewFilters({
  filters,
  onChange,
  onReset,
  companies = [],
  jobs = [],
}) {
  const handleChange = (key, value) => {
    onChange({ ...filters, [key]: value, page: 1 })
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <div className="relative lg:col-span-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={filters.search || ''}
            onChange={(e) => handleChange('search', e.target.value)}
            placeholder="Search candidate, job title, or round..."
            className="w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <div>
          <select
            value={filters.status || ''}
            onChange={(e) => handleChange('status', e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            <option value="">All Statuses</option>
            {Object.entries(INTERVIEW_STATUS_META).map(([key, meta]) => (
              <option key={key} value={key}>
                {meta.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={filters.interviewType || ''}
            onChange={(e) => handleChange('interviewType', e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            <option value="">All Interview Types</option>
            {INTERVIEW_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={filters.timeframe || 'ALL'}
            onChange={(e) => handleChange('timeframe', e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            <option value="ALL">All Schedules</option>
            <option value="UPCOMING">Upcoming Only</option>
            <option value="TODAY">Today Only</option>
            <option value="COMPLETED">Completed Only</option>
            <option value="PENDING_FEEDBACK">Pending Feedback</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="date"
            value={filters.dateFrom || ''}
            onChange={(e) => handleChange('dateFrom', e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-xs"
            title="Filter from date"
          />
          <Button type="button" variant="secondary" onClick={onReset} className="shrink-0 px-2.5 py-2">
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {(companies.length > 0 || jobs.length > 0) ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 border-t border-slate-100 pt-3">
          {companies.length > 0 ? (
            <select
              value={filters.companyId || ''}
              onChange={(e) => handleChange('companyId', e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs"
            >
              <option value="">All Companies</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          ) : null}

          {jobs.length > 0 ? (
            <select
              value={filters.jobId || ''}
              onChange={(e) => handleChange('jobId', e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs"
            >
              <option value="">All Jobs</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.title}
                </option>
              ))}
            </select>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
