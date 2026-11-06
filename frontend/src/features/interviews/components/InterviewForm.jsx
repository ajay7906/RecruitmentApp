import React, { useState, useEffect } from 'react'
import { Button } from '../../../components/ui/Button'
import {
  INTERVIEW_TYPES,
  INTERVIEW_MODES,
  COMMON_TIMEZONES,
  INTERVIEWER_ROLES,
} from '../schema/interviewSchemas'
import { Trash2, UserPlus } from 'lucide-react'

function toDateInput(iso) {
  if (!iso) return ''
  try {
    return new Date(iso).toISOString().slice(0, 10)
  } catch {
    return ''
  }
}

function toTimeInput(iso) {
  if (!iso) return '10:00'
  try {
    const d = new Date(iso)
    const hh = String(d.getHours()).padStart(2, '0')
    const mm = String(d.getMinutes()).padStart(2, '0')
    return `${hh}:${mm}`
  } catch {
    return '10:00'
  }
}

export function InterviewForm({
  initialData = null,
  applications = [],
  selectedApplicationId = '',
  eligibleMembers = [],
  onSubmit,
  onCancel,
  isSubmitting = false,
}) {
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10)

  const [form, setForm] = useState({
    applicationId: selectedApplicationId || '',
    title: 'Round 1: Technical Interview',
    roundNumber: 1,
    interviewType: 'Technical Interview',
    interviewMode: 'ONLINE',
    datePart: tomorrow,
    startTimePart: '11:00',
    endTimePart: '12:00',
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata',
    location: '',
    meetingLink: '',
    description: '',
    instructions: '',
    allowCandidateReschedule: true,
    status: 'SCHEDULED',
    interviewers: [],
  })

  const [selectedMemberId, setSelectedMemberId] = useState('')
  const [selectedRole, setSelectedRole] = useState('TECHNICAL_INTERVIEWER')
  const [error, setError] = useState('')

  useEffect(() => {
    if (initialData) {
      setForm({
        applicationId: initialData.applicationId || '',
        title: initialData.title || '',
        roundNumber: initialData.roundNumber || 1,
        interviewType: initialData.interviewType || 'Technical Interview',
        interviewMode: initialData.interviewMode || 'ONLINE',
        datePart: toDateInput(initialData.startTime || initialData.interviewDate),
        startTimePart: toTimeInput(initialData.startTime),
        endTimePart: toTimeInput(initialData.endTime),
        timeZone: initialData.timeZone || 'Asia/Kolkata',
        location: initialData.location || '',
        meetingLink: initialData.meetingLink || '',
        description: initialData.description || '',
        instructions: initialData.instructions || '',
        allowCandidateReschedule: initialData.allowCandidateReschedule ?? true,
        status: initialData.status || 'SCHEDULED',
        interviewers: (initialData.interviewers || []).map((a) => ({
          interviewerId: a.interviewerId,
          interviewerRole: a.interviewerRole,
          fullName: a.interviewer?.fullName || a.interviewer?.email || 'Interviewer',
        })),
      })
    } else if (selectedApplicationId) {
      setForm((prev) => ({ ...prev, applicationId: selectedApplicationId }))
    }
  }, [initialData, selectedApplicationId])

  const handleAddInterviewer = () => {
    if (!selectedMemberId) return
    if (form.interviewers.some((i) => i.interviewerId === selectedMemberId)) return
    const member = eligibleMembers.find((m) => m.userId === selectedMemberId)
    setForm((prev) => ({
      ...prev,
      interviewers: [
        ...prev.interviewers,
        {
          interviewerId: selectedMemberId,
          interviewerRole: selectedRole,
          fullName: member?.fullName || member?.email || 'Interviewer',
        },
      ],
    }))
    setSelectedMemberId('')
  }

  const handleRemoveInterviewer = (interviewerId) => {
    setForm((prev) => ({
      ...prev,
      interviewers: prev.interviewers.filter((i) => i.interviewerId !== interviewerId),
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!initialData && !form.applicationId) {
      setError('Please select a candidate job application')
      return
    }
    if (!form.title.trim()) {
      setError('Interview title is required')
      return
    }
    if (!form.datePart || !form.startTimePart || !form.endTimePart) {
      setError('Interview date, start time, and end time are required')
      return
    }

    const startIso = new Date(`${form.datePart}T${form.startTimePart}:00`).toISOString()
    const endIso = new Date(`${form.datePart}T${form.endTimePart}:00`).toISOString()

    if (new Date(endIso) <= new Date(startIso)) {
      setError('End time must be after start time')
      return
    }

    if (
      form.status === 'SCHEDULED' &&
      form.interviewMode === 'ONLINE' &&
      !form.meetingLink.trim()
    ) {
      setError('Meeting link URL is required for scheduled online interviews')
      return
    }

    if (
      form.status === 'SCHEDULED' &&
      form.interviewMode === 'IN_PERSON' &&
      !form.location.trim()
    ) {
      setError('Office location/address is required for in-person interviews')
      return
    }

    await onSubmit({
      applicationId: form.applicationId,
      title: form.title.trim(),
      roundNumber: Number(form.roundNumber) || 1,
      interviewType: form.interviewType,
      interviewMode: form.interviewMode,
      interviewDate: startIso,
      startTime: startIso,
      endTime: endIso,
      timeZone: form.timeZone,
      location: form.location.trim() || null,
      meetingLink: form.meetingLink.trim() || null,
      description: form.description.trim() || null,
      instructions: form.instructions.trim() || null,
      allowCandidateReschedule: Boolean(form.allowCandidateReschedule),
      status: form.status,
      interviewers: form.interviewers.map((i) => ({
        interviewerId: i.interviewerId,
        interviewerRole: i.interviewerRole,
      })),
    })
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-5"
    >
      {!initialData ? (
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-700">
            Select Candidate Application *
          </label>
          <select
            value={form.applicationId}
            onChange={(e) => setForm((f) => ({ ...f, applicationId: e.target.value }))}
            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm"
          >
            <option value="">Choose an eligible candidate application...</option>
            {applications.map((app) => (
              <option key={app.id} value={app.id}>
                {app.candidate?.fullName || app.candidateSnapshot?.fullName || 'Candidate'} —{' '}
                {app.job?.title || app.jobSnapshot?.title} ({app.company?.name}) [{app.status}]
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2">
          <label className="mb-1.5 block text-xs font-semibold text-slate-700">
            Interview Title *
          </label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="e.g. Round 1: Core React & Node.js Technical Interview"
            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-700">
            Round Number *
          </label>
          <input
            type="number"
            min="1"
            max="20"
            value={form.roundNumber}
            onChange={(e) => setForm((f) => ({ ...f, roundNumber: e.target.value }))}
            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-700">
            Interview Type *
          </label>
          <select
            value={form.interviewType}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                interviewType: e.target.value,
                title:
                  f.title.startsWith('Round ')
                    ? `Round ${f.roundNumber}: ${e.target.value}`
                    : f.title,
              }))
            }
            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm"
          >
            {INTERVIEW_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Date, Time, Timezone */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-700">
            Interview Date *
          </label>
          <input
            type="date"
            value={form.datePart}
            onChange={(e) => setForm((f) => ({ ...f, datePart: e.target.value }))}
            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-700">
            Start Time *
          </label>
          <input
            type="time"
            value={form.startTimePart}
            onChange={(e) => setForm((f) => ({ ...f, startTimePart: e.target.value }))}
            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-700">
            End Time *
          </label>
          <input
            type="time"
            value={form.endTimePart}
            onChange={(e) => setForm((f) => ({ ...f, endTimePart: e.target.value }))}
            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-700">
            Time Zone *
          </label>
          <select
            value={form.timeZone}
            onChange={(e) => setForm((f) => ({ ...f, timeZone: e.target.value }))}
            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm"
          >
            {COMMON_TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Mode, Meeting Link, Location */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-700">
            Interview Mode *
          </label>
          <select
            value={form.interviewMode}
            onChange={(e) => setForm((f) => ({ ...f, interviewMode: e.target.value }))}
            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm"
          >
            {INTERVIEW_MODES.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        {form.interviewMode === 'ONLINE' ? (
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">
              Video Meeting Link (Google Meet / Zoom / Teams) *
            </label>
            <input
              type="url"
              value={form.meetingLink}
              onChange={(e) => setForm((f) => ({ ...f, meetingLink: e.target.value }))}
              placeholder="https://meet.google.com/abc-defg-hij"
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm"
            />
          </div>
        ) : (
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">
              {form.interviewMode === 'IN_PERSON'
                ? 'Office Location & Address *'
                : 'Telephonic Contact Details'}
            </label>
            <input
              type="text"
              value={form.location}
              onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
              placeholder={
                form.interviewMode === 'IN_PERSON'
                  ? 'e.g. 4th Floor, Tower B, Tech Park, Bengaluru'
                  : 'e.g. Interviewer will call candidate on registered phone'
              }
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm"
            />
          </div>
        )}
      </div>

      {/* Assign Interviewers */}
      {!initialData && eligibleMembers.length > 0 ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
          <label className="block text-xs font-semibold text-slate-700">
            Assign Interviewers (defaults to you if none added)
          </label>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <select
              value={selectedMemberId}
              onChange={(e) => setSelectedMemberId(e.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs"
            >
              <option value="">Select company team member...</option>
              {eligibleMembers.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.fullName} ({m.email})
                </option>
              ))}
            </select>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs"
            >
              {INTERVIEWER_ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
            <Button
              type="button"
              variant="secondary"
              onClick={handleAddInterviewer}
              className="gap-1.5 text-xs"
            >
              <UserPlus className="h-3.5 w-3.5" />
              Add Interviewer
            </Button>
          </div>

          {form.interviewers.length > 0 ? (
            <div className="flex flex-wrap gap-2 pt-1">
              {form.interviewers.map((item) => (
                <span
                  key={item.interviewerId}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-800"
                >
                  {item.fullName} ({item.interviewerRole})
                  <button
                    type="button"
                    onClick={() => handleRemoveInterviewer(item.interviewerId)}
                    className="text-indigo-500 hover:text-rose-600"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Description & Instructions */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-700">
            Interview Agenda / Description
          </label>
          <textarea
            rows={3}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Topics covered in this round (e.g. Data structures, System Design, React architecture)..."
            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-700">
            Candidate Instructions
          </label>
          <textarea
            rows={3}
            value={form.instructions}
            onChange={(e) => setForm((f) => ({ ...f, instructions: e.target.value }))}
            placeholder="Please join 5 minutes early with a working camera and IDE ready..."
            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-4">
        <div className="flex flex-wrap items-center gap-4">
          <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={form.allowCandidateReschedule}
              onChange={(e) =>
                setForm((f) => ({ ...f, allowCandidateReschedule: e.target.checked }))
              }
              className="rounded border-slate-300 text-indigo-600"
            />
            Allow candidate to request rescheduling
          </label>

          {!initialData ? (
            <select
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold"
            >
              <option value="SCHEDULED">Schedule Immediately & Notify Candidate</option>
              <option value="DRAFT">Save as Draft (Internal Preparation)</option>
            </select>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          {onCancel ? (
            <Button type="button" variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
          ) : null}
          <Button type="submit" isLoading={isSubmitting}>
            {initialData ? 'Save Interview Changes' : 'Schedule Interview Round'}
          </Button>
        </div>
      </div>

      {error ? <p className="text-xs font-semibold text-rose-600">{error}</p> : null}
    </form>
  )
}
