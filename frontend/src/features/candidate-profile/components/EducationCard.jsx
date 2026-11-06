import React from 'react'
import { GraduationCap, Pencil, Trash2 } from 'lucide-react'

function formatPeriod(startDate, endDate, currentlyStudying) {
  const fmt = (d) =>
    d ? new Date(d).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : ''
  const start = fmt(startDate)
  const end = currentlyStudying ? 'Present' : fmt(endDate)
  if (!start && !end) return ''
  return `${start || 'N/A'} - ${end || 'N/A'}`
}

export function EducationCard({ education, onEdit, onDelete, isMutating = false }) {
  if (!education) return null

  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-indigo-50 p-2.5 text-indigo-600">
          <GraduationCap className="h-5 w-5" />
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-semibold text-sm text-slate-900">
              {education.degree}
              {education.fieldOfStudy ? ` in ${education.fieldOfStudy}` : ''}
            </h4>
            {education.educationLevel ? (
              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                {education.educationLevel}
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 text-xs font-medium text-slate-700">
            {education.institutionName}
            {education.universityName ? ` • ${education.universityName}` : ''}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
            <span>{formatPeriod(education.startDate, education.endDate, education.currentlyStudying)}</span>
            {education.grade ? <span>Grade / CGPA: {education.grade}</span> : null}
          </div>
          {education.description ? (
            <p className="mt-2 text-xs text-slate-600 whitespace-pre-line">{education.description}</p>
          ) : null}
        </div>
      </div>

      {(onEdit || onDelete) ? (
        <div className="flex items-center gap-1">
          {onEdit ? (
            <button
              type="button"
              disabled={isMutating}
              onClick={() => onEdit(education)}
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              title="Edit education"
            >
              <Pencil className="h-4 w-4" />
            </button>
          ) : null}
          {onDelete ? (
            <button
              type="button"
              disabled={isMutating}
              onClick={() => onDelete(education.id)}
              className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50 hover:text-rose-700"
              title="Delete education"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
