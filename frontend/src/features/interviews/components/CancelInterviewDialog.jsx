import React, { useState } from 'react'
import { XCircle, X } from 'lucide-react'
import { Button } from '../../../components/ui/Button'

export function CancelInterviewDialog({
  open,
  interview,
  isPending = false,
  onClose,
  onConfirm,
}) {
  const [cancellationType, setCancellationType] = useState('RECRUITER_CANCELLED')
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')

  if (!open || !interview) return null

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')
    if (!reason.trim() || reason.trim().length < 3) {
      setError('Please provide a cancellation reason')
      return
    }
    onConfirm({
      cancellationType,
      reason: reason.trim(),
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="rounded-xl bg-rose-50 p-2 text-rose-600">
              <XCircle className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Cancel Interview Round
              </h3>
              <p className="text-xs text-slate-500">
                Round {interview.roundNumber}: {interview.title}
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

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Cancellation Category
            </label>
            <select
              value={cancellationType}
              onChange={(e) => setCancellationType(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs"
            >
              <option value="RECRUITER_CANCELLED">Recruiter / Hiring Team Cancelled</option>
              <option value="CANDIDATE_REQUESTED">Candidate Requested Cancellation</option>
              <option value="INTERVIEWER_UNAVAILABLE">Interviewer Unavailable</option>
              <option value="POSITION_CLOSED">Position Closed / Filled</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Cancellation Reason *
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Provide reason for audit trail and candidate notification..."
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs"
            />
          </div>

          {error ? <p className="text-xs font-semibold text-rose-600">{error}</p> : null}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Keep Interview
            </Button>
            <Button type="submit" isLoading={isPending}>
              Confirm Cancellation
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
