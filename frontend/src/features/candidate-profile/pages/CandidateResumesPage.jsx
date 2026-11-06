import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { FileText, ShieldCheck, Sparkles, ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

import { profileApi } from '../api/profileApi'
import { LoadingState } from '../../../components/feedback/LoadingState'
import { ErrorState } from '../../../components/feedback/ErrorState'
import { Button } from '../../../components/ui/Button'
import { CandidateProfileSection } from '../components/CandidateProfileSection'
import { ResumeUploader } from '../components/ResumeUploader'
import { ResumeList } from '../components/ResumeList'
import { ResumeVersionHistory } from '../components/ResumeVersionHistory'

export function CandidateResumesPage() {
  const queryClient = useQueryClient()
  const [replacingResume, setReplacingResume] = useState(null)

  const resumesQuery = useQuery({
    queryKey: ['candidate', 'resumes'],
    queryFn: profileApi.listResumes,
  })

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['candidate', 'resumes'] })
    queryClient.invalidateQueries({ queryKey: ['candidate', 'profile'] })
    queryClient.invalidateQueries({ queryKey: ['candidate', 'completion'] })
  }

  const uploadMutation = useMutation({
    mutationFn: ({ file, label, isPrimary, replaceResumeId }) =>
      replaceResumeId
        ? profileApi.replaceResume(replaceResumeId, { file, label })
        : profileApi.uploadResume({ file, label, isPrimary }),
    onSuccess: (_, variables) => {
      invalidateAll()
      setReplacingResume(null)
      toast.success(
        variables.replaceResumeId
          ? 'New resume version uploaded!'
          : 'Resume uploaded and validated!',
      )
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Resume upload failed')
    },
  })

  const setPrimaryMutation = useMutation({
    mutationFn: profileApi.setPrimaryResume,
    onSuccess: () => {
      invalidateAll()
      toast.success('Primary resume updated')
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to update primary resume')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: profileApi.deleteResume,
    onSuccess: () => {
      invalidateAll()
      toast.success('Resume deleted')
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to delete resume')
    },
  })

  const handleDownload = async (resume) => {
    try {
      const response = await profileApi.downloadResume(resume.id)
      const blob = new Blob([response.data], { type: resume.mimeType || 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = resume.originalFileName || 'resume.pdf'
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch {
      toast.error('Could not download resume file')
    }
  }

  if (resumesQuery.isPending) return <LoadingState title="Loading resumes..." />
  if (resumesQuery.isError)
    return (
      <ErrorState
        title="Could not load resumes"
        message={resumesQuery.error?.response?.data?.message || 'Failed to load resumes'}
        onRetry={resumesQuery.refetch}
      />
    )

  const resumes = resumesQuery.data?.data?.resumes || resumesQuery.data?.resumes || []
  const primaryResume = resumes.find((r) => r.isPrimary) || resumes[0] || null

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            to="/app/profile"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Candidate Profile
          </Link>
          <h1 className="mt-1 text-3xl font-bold text-slate-950">Resume Management</h1>
          <p className="mt-1 text-sm text-slate-500">
            Upload role-specific resumes, manage versions, and choose your primary default resume.
          </p>
        </div>
      </div>

      {/* Info Banner */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-600">
            <FileText className="h-4 w-4" />
            Primary Resume
          </div>
          <p className="mt-2 font-semibold text-sm text-slate-900 truncate">
            {primaryResume
              ? primaryResume.label || primaryResume.originalFileName
              : 'No resume uploaded'}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            {primaryResume
              ? `Version v${primaryResume.version || 1} • Auto-selected when applying`
              : 'Upload a resume below to get started'}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-600">
            <ShieldCheck className="h-4 w-4" />
            Application Integrity
          </div>
          <p className="mt-2 font-semibold text-sm text-slate-900">
            Historical Snapshot Protection
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            Replacing a resume creates a new version (v2, v3) while preserving past job applications.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-600">
            <Sparkles className="h-4 w-4" />
            Document Processing
          </div>
          <p className="mt-2 font-semibold text-sm text-slate-900">
            Plain-Text Extraction Ready
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            Validates PDF/DOC/DOCX binary headers and extracts plain text for recruiter search.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1 space-y-6">
          <CandidateProfileSection
            title={replacingResume ? 'Upload New Version' : 'Upload Resume'}
            description="Supported formats: PDF, DOC, DOCX (Max 5 MB)."
            icon={FileText}
          >
            <ResumeUploader
              replaceTarget={replacingResume}
              onCancelReplace={() => setReplacingResume(null)}
              isUploading={uploadMutation.isPending}
              onUpload={async ({ file, label, isPrimary, replaceResumeId }) => {
                await uploadMutation.mutateAsync({
                  file,
                  label,
                  isPrimary,
                  replaceResumeId,
                })
              }}
            />
          </CandidateProfileSection>

          <ResumeVersionHistory resumes={resumes} />
        </div>

        <div className="lg:col-span-2">
          <CandidateProfileSection
            title="Stored Resumes"
            description="Manage all your uploaded resumes and extracted text previews."
            icon={FileText}
            badge={`${resumes.length} Total`}
          >
            <ResumeList
              resumes={resumes}
              isMutating={
                setPrimaryMutation.isPending ||
                deleteMutation.isPending ||
                uploadMutation.isPending
              }
              onSetPrimary={(id) => setPrimaryMutation.mutate(id)}
              onDelete={(id) => deleteMutation.mutate(id)}
              onReplace={(resume) => setReplacingResume(resume)}
              onDownload={handleDownload}
            />
          </CandidateProfileSection>
        </div>
      </div>
    </div>
  )
}
