import React, { useState, useEffect } from 'react'
import { Button } from '../../../components/ui/Button'
import {
  RATING_LABELS,
  FEEDBACK_RECOMMENDATIONS,
} from '../schema/interviewSchemas'

export function FeedbackForm({
  initialFeedback = null,
  onSubmit,
  isSubmitting = false,
}) {
  const [form, setForm] = useState({
    overallRating: 4,
    technicalRating: 4,
    communicationRating: 4,
    problemSolvingRating: 4,
    experienceRating: 4,
    strengths: '',
    weaknesses: '',
    detailedFeedback: '',
    recommendation: 'HIRE',
  })
  const [error, setError] = useState('')

  useEffect(() => {
    if (initialFeedback) {
      setForm({
        overallRating: initialFeedback.overallRating || 4,
        technicalRating: initialFeedback.technicalRating || 4,
        communicationRating: initialFeedback.communicationRating || 4,
        problemSolvingRating: initialFeedback.problemSolvingRating || 4,
        experienceRating: initialFeedback.experienceRating || 4,
        strengths: initialFeedback.strengths || '',
        weaknesses: initialFeedback.weaknesses || '',
        detailedFeedback: initialFeedback.detailedFeedback || '',
        recommendation: initialFeedback.recommendation || 'HIRE',
      })
    }
  }, [initialFeedback])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.detailedFeedback.trim() || form.detailedFeedback.trim().length < 5) {
      setError('Please provide detailed evaluation feedback (at least 5 characters)')
      return
    }
    await onSubmit({
      overallRating: Number(form.overallRating),
      technicalRating: Number(form.technicalRating),
      communicationRating: Number(form.communicationRating),
      problemSolvingRating: Number(form.problemSolvingRating),
      experienceRating: Number(form.experienceRating),
      strengths: form.strengths.trim() || null,
      weaknesses: form.weaknesses.trim() || null,
      detailedFeedback: form.detailedFeedback.trim(),
      recommendation: form.recommendation,
      isFinalSubmitted: true,
    })
  }

  const ratingFields = [
    { key: 'overallRating', label: 'Overall Rating *' },
    { key: 'technicalRating', label: 'Technical Skills' },
    { key: 'communicationRating', label: 'Communication' },
    { key: 'problemSolvingRating', label: 'Problem Solving' },
    { key: 'experienceRating', label: 'Relevant Experience' },
  ]

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 space-y-4"
    >
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-semibold text-sm text-slate-900">
            {initialFeedback
              ? 'Update Your Interview Evaluation'
              : 'Submit Confidential Interview Evaluation'}
          </h4>
          <p className="text-xs text-slate-500">
            Internal evaluation — kept strictly private from candidates.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {ratingFields.map((field) => (
          <div key={field.key}>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              {field.label}
            </label>
            <select
              value={form[field.key]}
              onChange={(e) =>
                setForm((f) => ({ ...f, [field.key]: Number(e.target.value) }))
              }
              className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-xs font-medium"
            >
              {Object.entries(RATING_LABELS).map(([val, label]) => (
                <option key={val} value={val}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-semibold text-slate-700">
          Hiring Recommendation *
        </label>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {FEEDBACK_RECOMMENDATIONS.map((rec) => {
            const active = form.recommendation === rec.value
            return (
              <button
                key={rec.value}
                type="button"
                onClick={() => setForm((f) => ({ ...f, recommendation: rec.value }))}
                className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                  active
                    ? `${rec.badgeClass} ring-2 ring-indigo-500/20`
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                {rec.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">
            Key Strengths
          </label>
          <textarea
            rows={2}
            value={form.strengths}
            onChange={(e) => setForm((f) => ({ ...f, strengths: e.target.value }))}
            placeholder="Strong system design, clean code, domain knowledge..."
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">
            Areas of Concern / Weaknesses
          </label>
          <textarea
            rows={2}
            value={form.weaknesses}
            onChange={(e) => setForm((f) => ({ ...f, weaknesses: e.target.value }))}
            placeholder="Gaps in distributed caching or SQL query optimization..."
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-700">
          Detailed Evaluation Notes *
        </label>
        <textarea
          rows={3}
          value={form.detailedFeedback}
          onChange={(e) =>
            setForm((f) => ({ ...f, detailedFeedback: e.target.value }))
          }
          placeholder="Comprehensive summary of technical answers, problem solving approach, and cultural fit..."
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs"
        />
      </div>

      {error ? <p className="text-xs font-semibold text-rose-600">{error}</p> : null}

      <div className="flex justify-end">
        <Button type="submit" isLoading={isSubmitting}>
          {initialFeedback ? 'Update Evaluation' : 'Submit Evaluation Feedback'}
        </Button>
      </div>
    </form>
  )
}
