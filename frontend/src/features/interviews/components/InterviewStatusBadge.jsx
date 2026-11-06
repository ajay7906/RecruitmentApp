import React from 'react'
import { INTERVIEW_STATUS_META } from '../schema/interviewSchemas'

export function InterviewStatusBadge({ status }) {
  const meta = INTERVIEW_STATUS_META[status] || {
    label: status || 'Scheduled',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
  }

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${meta.badgeClass}`}
    >
      {meta.label}
    </span>
  )
}
