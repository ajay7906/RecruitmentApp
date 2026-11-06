import React, { useState, useEffect } from 'react'
import { CalendarClock, X } from 'lucide-react'
import { Button } from '../../../components/ui/Button'
import { COMMON_TIMEZONES } from '../schema/interviewSchemas'

export function RescheduleDialog({
  open,
  interview,
  asCandidate = false,
  prefillRequest = null,
  isPending = false,
  onClose,
  onConfirm,
}) {
  const [datePart, setDatePart] = useState('')
  const [startTimePart, setStartTimePart] = useState('11:00')
  const [endTimePart, setEndTimePart] = useState('12:00')
  const [timeZone, setTimeZone] = useState('Asia/Kolkata')
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const sourceStart = prefillRequest?.requestedStartTime || interview?.startTime
    const sourceEnd = prefillRequest?.requestedEndTime || interview?.endTime
    if (sourceStart) {
      const d = new Date(sourceStart)
      setDatePart(d.toISOString().slice(0, 10))
      setStartTimePart(
        `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
      )
    }
    if (sourceEnd) {
      const e = new Date(sourceEnd)
      setEndTimePart(
        `${String(e.getHours()).padStart(2, '0')}:${String(e.getMinutes()).padStart(2, '0')}`,
      )
    }
    setTimeZone(
      prefillRequest?.timeZone || interview?.timeZone || 'Asia/Kolkata',
    )
    setReason(
      prefillRequest
        ? `Approved candidate reschedule request: ${prefillRequest.reason}`
        : '',
    )
    setError('')
  }, [interview, prefillRequest, open])

  if (!open || !interview) return null

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')
    if (!datePart || !startTimePart || !endTimePart) {
      setError('Date, start time, and end time are required')
      return
    }
    const startIso = new Date(`${datePart}T${startTimePart}:00`).toISOString()
    const endIso = new Date(`${datePart}T${endTimePart}:00`).toISOString()
    if (new Date(endIso) <= new Date(startIso)) {
      setError('End time must be after start time')
      return
    }
    if (!reason.trim() || reason.trim().length < 5) {
      setError('Please provide a reason (at least 5 characters)')
      return
    }

    if (asCandidate) {
      onConfirm({
        requestedDate: startIso,
        requestedStartTime: startIso,
        requestedEndTime: endIso,
        timeZone,
        reason: reason.trim(),
      })
    } else {
      onConfirm({
        interviewDate: startIso,
        startTime: startIso,
        endTime: endIso,
        timeZone,
        reason: reason.trim(),
        rescheduleRequestId: prefillRequest?.id || undefined,
      })
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="rounded-xl bg-amber-50 p-2 text-amber-600">
              <CalendarClock className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {asCandidate
                  ? 'Request Interview Reschedule'
                  : 'Reschedule Interview'}
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
              {asCandidate ? 'Preferred Date *' : 'New Date *'}
            </label>
            <input
              type="date"
              value={datePart}
              onChange={(e) => setDatePart(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Start Time *
              </label>
              <input
                type="time"
                value={startTimePart}
                onChange={(e) => setStartTimePart(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                End Time *
              </label>
              <input
                type="time"
                value={endTimePart}
                onChange={(e) => setEndTimePart(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Time Zone
            </label>
            <select
              value={timeZone}
              onChange={(e) => setTimeZone(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs"
            >
              {COMMON_TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Reason for Rescheduling *
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why the schedule needs to be updated..."
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs"
            />
          </div>

          {error ? <p className="text-xs font-semibold text-rose-600">{error}</p> : null}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isPending}>
              {asCandidate ? 'Submit Request' : 'Confirm Reschedule'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
