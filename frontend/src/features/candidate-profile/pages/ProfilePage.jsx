import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Link } from 'react-router-dom'
import {
  UserRound,
  MapPin,
  Briefcase,
  Link2,
  Save,
  Phone,
  Calendar,
  Users,
  FileText,
  Building2,
  Sparkles,
  GraduationCap,
  FolderGit2,
  Award,
  Trophy,
  Languages as LanguagesIcon,
  Plus,
  Pencil,
  Trash2,
  ExternalLink,
} from 'lucide-react'

import { profileApi } from '../api/profileApi'
import {
  profileSchema,
  EMPLOYMENT_STATUS_OPTIONS,
  NOTICE_PERIOD_OPTIONS,
  PREFERRED_EMPLOYMENT_TYPES,
  PREFERRED_WORK_MODES,
} from '../schema/profileSchema'
import { LoadingState } from '../../../components/feedback/LoadingState'
import { ErrorState } from '../../../components/feedback/ErrorState'
import { Button } from '../../../components/ui/Button'
import { ProfileSection } from '../components/ProfileSection'
import { ProfileField, profileInputClass } from '../components/ProfileField'
import { CandidateProfileSection } from '../components/CandidateProfileSection'
import { ProfileCompletion } from '../components/ProfileCompletion'
import { SkillCard } from '../components/SkillCard'
import { SkillsInput } from '../components/SkillsInput'
import { EducationCard } from '../components/EducationCard'
import { EducationForm } from '../components/EducationForm'
import { ExperienceCard } from '../components/ExperienceCard'
import { ExperienceForm } from '../components/ExperienceForm'
import { ProjectForm } from '../components/ProjectForm'
import { CertificationForm } from '../components/CertificationForm'
import { AchievementForm } from '../components/AchievementForm'
import { LanguageForm } from '../components/LanguageForm'
import { ResumeUploader } from '../components/ResumeUploader'
import { ResumeList } from '../components/ResumeList'

function toFormDefaults(profile = {}) {
  return {
    phone: profile.phone ?? '',
    dateOfBirth: profile.dateOfBirth
      ? new Date(profile.dateOfBirth).toISOString().slice(0, 10)
      : '',
    gender: profile.gender ?? '',
    profileImageUrl: profile.profileImageUrl ?? '',
    headline: profile.headline ?? '',
    bio: profile.bio ?? '',
    careerSummary: profile.careerSummary ?? '',
    location: profile.location ?? '',
    city: profile.city ?? '',
    state: profile.state ?? '',
    country: profile.country ?? '',
    pincode: profile.pincode ?? '',
    address: profile.address ?? '',
    yearsOfExperience:
      profile.yearsOfExperience != null ? String(profile.yearsOfExperience) : '',
    relevantExperience:
      profile.relevantExperience != null ? String(profile.relevantExperience) : '',
    currentJobTitle: profile.currentJobTitle ?? '',
    currentCompany: profile.currentCompany ?? '',
    employmentStatus: profile.employmentStatus ?? '',
    expectedSalary:
      profile.expectedSalary != null ? String(profile.expectedSalary) : '',
    currentSalary:
      profile.currentSalary != null ? String(profile.currentSalary) : '',
    salaryCurrency: profile.salaryCurrency ?? 'INR',
    noticePeriod: profile.noticePeriod ?? '',
    preferredLocationsText: Array.isArray(profile.preferredLocations)
      ? profile.preferredLocations.join(', ')
      : '',
    preferredEmploymentType: profile.preferredEmploymentType ?? '',
    preferredWorkMode: profile.preferredWorkMode ?? '',
    linkedinUrl: profile.linkedinUrl ?? '',
    githubUrl: profile.githubUrl ?? '',
    portfolioUrl: profile.portfolioUrl ?? '',
  }
}

export function ProfilePage() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('personal')

  // Section editing states
  const [editingSkill, setEditingSkill] = useState(null)
  const [showEducationForm, setShowEducationForm] = useState(false)
  const [editingEducation, setEditingEducation] = useState(null)
  const [showExperienceForm, setShowExperienceForm] = useState(false)
  const [editingExperience, setEditingExperience] = useState(null)
  const [showProjectForm, setShowProjectForm] = useState(false)
  const [editingProject, setEditingProject] = useState(null)
  const [showCertForm, setShowCertForm] = useState(false)
  const [editingCert, setEditingCert] = useState(null)
  const [showAchievementForm, setShowAchievementForm] = useState(false)
  const [editingAchievement, setEditingAchievement] = useState(null)
  const [showLanguageForm, setShowLanguageForm] = useState(false)
  const [editingLanguage, setEditingLanguage] = useState(null)
  const [replacingResume, setReplacingResume] = useState(null)

  const query = useQuery({
    queryKey: ['candidate', 'profile'],
    queryFn: profileApi.getMyProfile,
    retry: false,
  })

  const suggestionsQuery = useQuery({
    queryKey: ['candidate', 'skill-suggestions'],
    queryFn: profileApi.getSkillSuggestions,
    staleTime: 60000,
  })

  const invalidateProfile = () => {
    queryClient.invalidateQueries({ queryKey: ['candidate', 'profile'] })
    queryClient.invalidateQueries({ queryKey: ['candidate', 'resumes'] })
    queryClient.invalidateQueries({ queryKey: ['candidate', 'completion'] })
  }

  const mutation = useMutation({
    mutationFn: profileApi.updateMyProfile,
    onSuccess: (data) => {
      queryClient.setQueryData(['candidate', 'profile'], data)
      invalidateProfile()
      toast.success('Profile saved successfully!')
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to save profile.')
    },
  })

  // Sub-section mutations
  const skillMutation = useMutation({
    mutationFn: ({ id, payload }) =>
      id ? profileApi.updateSkill(id, payload) : profileApi.addSkill(payload),
    onSuccess: () => {
      invalidateProfile()
      setEditingSkill(null)
      toast.success('Skill saved')
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Could not save skill'),
  })

  const deleteSkillMutation = useMutation({
    mutationFn: profileApi.deleteSkill,
    onSuccess: () => {
      invalidateProfile()
      toast.success('Skill removed')
    },
  })

  const educationMutation = useMutation({
    mutationFn: ({ id, payload }) =>
      id ? profileApi.updateEducation(id, payload) : profileApi.addEducation(payload),
    onSuccess: () => {
      invalidateProfile()
      setShowEducationForm(false)
      setEditingEducation(null)
      toast.success('Education saved')
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Could not save education'),
  })

  const deleteEducationMutation = useMutation({
    mutationFn: profileApi.deleteEducation,
    onSuccess: () => {
      invalidateProfile()
      toast.success('Education entry deleted')
    },
  })

  const experienceMutation = useMutation({
    mutationFn: ({ id, payload }) =>
      id ? profileApi.updateExperience(id, payload) : profileApi.addExperience(payload),
    onSuccess: () => {
      invalidateProfile()
      setShowExperienceForm(false)
      setEditingExperience(null)
      toast.success('Work experience saved')
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Could not save experience'),
  })

  const deleteExperienceMutation = useMutation({
    mutationFn: profileApi.deleteExperience,
    onSuccess: () => {
      invalidateProfile()
      toast.success('Work experience deleted')
    },
  })

  const projectMutation = useMutation({
    mutationFn: ({ id, payload }) =>
      id ? profileApi.updateProject(id, payload) : profileApi.addProject(payload),
    onSuccess: () => {
      invalidateProfile()
      setShowProjectForm(false)
      setEditingProject(null)
      toast.success('Project saved')
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Could not save project'),
  })

  const deleteProjectMutation = useMutation({
    mutationFn: profileApi.deleteProject,
    onSuccess: () => {
      invalidateProfile()
      toast.success('Project deleted')
    },
  })

  const certMutation = useMutation({
    mutationFn: ({ id, payload }) =>
      id ? profileApi.updateCertification(id, payload) : profileApi.addCertification(payload),
    onSuccess: () => {
      invalidateProfile()
      setShowCertForm(false)
      setEditingCert(null)
      toast.success('Certification saved')
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Could not save certification'),
  })

  const deleteCertMutation = useMutation({
    mutationFn: profileApi.deleteCertification,
    onSuccess: () => {
      invalidateProfile()
      toast.success('Certification deleted')
    },
  })

  const achievementMutation = useMutation({
    mutationFn: ({ id, payload }) =>
      id ? profileApi.updateAchievement(id, payload) : profileApi.addAchievement(payload),
    onSuccess: () => {
      invalidateProfile()
      setShowAchievementForm(false)
      setEditingAchievement(null)
      toast.success('Achievement saved')
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Could not save achievement'),
  })

  const deleteAchievementMutation = useMutation({
    mutationFn: profileApi.deleteAchievement,
    onSuccess: () => {
      invalidateProfile()
      toast.success('Achievement deleted')
    },
  })

  const languageMutation = useMutation({
    mutationFn: ({ id, payload }) =>
      id ? profileApi.updateLanguage(id, payload) : profileApi.addLanguage(payload),
    onSuccess: () => {
      invalidateProfile()
      setShowLanguageForm(false)
      setEditingLanguage(null)
      toast.success('Language saved')
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Could not save language'),
  })

  const deleteLanguageMutation = useMutation({
    mutationFn: profileApi.deleteLanguage,
    onSuccess: () => {
      invalidateProfile()
      toast.success('Language removed')
    },
  })

  // Resume mutations on Profile Page
  const uploadResumeMutation = useMutation({
    mutationFn: ({ file, label, isPrimary, replaceResumeId }) =>
      replaceResumeId
        ? profileApi.replaceResume(replaceResumeId, { file, label })
        : profileApi.uploadResume({ file, label, isPrimary }),
    onSuccess: () => {
      invalidateProfile()
      setReplacingResume(null)
      toast.success('Resume uploaded and processed successfully!')
    },
    onError: (err) =>
      toast.error(err?.response?.data?.message || 'Failed to upload resume'),
  })

  const setPrimaryResumeMutation = useMutation({
    mutationFn: profileApi.setPrimaryResume,
    onSuccess: () => {
      invalidateProfile()
      toast.success('Primary resume updated')
    },
  })

  const deleteResumeMutation = useMutation({
    mutationFn: profileApi.deleteResume,
    onSuccess: () => {
      invalidateProfile()
      toast.success('Resume deleted')
    },
  })

  const profile =
    query.data?.data?.profile ?? query.data?.profile ?? query.data ?? {}

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: toFormDefaults(profile),
  })

  useEffect(() => {
    reset(toFormDefaults(profile))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.data])

  function onSubmit(values) {
    const preferredLocations = values.preferredLocationsText
      ? values.preferredLocationsText
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : []

    const payload = {
      phone: values.phone || null,
      dateOfBirth: values.dateOfBirth || null,
      gender: values.gender || null,
      profileImageUrl: values.profileImageUrl || null,
      headline: values.headline || null,
      bio: values.bio || null,
      careerSummary: values.careerSummary || null,
      location: values.location || null,
      city: values.city || null,
      state: values.state || null,
      country: values.country || null,
      pincode: values.pincode || null,
      address: values.address || null,
      yearsOfExperience:
        values.yearsOfExperience !== '' ? Number(values.yearsOfExperience) : null,
      relevantExperience:
        values.relevantExperience !== '' ? Number(values.relevantExperience) : null,
      currentJobTitle: values.currentJobTitle || null,
      currentCompany: values.currentCompany || null,
      employmentStatus: values.employmentStatus || null,
      expectedSalary:
        values.expectedSalary !== '' ? Number(values.expectedSalary) : null,
      currentSalary:
        values.currentSalary !== '' ? Number(values.currentSalary) : null,
      salaryCurrency: values.salaryCurrency || 'INR',
      noticePeriod: values.noticePeriod || null,
      preferredLocations,
      preferredEmploymentType: values.preferredEmploymentType || null,
      preferredWorkMode: values.preferredWorkMode || null,
      linkedinUrl: values.linkedinUrl || null,
      githubUrl: values.githubUrl || null,
      portfolioUrl: values.portfolioUrl || null,
    }
    mutation.mutate(payload)
  }

  const handleDownloadResume = async (resume) => {
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

  if (query.isPending) return <LoadingState title="Loading candidate profile..." />
  if (query.isError)
    return (
      <ErrorState
        title="Could not load profile"
        message={query.error?.response?.data?.message || 'Unable to load candidate profile.'}
        onRetry={query.refetch}
      />
    )

  const skills = profile.skills || []
  const educations = profile.educations || []
  const experiences = profile.experiences || []
  const projects = profile.projects || []
  const certifications = profile.certifications || []
  const achievements = profile.achievements || []
  const languages = profile.languages || []
  const resumes = profile.resumes || []
  const skillSuggestions =
    suggestionsQuery.data?.data?.suggestions || suggestionsQuery.data?.suggestions || []

  const TABS = [
    { key: 'personal', label: 'Personal & Professional', icon: UserRound },
    { key: 'resumes', label: `Resumes (${resumes.length})`, icon: FileText },
    { key: 'skills', label: `Skills (${skills.length})`, icon: Sparkles },
    { key: 'education', label: `Education (${educations.length})`, icon: GraduationCap },
    { key: 'experience', label: `Experience (${experiences.length})`, icon: Briefcase },
    {
      key: 'portfolio',
      label: `Projects & More (${projects.length + certifications.length + achievements.length + languages.length})`,
      icon: FolderGit2,
    },
  ]

  const handleSelectMissingSection = (sectionKey) => {
    if (sectionKey === 'personal' || sectionKey === 'professional') setActiveTab('personal')
    else if (sectionKey === 'resume') setActiveTab('resumes')
    else if (sectionKey === 'skills') setActiveTab('skills')
    else if (sectionKey === 'education') setActiveTab('education')
    else if (sectionKey === 'experience') setActiveTab('experience')
    else setActiveTab('portfolio')
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
            CANDIDATE DATA & RESUME CENTER
          </p>
          <h1 className="mt-1 text-3xl font-bold text-slate-950">My Candidate Profile</h1>
          <p className="mt-1 text-sm text-slate-500">
            Maintain your structured career history, skills, and resumes for fast job applications.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Link to="/app/resumes">
            <Button variant="secondary" className="gap-1.5">
              <FileText className="h-4 w-4" />
              Resume Manager
            </Button>
          </Link>
          {activeTab === 'personal' ? (
            <Button
              type="submit"
              form="profile-form"
              disabled={mutation.isPending || !isDirty}
              className="gap-2"
            >
              <Save size={16} />
              {mutation.isPending ? 'Saving…' : 'Save Profile Info'}
            </Button>
          ) : null}
        </div>
      </div>

      {/* Live Profile Completion Meter */}
      <ProfileCompletion
        completion={profile.completion}
        onSelectSection={handleSelectMissingSection}
      />

      {/* Section Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        {TABS.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.key
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* TAB 1: PERSONAL & PROFESSIONAL */}
      {activeTab === 'personal' ? (
        <form id="profile-form" onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
          <ProfileSection
            title="Personal Information"
            description="Your contact details and basic personal information."
            icon={UserRound}
          >
            <ProfileField label="Phone number" error={errors.phone?.message}>
              <div className="relative">
                <Phone
                  size={16}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="tel"
                  placeholder="+91 98765 43210"
                  className={`${profileInputClass} pl-9`}
                  {...register('phone')}
                />
              </div>
            </ProfileField>

            <ProfileField label="Date of birth" error={errors.dateOfBirth?.message}>
              <div className="relative">
                <Calendar
                  size={16}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="date"
                  className={`${profileInputClass} pl-9`}
                  {...register('dateOfBirth')}
                />
              </div>
            </ProfileField>

            <ProfileField label="Gender" error={errors.gender?.message}>
              <div className="relative">
                <Users
                  size={16}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <select
                  className={`${profileInputClass} pl-9 appearance-none`}
                  {...register('gender')}
                >
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                  <option value="prefer_not_to_say">Prefer not to say</option>
                </select>
              </div>
            </ProfileField>
          </ProfileSection>

          <ProfileSection
            title="Professional Summary & Career Preferences"
            description="Your headline, experience, compensation expectations, and work preferences."
            icon={Briefcase}
          >
            <ProfileField
              label="Professional Headline *"
              error={errors.headline?.message}
              className="sm:col-span-2"
            >
              <input
                type="text"
                placeholder="e.g. Full-Stack Engineer | React, Node.js & PostgreSQL"
                className={profileInputClass}
                {...register('headline')}
              />
            </ProfileField>

            <ProfileField label="Employment Status" error={errors.employmentStatus?.message}>
              <select className={profileInputClass} {...register('employmentStatus')}>
                <option value="">Select status</option>
                {EMPLOYMENT_STATUS_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </ProfileField>

            <ProfileField label="Current Job Title" error={errors.currentJobTitle?.message}>
              <input
                type="text"
                placeholder="e.g. Senior Software Engineer"
                className={profileInputClass}
                {...register('currentJobTitle')}
              />
            </ProfileField>

            <ProfileField label="Current Company" error={errors.currentCompany?.message}>
              <div className="relative">
                <Building2
                  size={16}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  placeholder="e.g. Acme Technologies"
                  className={`${profileInputClass} pl-9`}
                  {...register('currentCompany')}
                />
              </div>
            </ProfileField>

            <ProfileField label="Total Experience (Years)" error={errors.yearsOfExperience?.message}>
              <input
                type="number"
                min="0"
                max="60"
                step="0.5"
                placeholder="e.g. 4.5"
                className={profileInputClass}
                {...register('yearsOfExperience')}
              />
            </ProfileField>

            <ProfileField label="Relevant Experience (Years)" error={errors.relevantExperience?.message}>
              <input
                type="number"
                min="0"
                max="60"
                step="0.5"
                placeholder="e.g. 3.5"
                className={profileInputClass}
                {...register('relevantExperience')}
              />
            </ProfileField>

            <ProfileField label="Notice Period" error={errors.noticePeriod?.message}>
              <select className={profileInputClass} {...register('noticePeriod')}>
                <option value="">Select notice period</option>
                {NOTICE_PERIOD_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </ProfileField>

            <ProfileField label="Salary Currency" error={errors.salaryCurrency?.message}>
              <select className={profileInputClass} {...register('salaryCurrency')}>
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </ProfileField>

            <ProfileField label="Expected Annual Salary" error={errors.expectedSalary?.message}>
              <input
                type="number"
                min="0"
                placeholder="e.g. 1800000"
                className={profileInputClass}
                {...register('expectedSalary')}
              />
            </ProfileField>

            <ProfileField
              label="Current Annual Salary (Private)"
              error={errors.currentSalary?.message}
            >
              <input
                type="number"
                min="0"
                placeholder="e.g. 1400000"
                className={profileInputClass}
                {...register('currentSalary')}
              />
            </ProfileField>

            <ProfileField
              label="Preferred Employment Type"
              error={errors.preferredEmploymentType?.message}
            >
              <select className={profileInputClass} {...register('preferredEmploymentType')}>
                <option value="">Any</option>
                {PREFERRED_EMPLOYMENT_TYPES.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </ProfileField>

            <ProfileField label="Preferred Work Mode" error={errors.preferredWorkMode?.message}>
              <select className={profileInputClass} {...register('preferredWorkMode')}>
                <option value="">Any</option>
                {PREFERRED_WORK_MODES.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </ProfileField>

            <ProfileField
              label="Preferred Job Locations (comma-separated)"
              error={errors.preferredLocationsText?.message}
              className="sm:col-span-2"
            >
              <input
                type="text"
                placeholder="e.g. Bengaluru, Hyderabad, Pune, Remote"
                className={profileInputClass}
                {...register('preferredLocationsText')}
              />
            </ProfileField>

            <ProfileField
              label="Career Summary / Objective"
              error={errors.careerSummary?.message}
              className="sm:col-span-2"
            >
              <textarea
                rows={4}
                placeholder="Summarize your core strengths, domain expertise, and career goals..."
                className={`${profileInputClass} resize-none`}
                {...register('careerSummary')}
              />
            </ProfileField>
          </ProfileSection>

          <ProfileSection
            title="Address & Location"
            description="Your current residential location."
            icon={MapPin}
          >
            <ProfileField label="City *" error={errors.city?.message}>
              <input
                type="text"
                placeholder="e.g. Bengaluru"
                className={profileInputClass}
                {...register('city')}
              />
            </ProfileField>

            <ProfileField label="State / Province *" error={errors.state?.message}>
              <input
                type="text"
                placeholder="e.g. Karnataka"
                className={profileInputClass}
                {...register('state')}
              />
            </ProfileField>

            <ProfileField label="Country *" error={errors.country?.message}>
              <input
                type="text"
                placeholder="e.g. India"
                className={profileInputClass}
                {...register('country')}
              />
            </ProfileField>

            <ProfileField label="Pincode / Postal Code" error={errors.pincode?.message}>
              <input
                type="text"
                placeholder="e.g. 560001"
                className={profileInputClass}
                {...register('pincode')}
              />
            </ProfileField>

            <ProfileField
              label="Street Address"
              error={errors.address?.message}
              className="sm:col-span-2"
            >
              <input
                type="text"
                placeholder="Complete address"
                className={profileInputClass}
                {...register('address')}
              />
            </ProfileField>
          </ProfileSection>

          <ProfileSection
            title="Professional Links"
            description="Social and portfolio links."
            icon={Link2}
          >
            <ProfileField label="LinkedIn URL" error={errors.linkedinUrl?.message}>
              <input
                type="url"
                placeholder="https://linkedin.com/in/yourname"
                className={profileInputClass}
                {...register('linkedinUrl')}
              />
            </ProfileField>

            <ProfileField label="GitHub URL" error={errors.githubUrl?.message}>
              <input
                type="url"
                placeholder="https://github.com/yourname"
                className={profileInputClass}
                {...register('githubUrl')}
              />
            </ProfileField>

            <ProfileField label="Portfolio / Personal Website" error={errors.portfolioUrl?.message}>
              <input
                type="url"
                placeholder="https://yourportfolio.dev"
                className={profileInputClass}
                {...register('portfolioUrl')}
              />
            </ProfileField>
          </ProfileSection>

          <div className="flex justify-end">
            <Button type="submit" disabled={mutation.isPending || !isDirty} className="gap-2">
              <Save size={16} />
              {mutation.isPending ? 'Saving…' : 'Save Personal & Professional Info'}
            </Button>
          </div>
        </form>
      ) : null}

      {/* TAB 2: RESUMES */}
      {activeTab === 'resumes' ? (
        <div className="space-y-6">
          <CandidateProfileSection
            title="Upload or Replace Resume"
            description="Upload PDF, DOC, or DOCX resumes. Plain text is automatically extracted on the server for recruiter review and future matching."
            icon={FileText}
            badge={`${resumes.length} Stored`}
          >
            <ResumeUploader
              replaceTarget={replacingResume}
              onCancelReplace={() => setReplacingResume(null)}
              isUploading={uploadResumeMutation.isPending}
              onUpload={async ({ file, label, isPrimary, replaceResumeId }) => {
                await uploadResumeMutation.mutateAsync({
                  file,
                  label,
                  isPrimary,
                  replaceResumeId,
                })
              }}
            />
          </CandidateProfileSection>

          <CandidateProfileSection
            title="My Uploaded Resumes"
            description="Set your primary resume for 1-click job applications or upload new versions."
            icon={FileText}
          >
            <ResumeList
              resumes={resumes}
              isMutating={
                setPrimaryResumeMutation.isPending ||
                deleteResumeMutation.isPending ||
                uploadResumeMutation.isPending
              }
              onSetPrimary={(id) => setPrimaryResumeMutation.mutate(id)}
              onDelete={(id) => deleteResumeMutation.mutate(id)}
              onReplace={(resume) => setReplacingResume(resume)}
              onDownload={handleDownloadResume}
            />
          </CandidateProfileSection>
        </div>
      ) : null}

      {/* TAB 3: SKILLS */}
      {activeTab === 'skills' ? (
        <CandidateProfileSection
          title="Skills & Competencies"
          description="Add your technical, domain, and soft skills with proficiency and years of experience."
          icon={Sparkles}
          badge={`${skills.length} Skills`}
        >
          <div className="space-y-5">
            <SkillsInput
              suggestions={skillSuggestions}
              existingSkills={skills}
              editingSkill={editingSkill}
              onCancelEdit={() => setEditingSkill(null)}
              isSubmitting={skillMutation.isPending}
              onSubmit={async (payload) => {
                await skillMutation.mutateAsync({
                  id: editingSkill?.id || null,
                  payload,
                })
              }}
            />

            {skills.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">
                No skills added yet. Use the form or quick suggestions above to add your key skills.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                {skills.map((skill) => (
                  <SkillCard
                    key={skill.id}
                    skill={skill}
                    onEdit={(s) => setEditingSkill(s)}
                    onDelete={(id) => deleteSkillMutation.mutate(id)}
                    isMutating={deleteSkillMutation.isPending}
                  />
                ))}
              </div>
            )}
          </div>
        </CandidateProfileSection>
      ) : null}

      {/* TAB 4: EDUCATION */}
      {activeTab === 'education' ? (
        <CandidateProfileSection
          title="Education History"
          description="Degrees, diplomas, and academic qualifications."
          icon={GraduationCap}
          badge={`${educations.length} Entries`}
          action={
            !showEducationForm && !editingEducation ? (
              <Button
                type="button"
                onClick={() => setShowEducationForm(true)}
                className="gap-1.5"
              >
                <Plus className="h-4 w-4" />
                Add Education
              </Button>
            ) : null
          }
        >
          <div className="space-y-4">
            {showEducationForm || editingEducation ? (
              <EducationForm
                initialData={editingEducation}
                isSubmitting={educationMutation.isPending}
                onCancel={() => {
                  setShowEducationForm(false)
                  setEditingEducation(null)
                }}
                onSubmit={async (payload) => {
                  await educationMutation.mutateAsync({
                    id: editingEducation?.id || null,
                    payload,
                  })
                }}
              />
            ) : null}

            {educations.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">
                No education records added yet.
              </p>
            ) : (
              <div className="space-y-3">
                {educations.map((edu) => (
                  <EducationCard
                    key={edu.id}
                    education={edu}
                    onEdit={(item) => {
                      setEditingEducation(item)
                      setShowEducationForm(false)
                    }}
                    onDelete={(id) => deleteEducationMutation.mutate(id)}
                    isMutating={deleteEducationMutation.isPending}
                  />
                ))}
              </div>
            )}
          </div>
        </CandidateProfileSection>
      ) : null}

      {/* TAB 5: WORK EXPERIENCE */}
      {activeTab === 'experience' ? (
        <CandidateProfileSection
          title="Work Experience"
          description="Your employment timeline. Total experience is automatically synchronized from non-overlapping work periods."
          icon={Briefcase}
          badge={
            profile.yearsOfExperience != null
              ? `${profile.yearsOfExperience} yrs total`
              : `${experiences.length} Roles`
          }
          action={
            !showExperienceForm && !editingExperience ? (
              <Button
                type="button"
                onClick={() => setShowExperienceForm(true)}
                className="gap-1.5"
              >
                <Plus className="h-4 w-4" />
                Add Work Experience
              </Button>
            ) : null
          }
        >
          <div className="space-y-4">
            {showExperienceForm || editingExperience ? (
              <ExperienceForm
                initialData={editingExperience}
                isSubmitting={experienceMutation.isPending}
                onCancel={() => {
                  setShowExperienceForm(false)
                  setEditingExperience(null)
                }}
                onSubmit={async (payload) => {
                  await experienceMutation.mutateAsync({
                    id: editingExperience?.id || null,
                    payload,
                  })
                }}
              />
            ) : null}

            {experiences.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">
                No work experience added yet. Freshers can highlight academic projects and internships.
              </p>
            ) : (
              <div className="space-y-3">
                {experiences.map((exp) => (
                  <ExperienceCard
                    key={exp.id}
                    experience={exp}
                    onEdit={(item) => {
                      setEditingExperience(item)
                      setShowExperienceForm(false)
                    }}
                    onDelete={(id) => deleteExperienceMutation.mutate(id)}
                    isMutating={deleteExperienceMutation.isPending}
                  />
                ))}
              </div>
            )}
          </div>
        </CandidateProfileSection>
      ) : null}

      {/* TAB 6: PROJECTS, CERTIFICATIONS, ACHIEVEMENTS & LANGUAGES */}
      {activeTab === 'portfolio' ? (
        <div className="space-y-6">
          {/* Projects */}
          <CandidateProfileSection
            title="Projects"
            description="Key academic, open-source, or professional projects."
            icon={FolderGit2}
            badge={`${projects.length}`}
            action={
              !showProjectForm && !editingProject ? (
                <Button type="button" onClick={() => setShowProjectForm(true)} className="gap-1.5">
                  <Plus className="h-4 w-4" />
                  Add Project
                </Button>
              ) : null
            }
          >
            <div className="space-y-4">
              {showProjectForm || editingProject ? (
                <ProjectForm
                  initialData={editingProject}
                  isSubmitting={projectMutation.isPending}
                  onCancel={() => {
                    setShowProjectForm(false)
                    setEditingProject(null)
                  }}
                  onSubmit={async (payload) => {
                    await projectMutation.mutateAsync({
                      id: editingProject?.id || null,
                      payload,
                    })
                  }}
                />
              ) : null}

              {projects.length === 0 ? (
                <p className="text-sm text-slate-500">No projects added yet.</p>
              ) : (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {projects.map((proj) => (
                    <div
                      key={proj.id}
                      className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="font-semibold text-sm text-slate-900">{proj.title}</h4>
                            {proj.role ? (
                              <p className="text-xs font-medium text-indigo-600">{proj.role}</p>
                            ) : null}
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setEditingProject(proj)}
                              className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteProjectMutation.mutate(proj.id)}
                              className="rounded-lg p-1 text-rose-500 hover:bg-rose-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                        {proj.description ? (
                          <p className="mt-2 text-xs text-slate-600">{proj.description}</p>
                        ) : null}
                        {Array.isArray(proj.technologiesUsed) && proj.technologiesUsed.length > 0 ? (
                          <div className="mt-2.5 flex flex-wrap gap-1.5">
                            {proj.technologiesUsed.map((tech) => (
                              <span
                                key={tech}
                                className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700"
                              >
                                {tech}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>
                      <div className="mt-3 flex items-center gap-3 text-xs">
                        {proj.projectUrl ? (
                          <a
                            href={proj.projectUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 font-medium text-indigo-600 hover:underline"
                          >
                            Live Demo <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : null}
                        {proj.repositoryUrl ? (
                          <a
                            href={proj.repositoryUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 font-medium text-slate-600 hover:underline"
                          >
                            Repository <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CandidateProfileSection>

          {/* Certifications */}
          <CandidateProfileSection
            title="Certifications"
            description="Professional licenses and industry certifications."
            icon={Award}
            badge={`${certifications.length}`}
            action={
              !showCertForm && !editingCert ? (
                <Button type="button" onClick={() => setShowCertForm(true)} className="gap-1.5">
                  <Plus className="h-4 w-4" />
                  Add Certification
                </Button>
              ) : null
            }
          >
            <div className="space-y-4">
              {showCertForm || editingCert ? (
                <CertificationForm
                  initialData={editingCert}
                  isSubmitting={certMutation.isPending}
                  onCancel={() => {
                    setShowCertForm(false)
                    setEditingCert(null)
                  }}
                  onSubmit={async (payload) => {
                    await certMutation.mutateAsync({
                      id: editingCert?.id || null,
                      payload,
                    })
                  }}
                />
              ) : null}

              {certifications.length === 0 ? (
                <p className="text-sm text-slate-500">No certifications added yet.</p>
              ) : (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {certifications.map((cert) => (
                    <div
                      key={cert.id}
                      className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4"
                    >
                      <div>
                        <h4 className="font-semibold text-sm text-slate-900">{cert.name}</h4>
                        <p className="text-xs font-medium text-slate-600">
                          {cert.issuingOrganization}
                        </p>
                        {cert.credentialId ? (
                          <p className="mt-1 text-xs text-slate-500">ID: {cert.credentialId}</p>
                        ) : null}
                        {cert.credentialUrl ? (
                          <a
                            href={cert.credentialUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:underline"
                          >
                            Verify Credential <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setEditingCert(cert)}
                          className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteCertMutation.mutate(cert.id)}
                          className="rounded-lg p-1 text-rose-500 hover:bg-rose-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CandidateProfileSection>

          {/* Achievements */}
          <CandidateProfileSection
            title="Achievements & Awards"
            description="Hackathons, honors, scholarships, and publications."
            icon={Trophy}
            badge={`${achievements.length}`}
            action={
              !showAchievementForm && !editingAchievement ? (
                <Button
                  type="button"
                  onClick={() => setShowAchievementForm(true)}
                  className="gap-1.5"
                >
                  <Plus className="h-4 w-4" />
                  Add Achievement
                </Button>
              ) : null
            }
          >
            <div className="space-y-4">
              {showAchievementForm || editingAchievement ? (
                <AchievementForm
                  initialData={editingAchievement}
                  isSubmitting={achievementMutation.isPending}
                  onCancel={() => {
                    setShowAchievementForm(false)
                    setEditingAchievement(null)
                  }}
                  onSubmit={async (payload) => {
                    await achievementMutation.mutateAsync({
                      id: editingAchievement?.id || null,
                      payload,
                    })
                  }}
                />
              ) : null}

              {achievements.length === 0 ? (
                <p className="text-sm text-slate-500">No achievements added yet.</p>
              ) : (
                <div className="space-y-2.5">
                  {achievements.map((ach) => (
                    <div
                      key={ach.id}
                      className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3.5"
                    >
                      <div>
                        <h4 className="font-semibold text-sm text-slate-900">{ach.title}</h4>
                        {ach.issuer ? (
                          <p className="text-xs text-slate-600">{ach.issuer}</p>
                        ) : null}
                        {ach.description ? (
                          <p className="mt-1 text-xs text-slate-500">{ach.description}</p>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setEditingAchievement(ach)}
                          className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteAchievementMutation.mutate(ach.id)}
                          className="rounded-lg p-1 text-rose-500 hover:bg-rose-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CandidateProfileSection>

          {/* Languages */}
          <CandidateProfileSection
            title="Languages Known"
            description="Spoken and written languages with proficiency."
            icon={LanguagesIcon}
            badge={`${languages.length}`}
            action={
              !showLanguageForm && !editingLanguage ? (
                <Button
                  type="button"
                  onClick={() => setShowLanguageForm(true)}
                  className="gap-1.5"
                >
                  <Plus className="h-4 w-4" />
                  Add Language
                </Button>
              ) : null
            }
          >
            <div className="space-y-4">
              {showLanguageForm || editingLanguage ? (
                <LanguageForm
                  initialData={editingLanguage}
                  isSubmitting={languageMutation.isPending}
                  onCancel={() => {
                    setShowLanguageForm(false)
                    setEditingLanguage(null)
                  }}
                  onSubmit={async (payload) => {
                    await languageMutation.mutateAsync({
                      id: editingLanguage?.id || null,
                      payload,
                    })
                  }}
                />
              ) : null}

              {languages.length === 0 ? (
                <p className="text-sm text-slate-500">No languages added yet.</p>
              ) : (
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                  {languages.map((lang) => (
                    <div
                      key={lang.id}
                      className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3.5 py-2.5"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-slate-900">
                            {lang.language}
                          </span>
                          <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700">
                            {lang.proficiency}
                          </span>
                        </div>
                        <p className="mt-0.5 text-[11px] text-slate-500">
                          {[
                            lang.canRead ? 'Read' : null,
                            lang.canWrite ? 'Write' : null,
                            lang.canSpeak ? 'Speak' : null,
                          ]
                            .filter(Boolean)
                            .join(' • ')}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setEditingLanguage(lang)}
                          className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteLanguageMutation.mutate(lang.id)}
                          className="rounded-lg p-1 text-rose-500 hover:bg-rose-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CandidateProfileSection>
        </div>
      ) : null}
    </div>
  )
}
