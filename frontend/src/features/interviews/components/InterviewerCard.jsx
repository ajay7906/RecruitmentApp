import React from 'react'
import { UserCheck, Trash2 } from 'lucide-react'
import { INTERVIEWER_ROLES } from '../schema/interviewSchemas'

export function InterviewerCard({ assignment, onRemove, canRemove = false }) {
  if (!assignment) return null
  const user = assignment.interviewer || {}
  const roleLabel =
    INTERVIEWER_ROLES.find((r) => r.value === assignment.interviewerRole)?.label ||
    assignment.interviewerRole

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 shadow-2xs">
      <div className="flex items-center gap-3 min-w-0">
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-indigo-50 text-xs font-bold text-indigo-700">
          {(user.fullName || user.email || 'I').slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-semibold text-xs text-slate-900 truncate">
              {user.fullName || assignment.interviewerName || 'Interviewer'}
            </span>
            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
              {roleLabel}
            </span>
            {assignment.assignmentStatus === 'COMPLETED' ? (
              <span className="inline-flex items-center gap-0.5 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                <UserCheck className="h-3 w-3" /> Evaluated
              </span>
            ) : null}
          </div>
          {user.email ? (
            <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
          ) : null}
        </div>
      </div>

      {canRemove && onRemove ? (
        <button
          type="button"
          onClick={() => onRemove(assignment.id)}
          className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50"
          title="Remove interviewer"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  )
}
