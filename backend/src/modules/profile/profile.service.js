const prisma = require('../../config/prisma');
const ApiError = require('../../utils/ApiError');
const repo = require('./profile.repository');
const companiesRepo = require('../companies/companies.repository');
const resumeStorage = require('../../services/resumeStorage.service');

const withTransaction = (fn) => prisma.$transaction(fn);

function sanitizeCandidateProfileResponse(profile) {
  if (!profile) return null;
  const { resumeKey, ...rest } = profile;
  return {
    ...rest,
    hasResume: Boolean(resumeKey),
  };
}

// Candidate
exports.getCandidateProfile = async (userId) => {
  const profile = await repo.findCandidateById(userId);
  if (profile) return sanitizeCandidateProfileResponse(profile);
  const user = await repo.findUserById(userId);
  return { user, hasResume: false, skills: [] };
};

exports.updateCandidateProfile = async (userId, { resumeUpload, ...data }) => {
  const updatePayload = { ...data };

  if (resumeUpload) {
    const stored = await resumeStorage.saveResumeFile({
      userId,
      fileName: resumeUpload.fileName,
      mimeType: resumeUpload.mimeType,
      contentBase64: resumeUpload.contentBase64,
    });
    updatePayload.resumeKey = stored.resumeKey;
    updatePayload.resumeFileName = stored.resumeFileName;
    updatePayload.resumeMimeType = stored.resumeMimeType;
    updatePayload.resumeFileSize = stored.resumeFileSize;
    updatePayload.resumeUpdatedAt = new Date();
  }

  const updated = await repo.upsertCandidate(userId, updatePayload);
  return sanitizeCandidateProfileResponse(updated);
};

exports.uploadCandidateResume = async (userId, resumePayload) => {
  const stored = await resumeStorage.saveResumeFile({
    userId,
    fileName: resumePayload.fileName,
    mimeType: resumePayload.mimeType,
    contentBase64: resumePayload.contentBase64,
  });

  const updated = await repo.upsertCandidate(userId, {
    resumeKey: stored.resumeKey,
    resumeFileName: stored.resumeFileName,
    resumeMimeType: stored.resumeMimeType,
    resumeFileSize: stored.resumeFileSize,
    resumeUpdatedAt: new Date(),
  });

  return sanitizeCandidateProfileResponse(updated);
};

exports.deleteCandidateResume = async (userId) => {
  const profile = await repo.findCandidateById(userId);
  if (profile?.resumeKey) {
    await resumeStorage.deleteResumeFileIfExists(profile.resumeKey);
  }
  const updated = await repo.upsertCandidate(userId, {
    resumeKey: null,
    resumeFileName: null,
    resumeMimeType: null,
    resumeFileSize: null,
    resumeUpdatedAt: null,
  });
  return sanitizeCandidateProfileResponse(updated);
};

exports.getCandidateResumeStream = async (userId) => {
  const profile = await repo.findCandidateById(userId);
  if (!profile || !profile.resumeKey) {
    throw new ApiError(404, 'No resume uploaded on your profile yet', 'RESUME_NOT_FOUND');
  }
  const fileData = await resumeStorage.readResumeFile(profile.resumeKey);
  return {
    buffer: fileData.buffer,
    mimeType: profile.resumeMimeType || fileData.mimeType,
    fileName: profile.resumeFileName || 'resume.pdf',
  };
};

// Recruiter
exports.getRecruiterProfile = async (userId) => {
  const profile = await repo.findRecruiterById(userId);
  if (profile) return profile;
  const user = await repo.findUserById(userId);
  return { user };
};

exports.updateRecruiterProfile = async (userId, { fullName, ...profileData }) => {
  if (profileData.companyId) {
    const company = await repo.findCompanyById(profileData.companyId);
    if (!company) throw new ApiError(404, 'Company not found', 'COMPANY_NOT_FOUND');
  }
  return withTransaction(async (tx) => {
    if (fullName) await repo.updateUserName(userId, fullName, tx);
    if (profileData.companyId) {
      const existingMembership = await companiesRepo.findMembership(profileData.companyId, userId, tx);
      if (!existingMembership || existingMembership.membershipStatus !== 'ACTIVE') {
        const company = await repo.findCompanyById(profileData.companyId, tx);
        const role = company?.ownerId === userId ? 'OWNER' : 'RECRUITER';
        await companiesRepo.upsertMembership(
          {
            companyId: profileData.companyId,
            userId,
            role,
            membershipStatus: 'ACTIVE',
          },
          tx
        );
      }
    }
    return repo.upsertRecruiter(userId, profileData, tx);
  });
};

exports.createCompanyForRecruiter = async (userId, data) =>
  withTransaction(async (tx) => {
    const company = await repo.createCompany({ ...data, ownerId: userId, status: 'DRAFT' }, tx);
    await companiesRepo.upsertMembership(
      {
        companyId: company.id,
        userId,
        role: 'OWNER',
        membershipStatus: 'ACTIVE',
      },
      tx
    );
    await repo.upsertRecruiter(userId, { companyId: company.id }, tx);
    return company;
  });

exports.updateCompany = async (userId, companyId, data) => {
  const company = await repo.findCompanyById(companyId);
  if (!company) throw new ApiError(404, 'Company not found', 'COMPANY_NOT_FOUND');

  const membership = await companiesRepo.findMembership(companyId, userId);
  const isAuthorized =
    company.ownerId === userId ||
    (membership && membership.membershipStatus === 'ACTIVE' && ['OWNER', 'ADMIN'].includes(membership.role));

  const recruiter = await repo.findRecruiterByUserId(userId);
  if (!isAuthorized && (!recruiter || recruiter.companyId !== companyId)) {
    throw new ApiError(403, 'You can only edit a company you own or administer', 'FORBIDDEN');
  }
  return repo.updateCompany(companyId, data);
};

exports.searchCompanies = (q) => repo.searchCompanies(q);
