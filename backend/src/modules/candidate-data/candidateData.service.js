const ApiError = require('../../utils/ApiError');
const repo = require('./candidateData.repository');
const resumeStorage = require('../../services/resumeStorage.service');

function toNumberOrNull(val) {
  if (val === null || val === undefined) return null;
  const n = Number(val);
  return Number.isFinite(n) ? n : null;
}

// ── Backend Total Experience Calculation (Merges Overlapping Periods) ────
function calculateMergedExperienceYears(experiences = []) {
  if (!Array.isArray(experiences) || experiences.length === 0) {
    return 0;
  }

  const nowMs = Date.now();
  const intervals = [];

  for (const exp of experiences) {
    if (!exp.startDate) continue;
    const startMs = new Date(exp.startDate).getTime();
    const endMs =
      exp.currentlyWorking || !exp.endDate
        ? nowMs
        : new Date(exp.endDate).getTime();

    if (Number.isFinite(startMs) && Number.isFinite(endMs) && endMs >= startMs) {
      intervals.push([startMs, endMs]);
    }
  }

  if (intervals.length === 0) return 0;

  intervals.sort((a, b) => a[0] - b[0]);

  const merged = [intervals[0]];
  for (let i = 1; i < intervals.length; i += 1) {
    const [curStart, curEnd] = intervals[i];
    const last = merged[merged.length - 1];
    if (curStart <= last[1]) {
      last[1] = Math.max(last[1], curEnd);
    } else {
      merged.push([curStart, curEnd]);
    }
  }

  let totalMs = 0;
  for (const [s, e] of merged) {
    totalMs += e - s;
  }

  const totalYears = totalMs / (1000 * 60 * 60 * 24 * 365.25);
  return Math.round(totalYears * 10) / 10;
}

// ── Profile Completion Calculation (Phase 10) ────────────────────────────
function calculateProfileCompletion({
  user,
  profile,
  resumes = [],
  skills = [],
  education = [],
  experience = [],
  projects = [],
  certifications = [],
}) {
  const hasPersonal = Boolean(
    (user?.fullName || '').trim() &&
      (profile?.phone || '').trim() &&
      ((profile?.city || '').trim() || (profile?.location || '').trim()) &&
      (profile?.country || '').trim()
  );

  const hasSummary = Boolean(
    (profile?.headline || '').trim() &&
      ((profile?.careerSummary || '').trim() || (profile?.bio || '').trim())
  );

  const activeResumes = resumes.filter((r) => !r.isDeleted);
  const hasPrimaryResume = Boolean(
    activeResumes.some((r) => r.isPrimary) ||
      activeResumes.length > 0 ||
      profile?.resumeKey
  );

  const skillCount = Math.max(skills.length, (profile?.skills || []).length);
  const hasSkills = skillCount >= 1;

  const hasEducation = education.length >= 1;
  const hasExperience =
    experience.length >= 1 ||
    (profile?.employmentStatus || '').toLowerCase() === 'fresher';
  const hasProjects = projects.length >= 1;
  const hasCertifications = certifications.length >= 1;

  const sections = [
    {
      key: 'personal',
      label: 'Personal Information',
      weight: 20,
      completed: hasPersonal,
      targetTab: 'personal',
      hint: 'Add your phone number, city, and country.',
    },
    {
      key: 'summary',
      label: 'Professional Summary',
      weight: 15,
      completed: hasSummary,
      targetTab: 'professional',
      hint: 'Write a headline and career summary.',
    },
    {
      key: 'resume',
      label: 'Primary Resume',
      weight: 20,
      completed: hasPrimaryResume,
      targetTab: 'resumes',
      hint: 'Upload your resume (PDF, DOC, or DOCX) and set a primary resume.',
    },
    {
      key: 'skills',
      label: 'Skills',
      weight: 15,
      completed: hasSkills,
      targetTab: 'skills',
      hint: 'Add your technical and non-technical skills.',
    },
    {
      key: 'education',
      label: 'Education',
      weight: 10,
      completed: hasEducation,
      targetTab: 'education',
      hint: 'Add at least one educational qualification.',
    },
    {
      key: 'experience',
      label: 'Work Experience',
      weight: 10,
      completed: hasExperience,
      targetTab: 'experience',
      hint: 'Add your employment history (or mark status as Fresher).',
    },
    {
      key: 'projects',
      label: 'Projects (Optional)',
      weight: 5,
      completed: hasProjects,
      optional: true,
      targetTab: 'projects',
      hint: 'Showcase notable projects and links.',
    },
    {
      key: 'certifications',
      label: 'Certifications (Optional)',
      weight: 5,
      completed: hasCertifications,
      optional: true,
      targetTab: 'certifications',
      hint: 'Add professional certifications and credentials.',
    },
  ];

  const percentage = sections.reduce(
    (sum, sec) => sum + (sec.completed ? sec.weight : 0),
    0
  );

  const completedSections = sections.filter((s) => s.completed);
  const missingSections = sections.filter((s) => !s.completed);

  return {
    percentage,
    completedCount: completedSections.length,
    totalSections: sections.length,
    sections,
    missingSections,
  };
}

function formatResume(resume) {
  if (!resume) return null;
  return {
    id: resume.id,
    resumeId: resume.id,
    candidateId: resume.userId,
    title: resume.title || resume.originalFileName,
    originalFileName: resume.originalFileName,
    fileType: resume.fileType,
    mimeType: resume.mimeType,
    fileSize: resume.fileSize,
    version: resume.version,
    rootResumeId: resume.rootResumeId,
    previousVersionId: resume.previousVersionId,
    isLatestVersion: resume.isLatestVersion,
    isPrimary: resume.isPrimary,
    isDeleted: resume.isDeleted,
    resumeStatus: resume.resumeStatus,
    hasExtractedText: Boolean(resume.extractedTextReference),
    extractedCharCount: resume.extractedCharCount || 0,
    applicationsCount: resume._count?.applications || 0,
    uploadedAt: resume.uploadedAt,
    createdAt: resume.createdAt,
    updatedAt: resume.updatedAt,
  };
}

function formatSkill(skill) {
  if (!skill) return null;
  return {
    ...skill,
    experienceYears: toNumberOrNull(skill.experienceYears),
  };
}

function formatCandidateBundle(bundle, { includePrivateSalary = true } = {}) {
  const {
    user,
    profile,
    resumes = [],
    skills = [],
    education = [],
    experience = [],
    projects = [],
    certifications = [],
    achievements = [],
    languages = [],
  } = bundle;

  const calculatedExperienceYears = calculateMergedExperienceYears(experience);
  const manualExperienceYears = toNumberOrNull(profile?.yearsOfExperience);
  const effectiveExperienceYears =
    experience.length > 0
      ? calculatedExperienceYears
      : manualExperienceYears ?? 0;

  const formattedResumes = resumes
    .filter((r) => r.isLatestVersion && !r.isDeleted)
    .map(formatResume);

  const primaryResume =
    formattedResumes.find((r) => r.isPrimary) || formattedResumes[0] || null;

  const completion = calculateProfileCompletion(bundle);

  const safeProfile = profile
    ? {
        id: profile.id,
        userId: profile.userId,
        profileImageUrl: profile.profileImageUrl,
        phone: profile.phone,
        dateOfBirth: profile.dateOfBirth,
        gender: profile.gender,
        headline: profile.headline,
        bio: profile.bio,
        careerSummary: profile.careerSummary || profile.bio || null,
        location: profile.location,
        city: profile.city,
        state: profile.state,
        country: profile.country,
        pincode: profile.pincode,
        address: profile.address,
        currentJobTitle: profile.currentJobTitle,
        currentCompany: profile.currentCompany,
        employmentStatus: profile.employmentStatus,
        yearsOfExperience: manualExperienceYears ?? calculatedExperienceYears,
        calculatedExperienceYears,
        effectiveExperienceYears,
        relevantExperience: toNumberOrNull(profile.relevantExperience),
        expectedSalary: toNumberOrNull(profile.expectedSalary),
        currentSalary: includePrivateSalary
          ? toNumberOrNull(profile.currentSalary)
          : undefined,
        salaryCurrency: profile.salaryCurrency || 'INR',
        noticePeriod: profile.noticePeriod,
        preferredLocations: profile.preferredLocations || [],
        preferredEmploymentType: profile.preferredEmploymentType,
        preferredWorkMode: profile.preferredWorkMode,
        skills:
          skills.length > 0
            ? skills.map((s) => s.name)
            : profile.skills || [],
        hasResume: Boolean(primaryResume || profile.resumeKey),
        resumeFileName:
          primaryResume?.originalFileName || profile.resumeFileName || null,
        resumeMimeType:
          primaryResume?.mimeType || profile.resumeMimeType || null,
        resumeFileSize:
          primaryResume?.fileSize || profile.resumeFileSize || null,
        resumeUpdatedAt:
          primaryResume?.uploadedAt || profile.resumeUpdatedAt || null,
        linkedinUrl: profile.linkedinUrl,
        githubUrl: profile.githubUrl,
        portfolioUrl: profile.portfolioUrl,
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt,
      }
    : {
        userId: user?.id,
        yearsOfExperience: calculatedExperienceYears,
        calculatedExperienceYears,
        effectiveExperienceYears,
        preferredLocations: [],
        skills: skills.map((s) => s.name),
        hasResume: Boolean(primaryResume),
        salaryCurrency: 'INR',
      };

  return {
    user,
    profile: {
      ...safeProfile,
      user,
    },
    primaryResume,
    resumes: formattedResumes,
    skills: skills.map(formatSkill),
    education,
    experience,
    projects,
    certifications,
    achievements,
    languages,
    completion,
    summaryStats: {
      resumesCount: formattedResumes.length,
      skillsCount: skills.length,
      educationCount: education.length,
      experienceCount: experience.length,
      projectsCount: projects.length,
      certificationsCount: certifications.length,
      achievementsCount: achievements.length,
      languagesCount: languages.length,
      calculatedExperienceYears,
    },
  };
}

// ── Candidate Profile & Completion ───────────────────────────────────────

exports.getFullCandidateProfile = async (userId) => {
  const bundle = await repo.findFullCandidateData(userId);
  return formatCandidateBundle(bundle, { includePrivateSalary: true });
};

exports.updateCandidateProfile = async (userId, payload) => {
  await repo.upsertProfileWithUser(userId, payload);
  return exports.getFullCandidateProfile(userId);
};

exports.getProfileCompletion = async (userId) => {
  const bundle = await repo.findFullCandidateData(userId);
  return calculateProfileCompletion(bundle);
};

// ── Resume Management (Phase 2 & Phase 8) ────────────────────────────────

exports.listMyResumes = async (userId) => {
  const resumes = await repo.findResumesByUser(userId);
  const latestResumes = resumes
    .filter((r) => r.isLatestVersion && !r.isDeleted)
    .map(formatResume);
  const allVersions = resumes.map(formatResume);

  return {
    resumes: latestResumes,
    allVersions,
    primaryResume: latestResumes.find((r) => r.isPrimary) || null,
  };
};

exports.uploadResume = async (userId, payload) => {
  const stored = await resumeStorage.saveResumeFile({
    userId,
    fileName: payload.fileName,
    mimeType: payload.mimeType,
    contentBase64: payload.contentBase64,
  });

  const created = await repo.createResumeInTransaction({
    userId,
    makePrimary: payload.isPrimary,
    resumeData: {
      title: payload.title || stored.originalFileName,
      originalFileName: stored.originalFileName,
      storedFileName: stored.storedFileName,
      storageKey: stored.storageKey,
      fileType: stored.fileType,
      mimeType: stored.mimeType,
      fileSize: stored.fileSize,
      version: 1,
      resumeStatus: stored.resumeStatus,
      extractedTextReference: stored.extractedTextReference,
      extractedCharCount: stored.extractedCharCount,
    },
  });

  return formatResume(created);
};

exports.getResumeDetails = async (userId, resumeId) => {
  const resume = await repo.findResumeById(resumeId);
  if (!resume || resume.userId !== userId || resume.isDeleted) {
    throw new ApiError(404, 'Resume not found', 'RESUME_NOT_FOUND');
  }

  const rootId = resume.rootResumeId || resume.id;
  const versionChain = await repo.findResumeVersionChain(rootId, userId);
  const extractedTextPreview = resume.extractedTextReference
    ? await resumeStorage.readExtractedText(resume.extractedTextReference)
    : null;

  return {
    resume: formatResume(resume),
    versionHistory: versionChain.map(formatResume),
    extractedTextPreview: extractedTextPreview
      ? extractedTextPreview.slice(0, 1500)
      : null,
  };
};

exports.setPrimaryResume = async (userId, resumeId) => {
  const resume = await repo.findResumeById(resumeId);
  if (!resume || resume.userId !== userId || resume.isDeleted) {
    throw new ApiError(404, 'Resume not found', 'RESUME_NOT_FOUND');
  }

  const updated = await repo.setPrimaryResumeInTransaction({
    userId,
    resume,
  });

  return formatResume(updated);
};

exports.replaceResume = async (userId, resumeId, payload) => {
  const oldResume = await repo.findResumeById(resumeId);
  if (!oldResume || oldResume.userId !== userId || oldResume.isDeleted) {
    throw new ApiError(404, 'Resume not found', 'RESUME_NOT_FOUND');
  }

  const stored = await resumeStorage.saveResumeFile({
    userId,
    fileName: payload.fileName,
    mimeType: payload.mimeType,
    contentBase64: payload.contentBase64,
  });

  const newVersion = await repo.replaceResumeInTransaction({
    userId,
    oldResume,
    makePrimary: payload.makePrimary,
    newResumeData: {
      title: payload.title || oldResume.title || stored.originalFileName,
      originalFileName: stored.originalFileName,
      storedFileName: stored.storedFileName,
      storageKey: stored.storageKey,
      fileType: stored.fileType,
      mimeType: stored.mimeType,
      fileSize: stored.fileSize,
      resumeStatus: stored.resumeStatus,
      extractedTextReference: stored.extractedTextReference,
      extractedCharCount: stored.extractedCharCount,
    },
  });

  const rootId = newVersion.rootResumeId || oldResume.id;
  const versionChain = await repo.findResumeVersionChain(rootId, userId);

  return {
    resume: formatResume(newVersion),
    versionHistory: versionChain.map(formatResume),
  };
};

exports.deleteResume = async (userId, resumeId) => {
  const resume = await repo.findResumeById(resumeId);
  if (!resume || resume.userId !== userId || resume.isDeleted) {
    throw new ApiError(404, 'Resume not found', 'RESUME_NOT_FOUND');
  }

  await repo.softDeleteResumeInTransaction({ userId, resume });

  // Only remove physical file if no job applications and no version chains reference it
  const hasAppRefs = (resume._count?.applications || 0) > 0;
  const hasVersionRefs =
    Boolean(resume.previousVersionId) || (resume._count?.nextVersions || 0) > 0;

  if (!hasAppRefs && !hasVersionRefs) {
    await resumeStorage.deleteResumeFileIfExists(
      resume.storageKey,
      resume.extractedTextReference
    );
  }
};

exports.getCandidateResumeDownloadStream = async (userId, resumeId) => {
  const resume = await repo.findResumeById(resumeId);
  if (!resume || resume.userId !== userId || resume.isDeleted) {
    throw new ApiError(404, 'Resume not found or access denied', 'RESUME_NOT_FOUND');
  }

  const fileData = await resumeStorage.readResumeFile(resume.storageKey);
  return {
    buffer: fileData.buffer,
    mimeType: resume.mimeType || fileData.mimeType,
    fileName: resume.originalFileName || 'resume.pdf',
  };
};

// ── Skills Management (Phase 4) ──────────────────────────────────────────

exports.listSkills = async (userId, { suggestions } = {}) => {
  const skills = await repo.findSkillsByUser(userId);
  let suggestedSkills = [];
  if (suggestions !== undefined) {
    suggestedSkills = await repo.findSkillSuggestions(suggestions);
  }
  return {
    skills: skills.map(formatSkill),
    suggestions: suggestedSkills,
  };
};

exports.addSkills = async (userId, payload) => {
  const items = Array.isArray(payload.skills) ? payload.skills : [payload];

  // Check for duplicate in single-add mode so the user gets clear feedback
  if (!Array.isArray(payload.skills) && items.length === 1) {
    const existing = await repo.findSkillsByUser(userId);
    const norm = items[0].name.trim().toLowerCase();
    if (existing.some((s) => s.normalizedName === norm)) {
      throw new ApiError(
        409,
        `Skill "${items[0].name.trim()}" is already in your profile`,
        'DUPLICATE_SKILL'
      );
    }
  }

  await repo.upsertSkillsBatch(userId, items);
  const allSkills = await repo.findSkillsByUser(userId);
  return allSkills.map(formatSkill);
};

exports.updateSkill = async (userId, skillId, payload) => {
  const existing = await repo.findSkillById(skillId);
  if (!existing || existing.userId !== userId) {
    throw new ApiError(404, 'Skill not found', 'SKILL_NOT_FOUND');
  }

  try {
    const updated = await repo.updateSkillById(userId, skillId, payload);
    return formatSkill(updated);
  } catch (err) {
    if (err.code === 'P2002') {
      throw new ApiError(
        409,
        'Another skill with this name already exists on your profile',
        'DUPLICATE_SKILL'
      );
    }
    throw err;
  }
};

exports.deleteSkill = async (userId, skillId) => {
  const existing = await repo.findSkillById(skillId);
  if (!existing || existing.userId !== userId) {
    throw new ApiError(404, 'Skill not found', 'SKILL_NOT_FOUND');
  }
  await repo.deleteSkillById(userId, skillId);
};

// ── Education Management (Phase 5) ───────────────────────────────────────

exports.listEducation = (userId) => repo.findEducationByUser(userId);

exports.addEducation = (userId, payload) => repo.createEducation(userId, payload);

exports.updateEducation = async (userId, id, payload) => {
  const existing = await repo.findEducationById(id);
  if (!existing || existing.userId !== userId) {
    throw new ApiError(404, 'Education record not found', 'EDUCATION_NOT_FOUND');
  }
  return repo.updateEducation(id, payload);
};

exports.deleteEducation = async (userId, id) => {
  const existing = await repo.findEducationById(id);
  if (!existing || existing.userId !== userId) {
    throw new ApiError(404, 'Education record not found', 'EDUCATION_NOT_FOUND');
  }
  await repo.deleteEducation(id);
};

// ── Work Experience Management (Phase 6) ─────────────────────────────────

exports.listExperience = async (userId) => {
  const experience = await repo.findExperienceByUser(userId);
  const calculatedExperienceYears = calculateMergedExperienceYears(experience);
  return {
    experience,
    calculatedExperienceYears,
  };
};

exports.addExperience = async (userId, payload) => {
  const created = await repo.createExperience(userId, payload);
  const allExp = await repo.findExperienceByUser(userId);
  const calculatedYears = calculateMergedExperienceYears(allExp);
  await repo.upsertProfileWithUser(userId, { yearsOfExperience: calculatedYears });
  return {
    experience: created,
    calculatedExperienceYears: calculatedYears,
  };
};

exports.updateExperience = async (userId, id, payload) => {
  const existing = await repo.findExperienceById(id);
  if (!existing || existing.userId !== userId) {
    throw new ApiError(404, 'Work experience record not found', 'EXPERIENCE_NOT_FOUND');
  }
  const updated = await repo.updateExperience(id, payload);
  const allExp = await repo.findExperienceByUser(userId);
  const calculatedYears = calculateMergedExperienceYears(allExp);
  await repo.upsertProfileWithUser(userId, { yearsOfExperience: calculatedYears });
  return {
    experience: updated,
    calculatedExperienceYears: calculatedYears,
  };
};

exports.deleteExperience = async (userId, id) => {
  const existing = await repo.findExperienceById(id);
  if (!existing || existing.userId !== userId) {
    throw new ApiError(404, 'Work experience record not found', 'EXPERIENCE_NOT_FOUND');
  }
  await repo.deleteExperience(id);
  const allExp = await repo.findExperienceByUser(userId);
  const calculatedYears = calculateMergedExperienceYears(allExp);
  await repo.upsertProfileWithUser(userId, { yearsOfExperience: calculatedYears });
  return { calculatedExperienceYears: calculatedYears };
};

// ── Projects Management (Phase 7) ────────────────────────────────────────

exports.listProjects = (userId) => repo.findProjectsByUser(userId);

exports.addProject = (userId, payload) => repo.createProject(userId, payload);

exports.updateProject = async (userId, id, payload) => {
  const existing = await repo.findProjectById(id);
  if (!existing || existing.userId !== userId) {
    throw new ApiError(404, 'Project not found', 'PROJECT_NOT_FOUND');
  }
  return repo.updateProject(id, payload);
};

exports.deleteProject = async (userId, id) => {
  const existing = await repo.findProjectById(id);
  if (!existing || existing.userId !== userId) {
    throw new ApiError(404, 'Project not found', 'PROJECT_NOT_FOUND');
  }
  await repo.deleteProject(id);
};

// ── Certifications Management (Phase 7) ──────────────────────────────────

exports.listCertifications = (userId) => repo.findCertificationsByUser(userId);

exports.addCertification = (userId, payload) => repo.createCertification(userId, payload);

exports.updateCertification = async (userId, id, payload) => {
  const existing = await repo.findCertificationById(id);
  if (!existing || existing.userId !== userId) {
    throw new ApiError(404, 'Certification not found', 'CERTIFICATION_NOT_FOUND');
  }
  return repo.updateCertification(id, payload);
};

exports.deleteCertification = async (userId, id) => {
  const existing = await repo.findCertificationById(id);
  if (!existing || existing.userId !== userId) {
    throw new ApiError(404, 'Certification not found', 'CERTIFICATION_NOT_FOUND');
  }
  await repo.deleteCertification(id);
};

// ── Achievements Management (Phase 7) ────────────────────────────────────

exports.listAchievements = (userId) => repo.findAchievementsByUser(userId);

exports.addAchievement = (userId, payload) => repo.createAchievement(userId, payload);

exports.updateAchievement = async (userId, id, payload) => {
  const existing = await repo.findAchievementById(id);
  if (!existing || existing.userId !== userId) {
    throw new ApiError(404, 'Achievement not found', 'ACHIEVEMENT_NOT_FOUND');
  }
  return repo.updateAchievement(id, payload);
};

exports.deleteAchievement = async (userId, id) => {
  const existing = await repo.findAchievementById(id);
  if (!existing || existing.userId !== userId) {
    throw new ApiError(404, 'Achievement not found', 'ACHIEVEMENT_NOT_FOUND');
  }
  await repo.deleteAchievement(id);
};

// ── Languages Management (Phase 7) ───────────────────────────────────────

exports.listLanguages = (userId) => repo.findLanguagesByUser(userId);

exports.addLanguage = (userId, payload) => repo.upsertLanguage(userId, payload);

exports.updateLanguage = async (userId, id, payload) => {
  const existing = await repo.findLanguageById(id);
  if (!existing || existing.userId !== userId) {
    throw new ApiError(404, 'Language record not found', 'LANGUAGE_NOT_FOUND');
  }
  return repo.updateLanguage(id, payload);
};

exports.deleteLanguage = async (userId, id) => {
  const existing = await repo.findLanguageById(id);
  if (!existing || existing.userId !== userId) {
    throw new ApiError(404, 'Language record not found', 'LANGUAGE_NOT_FOUND');
  }
  await repo.deleteLanguage(id);
};

exports.calculateMergedExperienceYears = calculateMergedExperienceYears;
exports.calculateProfileCompletion = calculateProfileCompletion;
exports.formatCandidateBundle = formatCandidateBundle;
