import React, { useState, useEffect } from 'react'
import { Button } from '../../../components/ui/Button'

function toDateInput(val) {
  if (!val) return ''
  try {
    return new Date(val).toISOString().split('T')[0]
  } catch {
    return ''
  }
}

export function CertificationForm({ initialData = null, onSubmit, onCancel, isSubmitting = false }) {
  const [form, setForm] = useState({
    name: '',
    issuingOrganization: '',
    issueDate: '',
    expiryDate: '',
    credentialId: '',
    credentialUrl: '',
  })
  const [error, setError] = useState('')

  useEffect(() => {
    if (initialData) {
      setForm({
        name: initialData.name || '',
        issuingOrganization: initialData.issuingOrganization || '',
        issueDate: toDateInput(initialData.issueDate),
        expiryDate: toDateInput(initialData.expiryDate),
        credentialId: initialData.credentialId || '',
        credentialUrl: initialData.credentialUrl || '',
      })
    }
  }, [initialData])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.name.trim() || !form.issuingOrganization.trim()) {
      setError('Certificate Name and Issuing Organization are required')
      return
    }
    await onSubmit({
      name: form.name.trim(),
      issuingOrganization: form.issuingOrganization.trim(),
      issueDate: form.issueDate || null,
      expiryDate: form.expiryDate || null,
      credentialId: form.credentialId.trim() || null,
      credentialUrl: form.credentialUrl.trim() || null,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Certificate Name *</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="e.g. AWS Certified Solutions Architect"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Issuing Organization *</label>
          <input
            type="text"
            value={form.issuingOrganization}
            onChange={(e) => setForm((f) => ({ ...f, issuingOrganization: e.target.value }))}
            placeholder="e.g. Amazon Web Services"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Credential ID</label>
          <input
            type="text"
            value={form.credentialId}
            onChange={(e) => setForm((f) => ({ ...f, credentialId: e.target.value }))}
            placeholder="e.g. AWS-CSA-99210"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Issue Date</label>
          <input
            type="date"
            value={form.issueDate}
            onChange={(e) => setForm((f) => ({ ...f, issueDate: e.target.value }))}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Expiry Date</label>
          <input
            type="date"
            value={form.expiryDate}
            onChange={(e) => setForm((f) => ({ ...f, expiryDate: e.target.value }))}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Credential URL</label>
          <input
            type="url"
            value={form.credentialUrl}
            onChange={(e) => setForm((f) => ({ ...f, credentialUrl: e.target.value }))}
            placeholder="https://credly.com/..."
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          />
        </div>
      </div>

      {error ? <p className="text-xs font-medium text-rose-600">{error}</p> : null}

      <div className="flex justify-end gap-2">
        {onCancel ? (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
        <Button type="submit" isLoading={isSubmitting}>
          {initialData ? 'Update Certification' : 'Save Certification'}
        </Button>
      </div>
    </form>
  )
}
