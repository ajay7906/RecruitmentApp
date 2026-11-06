import React from 'react'
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  UserX,
  MessageSquareWarning,
} from 'lucide-react'

export function InterviewStatistics({ stats = {}, onSelectTimeframe, activeTimeframe = 'ALL' }) {
  const cards = [
    {
      key: 'ALL',
      label: 'Total Interviews',
      value: stats.totalInterviews ?? 0,
      icon: Calendar,
      color: 'text-indigo-600 bg-indigo-50',
    },
    {
      key: 'UPCOMING',
      label: 'Upcoming',
      value: stats.upcomingInterviews ?? 0,
      icon: Clock,
      color: 'text-blue-600 bg-blue-50',
    },
    {
      key: 'TODAY',
      label: 'Interviews Today',
      value: stats.interviewsToday ?? 0,
      icon: AlertCircle,
      color: 'text-amber-600 bg-amber-50',
    },
    {
      key: 'COMPLETED',
      label: 'Completed',
      value: stats.completedInterviews ?? 0,
      icon: CheckCircle2,
      color: 'text-emerald-600 bg-emerald-50',
    },
    {
      key: 'PENDING_FEEDBACK',
      label: 'Pending Feedback',
      value: stats.pendingFeedback ?? 0,
      icon: MessageSquareWarning,
      color: 'text-purple-600 bg-purple-50',
    },
    {
      key: 'CANCELLED_STAT',
      label: 'Cancelled',
      value: stats.cancelledInterviews ?? 0,
      icon: XCircle,
      color: 'text-rose-600 bg-rose-50',
    },
    {
      key: 'NOSHOW_STAT',
      label: 'No-Show',
      value: stats.noShowInterviews ?? 0,
      icon: UserX,
      color: 'text-orange-600 bg-orange-50',
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
      {cards.map((c) => {
        const Icon = c.icon
        const isClickable = Boolean(onSelectTimeframe) && !c.key.endsWith('_STAT')
        const isActive = activeTimeframe === c.key

        return (
          <div
            key={c.key}
            onClick={() => isClickable && onSelectTimeframe(c.key)}
            className={`rounded-2xl border p-4 transition ${
              isActive
                ? 'border-indigo-500 bg-indigo-50/40 ring-2 ring-indigo-500/15'
                : 'border-slate-200 bg-white hover:border-slate-300'
            } ${isClickable ? 'cursor-pointer' : ''}`}
          >
            <div className="flex items-center justify-between">
              <span className={`rounded-xl p-2 ${c.color}`}>
                <Icon className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-3 text-2xl font-bold text-slate-900">{c.value}</p>
            <p className="mt-0.5 text-xs font-medium text-slate-500">{c.label}</p>
          </div>
        )
      })}
    </div>
  )
}
