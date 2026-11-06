import React, { useState } from 'react'
import { Award, X } from 'lucide-react'
import { Button } from '../../../components/ui/Button'
import { HIRING_DECISION_OPTIONS } from '../schema/interviewSchemas'

export function HiringDecisionDialog({
  open,
  candidateName,
  jobTitle,
  currentApplicationStatus,
  isPending = false,
  onClose,
  onConfirm,
}) {
  const [decision, setDecision] = useState('SELECTED')
  const [targetApplicationStatus, setTargetApplicationStatus] = useState('OFFERED')
  const [decisionReason, setDecisionReason] = useState('')
  const [internalNotes, setInternalNotes] = useState('')
  const [error, setError] = useState('')

  if (!open) return null

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')
    if (!decisionReason.trim() || decisionReason.trim().length < 3) {
      setError('Please enter a decision reason (at least 3 characters)')
      return
    }
    onConfirm({
      decision,
      targetApplicationStatus:
        decision === 'SELECTED'
          ? targetApplicationStatus
          : decision === 'REJECTED'
          ? 'REJECTED'
          : undefined,
      decisionReason: decisionReason.trim(),
      internalNotes: internalNotes.trim() || null,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="rounded-xl bg-indigo-50 p-2 text-indigo-600">
              <Award className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Record Final Hiring Decision
              </h3>
              <p className="text-xs text-slate-500">
                {candidateName} • {jobTitle} (Current: {currentApplicationStatus})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-700">
              Decision *
            </label>
            {HIRING_DECISION_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 text-xs font-semibold transition ${
                  decision === opt.value
                    ? `${opt.badgeClass} ring-2 ring-indigo-500/20`
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span>{opt.label}</span>
                <input
                  type="radio"
                  name="hiringDecision"
                  checked={decision === opt.value}
                  onChange={() => setDecision(opt.value)}
                  className="h-4 w-4 text-indigo-600"
                />
              </label>
            ))}
          </div>

          {decision === 'SELECTED' ? (
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Update Application Stage To
              </label>
              <select
                value={targetApplicationStatus}
                onChange={(e) => setTargetApplicationStatus(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold"
              >
                <option value="OFFERED">OFFERED (Extend Job Offer)</option>
                <option value="HIRED">HIRED (Mark Directly as Hired)</option>
              </select>
            </div>
          ) : null}

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Decision Reason *
            </label>
            <textarea
              rows={2}
              value={decisionReason}
              onChange={(e) => setDecisionReason(e.target.value)}
              placeholder="Summary of why this candidate was selected, put on hold, or rejected..."
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Confidential Internal Notes (Private to Hiring Team)
            </label>
            <textarea
              rows={2}
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              placeholder="Compensation band notes, level recommendation, onboarding notes..."
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs"
            />
          </div>

          {error ? <p className="text-xs font-semibold text-rose-600">{error}</p> : null}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isPending}>
              Confirm Hiring Decision
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
