import React from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Award,
  CheckCircle2,
  Clock,
  XCircle,
  UserCheck,
  BriefcaseBusiness,
  ArrowLeft,
} from 'lucide-react'

import { interviewsApi } from '../api/interviewsApi'
import { LoadingState } from '../../../components/feedback/LoadingState'
import { ErrorState } from '../../../components/feedback/ErrorState'
import { formatInterviewDateTime } from '../schema/interviewSchemas'
import { ApplicationStatusBadge } from '../../applications/components/ApplicationStatusBadge'

export function HiringDashboardPage() {
  const query = useQuery({
    queryKey: ['interviews', 'hiring-stats'],
    queryFn: () => interviewsApi.getRecruiterHiringStats(),
  })

  if (query.isPending) {
    return <LoadingState title="Loading hiring decisions & pipeline dashboard..." />
  }

  if (query.isError) {
    return (
      <ErrorState
        title="Could not load hiring dashboard"
        message={
          query.error?.response?.data?.message || 'Unable to load hiring metrics.'
        }
        onRetry={query.refetch}
      />
    )
  }

  const stats = query.data?.stats || {}
  const recentDecisions = stats.recentDecisions || []

  const metricCards = [
    {
      label: 'In Interview Stage',
      value: stats.inInterviewStage ?? 0,
      icon: BriefcaseBusiness,
      color: 'text-indigo-600 bg-indigo-50',
    },
    {
      label: 'Shortlisted',
      value: stats.shortlistedStage ?? 0,
      icon: UserCheck,
      color: 'text-blue-600 bg-blue-50',
    },
    {
      label: 'Job Offers Extended',
      value: stats.offeredCount ?? 0,
      icon: Award,
      color: 'text-purple-600 bg-purple-50',
    },
    {
      label: 'Candidates Hired',
      value: stats.hiredCount ?? 0,
      icon: CheckCircle2,
      color: 'text-emerald-600 bg-emerald-50',
    },
    {
      label: 'On Hold Decisions',
      value: stats.onHoldDecisions ?? 0,
      icon: Clock,
      color: 'text-amber-600 bg-amber-50',
    },
    {
      label: 'Rejected Applications',
      value: stats.rejectedCount ?? 0,
      icon: XCircle,
      color: 'text-rose-600 bg-rose-50',
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link
            to="/app/recruiter/interviews"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Interview Management
          </Link>
          <h1 className="mt-1 text-3xl font-bold text-slate-950">
            Hiring Decisions & Outcomes
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Monitor final selection decisions, offers extended, candidates on hold, and hires across your companies.
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {metricCards.map((c) => {
          const Icon = c.icon
          return (
            <div
              key={c.label}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs"
            >
              <span className={`inline-flex rounded-xl p-2 ${c.color}`}>
                <Icon className="h-4 w-4" />
              </span>
              <p className="mt-3 text-2xl font-bold text-slate-900">{c.value}</p>
              <p className="mt-0.5 text-xs font-medium text-slate-500">{c.label}</p>
            </div>
          )
        })}
      </div>

      {/* Recent Hiring Decisions Log */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Recent Final Hiring Decisions
            </h2>
            <p className="text-xs text-slate-500">
              Complete audit log of candidate selections, holds, and rejections.
            </p>
          </div>
        </div>

        {recentDecisions.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">
            No final hiring decisions recorded yet. Open any interview or candidate application to record a decision.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Candidate</th>
                  <th className="px-4 py-3">Job & Company</th>
                  <th className="px-4 py-3">Decision</th>
                  <th className="px-4 py-3">Application Stage</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3">Decided By</th>
                  <th className="px-4 py-3 text-right">Application</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentDecisions.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">
                        {d.candidate?.fullName}
                      </div>
                      <div className="text-xs text-slate-500">
                        {d.candidate?.email}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">
                        {d.job?.title}
                      </div>
                      <div className="text-xs text-slate-500">
                        {d.company?.name}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                          d.decision === 'SELECTED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : d.decision === 'REJECTED'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {d.decision}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <ApplicationStatusBadge
                        status={
                          d.application?.status || d.targetApplicationStatus
                        }
                      />
                    </td>
                    <td className="px-4 py-3 max-w-xs truncate text-xs text-slate-600">
                      {d.decisionReason}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      <div>{d.decidedBy?.fullName}</div>
                      <div className="text-[11px] text-slate-400">
                        {formatInterviewDateTime(d.decidedAt)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={`/app/recruiter/applications/${d.applicationId}`}
                        className="text-xs font-semibold text-indigo-600 hover:underline"
                      >
                        Review Application →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
