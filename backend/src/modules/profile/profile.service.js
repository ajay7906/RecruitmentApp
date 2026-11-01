const prisma = require('../../config/prisma');
const ApiError = require('../../utils/ApiError');
const repo = require('./profile.repository');

const withTransaction = (fn) => prisma.$transaction(fn);

// Candidate
exports.getCandidateProfile = async (userId) => {
  const profile = await repo.findCandidateById(userId);
  // profile can be null because user may have only created an account
  return profile || {};
};

exports.updateCandidateProfile = (userId, data) => repo.upsertCandidate(userId, data);

// Recruiter
exports.getRecruiterProfile = (userId) => repo.findRecruiterById(userId);

exports.updateRecruiterProfile = async (userId, { fullName, ...profileData }) => {
  if (profileData.companyId) {
    const company = await repo.findCompanyById(profileData.companyId);
    if (!company) throw new ApiError(404, 'Company not found', 'COMPANY_NOT_FOUND');
  }
  return withTransaction(async (tx) => {
    if (fullName) await repo.updateUserName(userId, fullName, tx);
    return repo.upsertRecruiter(userId, profileData, tx);
  });
};

exports.createCompanyForRecruiter = async (userId, data) =>
  withTransaction(async (tx) => {
    const company = await repo.createCompany(data, tx);
    await repo.upsertRecruiter(userId, { companyId: company.id }, tx);
    return company;
  });

exports.updateCompany = async (userId, companyId, data) => {
  const recruiter = await repo.findRecruiterByUserId(userId);
  // Only a recruiter linked to this company can edit it
  if (!recruiter || recruiter.companyId !== companyId) {
    throw new ApiError(403, 'You can only edit your own company', 'FORBIDDEN');
  }
  return repo.updateCompany(companyId, data);
};

exports.searchCompanies = (q) => repo.searchCompanies(q);