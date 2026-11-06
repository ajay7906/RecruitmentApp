const prisma = require('../../config/prisma');
const ApiError = require('../../utils/ApiError');
const repo = require('./companies.repository');

const withTransaction = (fn) => prisma.$transaction(fn);

const COMPLETION_FIELDS = [
  { key: 'name', label: 'Company Name' },
  { key: 'logoUrl', label: 'Company Logo' },
  { key: 'website', label: 'Website' },
  { key: 'email', label: 'Company Email' },
  { key: 'contactNumber', label: 'Contact Number' },
  { key: 'industry', label: 'Industry' },
  { key: 'companySize', label: 'Company Size' },
  { key: 'companyType', label: 'Company Type' },
  { key: 'foundedYear', label: 'Founded Year' },
  { key: 'country', label: 'Country' },
  { key: 'state', label: 'State' },
  { key: 'city', label: 'City' },
  { key: 'address', label: 'Office Address' },
  { key: 'description', label: 'Company Description' },
  { key: 'linkedinUrl', label: 'LinkedIn Profile' },
];

const SUBMISSION_REQUIRED_FIELDS = [
  { key: 'name', label: 'Company Name' },
  { key: 'email', label: 'Company Email' },
  { key: 'contactNumber', label: 'Contact Number' },
  { key: 'industry', label: 'Industry' },
  { key: 'companySize', label: 'Company Size' },
  { key: 'companyType', label: 'Company Type' },
  { key: 'country', label: 'Country' },
  { key: 'state', label: 'State' },
  { key: 'city', label: 'City' },
  { key: 'address', label: 'Complete Office Address' },
  { key: 'description', label: 'Company Description' },
];

function computeCompletion(company) {
  const total = COMPLETION_FIELDS.length;
  const completedFields = [];
  const missingFields = [];

  for (const field of COMPLETION_FIELDS) {
    const val = company[field.key];
    const hasValue = val !== null && val !== undefined && String(val).trim() !== '';
    if (hasValue) {
      completedFields.push(field.label);
    } else {
      missingFields.push(field.label);
    }
  }

  return {
    completed: completedFields.length,
    total,
    percentage: Math.round((completedFields.length / total) * 100),
    missingFields,
  };
}

function getEffectiveCompanyRole(company, currentUser) {
  if (!currentUser) return null;
  if (company.ownerId === currentUser.id) return 'OWNER';
  const membership = (company.memberships || []).find(
    (m) => m.userId === currentUser.id && m.membershipStatus === 'ACTIVE'
  );
  if (membership) return membership.role;
  return null;
}

function formatCompany(company, currentUser) {
  if (!company) return null;
  const myRole = getEffectiveCompanyRole(company, currentUser);
  const isSystemAdmin = currentUser?.role === 'admin';
  const canManage = isSystemAdmin || myRole === 'OWNER' || myRole === 'ADMIN';
  const canManageOwnership = isSystemAdmin || myRole === 'OWNER';

  const membershipCount = company._count?.memberships ?? (company.memberships ? company.memberships.length : 0);
  const recruiterProfileCount = company._count?.recruiters ?? 0;
  const recruiterCount = Math.max(membershipCount, recruiterProfileCount, company.ownerId ? 1 : 0);

  return {
    ...company,
    companyName: company.name,
    logo: company.logoUrl,
    linkedInUrl: company.linkedinUrl,
    myRole,
    canManage,
    canManageOwnership,
    recruiterCount,
    completion: computeCompletion(company),
  };
}

async function assertNoDuplicate(data, excludeId = null, db = prisma) {
  const duplicate = await repo.findDuplicateCompany(
    {
      name: data.name,
      gstin: data.gstin,
      registrationNumber: data.registrationNumber,
      excludeId,
    },
    db
  );

  if (!duplicate) return;

  if (data.name && duplicate.name?.toLowerCase() === data.name.toLowerCase()) {
    throw new ApiError(409, 'A company with this name is already registered', 'COMPANY_NAME_EXISTS');
  }
  if (data.gstin && duplicate.gstin?.toLowerCase() === data.gstin.toLowerCase()) {
    throw new ApiError(409, 'A company with this GSTIN is already registered', 'COMPANY_GSTIN_EXISTS');
  }
  if (
    data.registrationNumber &&
    duplicate.registrationNumber?.toLowerCase() === data.registrationNumber.toLowerCase()
  ) {
    throw new ApiError(
      409,
      'A company with this CIN / Registration Number is already registered',
      'COMPANY_REG_NUMBER_EXISTS'
    );
  }
}

async function getCompanyOrThrow(companyId, db = prisma) {
  const company = await repo.findCompanyById(companyId, db);
  if (!company) {
    throw new ApiError(404, 'Company not found', 'COMPANY_NOT_FOUND');
  }
  return company;
}

function assertCanManageCompany(company, currentUser) {
  const myRole = getEffectiveCompanyRole(company, currentUser);
  if (currentUser?.role !== 'admin' && myRole !== 'OWNER' && myRole !== 'ADMIN') {
    throw new ApiError(
      403,
      'Only the company owner or company admin can modify this company',
      'FORBIDDEN_COMPANY_ACCESS'
    );
  }
  return myRole;
}

// ── Create / Register Company ──────────────────────────────────────────
exports.registerCompany = async (currentUser, data) => {
  await assertNoDuplicate(data);

  const created = await withTransaction(async (tx) => {
    const company = await repo.createCompany(
      {
        ...data,
        ownerId: currentUser.id,
        status: 'DRAFT',
      },
      tx
    );

    await repo.upsertMembership(
      {
        companyId: company.id,
        userId: currentUser.id,
        role: 'OWNER',
        membershipStatus: 'ACTIVE',
      },
      tx
    );

    if (currentUser.role === 'recruiter') {
      await repo.linkRecruiterProfileCompany(currentUser.id, company.id, tx);
    }

    return repo.findCompanyById(company.id, tx);
  });

  return formatCompany(created, currentUser);
};

// ── Get My Companies (Recruiter) ───────────────────────────────────────
exports.getMyCompanies = async (currentUser, queryParams) => {
  const result = await repo.findCompaniesForUser(currentUser.id, queryParams);
  return {
    ...result,
    items: result.items.map((c) => formatCompany(c, currentUser)),
  };
};

// ── List All Companies (Admin / Directory) ─────────────────────────────
exports.listCompanies = async (currentUser, queryParams) => {
  const result = await repo.findAllCompanies(queryParams);
  return {
    ...result,
    items: result.items.map((c) => formatCompany(c, currentUser)),
  };
};

// ── Get Company Details ────────────────────────────────────────────────
exports.getCompanyDetails = async (currentUser, companyId) => {
  const company = await getCompanyOrThrow(companyId);
  return formatCompany(company, currentUser);
};

// ── Update Company Details ─────────────────────────────────────────────
exports.updateCompanyDetails = async (currentUser, companyId, data) => {
  const company = await getCompanyOrThrow(companyId);
  assertCanManageCompany(company, currentUser);

  if (company.status === 'SUSPENDED' && currentUser.role !== 'admin') {
    throw new ApiError(
      403,
      'Suspended companies cannot be modified. Please contact an administrator.',
      'COMPANY_SUSPENDED'
    );
  }

  await assertNoDuplicate(data, companyId);

  const updated = await repo.updateCompany(companyId, data);
  return formatCompany(updated, currentUser);
};

// ── Update Company Logo ────────────────────────────────────────────────
exports.updateCompanyLogo = async (currentUser, companyId, logoUrl) => {
  const company = await getCompanyOrThrow(companyId);
  assertCanManageCompany(company, currentUser);

  const updated = await repo.updateCompany(companyId, { logoUrl });
  return formatCompany(updated, currentUser);
};

// ── Submit Company for Approval ────────────────────────────────────────
exports.submitCompanyForApproval = async (currentUser, companyId) => {
  const company = await getCompanyOrThrow(companyId);
  assertCanManageCompany(company, currentUser);

  if (company.status === 'PENDING_APPROVAL') {
    throw new ApiError(400, 'Company is already pending approval', 'ALREADY_PENDING');
  }
  if (company.status === 'APPROVED') {
    throw new ApiError(400, 'Company is already approved', 'ALREADY_APPROVED');
  }
  if (company.status === 'SUSPENDED') {
    throw new ApiError(
      400,
      'Suspended companies cannot be submitted for approval directly',
      'COMPANY_SUSPENDED'
    );
  }

  const missing = SUBMISSION_REQUIRED_FIELDS.filter(({ key }) => {
    const v = company[key];
    return v === null || v === undefined || String(v).trim() === '';
  }).map((f) => f.label);

  if (missing.length > 0) {
    throw new ApiError(
      400,
      `Please complete all required company fields before submitting: ${missing.join(', ')}`,
      'INCOMPLETE_COMPANY_PROFILE'
    );
  }

  const updated = await repo.updateCompany(companyId, {
    status: 'PENDING_APPROVAL',
    submittedAt: new Date(),
    rejectionReason: null,
  });

  return formatCompany(updated, currentUser);
};

// ── Admin: Approve Company ─────────────────────────────────────────────
exports.approveCompany = async (adminUser, companyId) => {
  const company = await getCompanyOrThrow(companyId);

  if (company.ownerId === adminUser.id && adminUser.role !== 'admin') {
    throw new ApiError(403, 'Recruiters cannot approve their own company', 'FORBIDDEN');
  }
  if (company.status === 'APPROVED') {
    throw new ApiError(400, 'Company is already approved', 'ALREADY_APPROVED');
  }
  if (company.status === 'DRAFT') {
    throw new ApiError(
      400,
      'Cannot approve a company in DRAFT status; it must be submitted for approval first',
      'INVALID_STATUS_TRANSITION'
    );
  }

  const updated = await repo.updateCompany(companyId, {
    status: 'APPROVED',
    approvedAt: new Date(),
    approvedById: adminUser.id,
    rejectionReason: null,
    suspensionReason: null,
  });

  return formatCompany(updated, adminUser);
};

// ── Admin: Reject Company ──────────────────────────────────────────────
exports.rejectCompany = async (adminUser, companyId, reason) => {
  const company = await getCompanyOrThrow(companyId);

  if (company.status !== 'PENDING_APPROVAL') {
    throw new ApiError(
      400,
      'Only companies in PENDING_APPROVAL status can be rejected',
      'INVALID_STATUS_TRANSITION'
    );
  }

  const updated = await repo.updateCompany(companyId, {
    status: 'REJECTED',
    rejectionReason: reason,
    approvedAt: null,
    approvedById: null,
  });

  return formatCompany(updated, adminUser);
};

// ── Admin: Suspend Company ─────────────────────────────────────────────
exports.suspendCompany = async (adminUser, companyId, reason) => {
  const company = await getCompanyOrThrow(companyId);

  if (company.status !== 'APPROVED') {
    throw new ApiError(
      400,
      'Only APPROVED companies can be suspended',
      'INVALID_STATUS_TRANSITION'
    );
  }

  const updated = await repo.updateCompany(companyId, {
    status: 'SUSPENDED',
    suspensionReason: reason,
  });

  return formatCompany(updated, adminUser);
};

// ── Membership & Ownership Management ──────────────────────────────────
exports.addCompanyMember = async (currentUser, companyId, { email, role }) => {
  const company = await getCompanyOrThrow(companyId);
  const myRole = assertCanManageCompany(company, currentUser);

  if (role === 'ADMIN' && myRole !== 'OWNER' && currentUser.role !== 'admin') {
    throw new ApiError(403, 'Only the company owner can assign company admins', 'FORBIDDEN');
  }

  const targetUser = await repo.findUserByEmail(email);
  if (!targetUser) {
    throw new ApiError(404, 'No user found with that email address', 'USER_NOT_FOUND');
  }
  if (targetUser.role !== 'recruiter' && targetUser.role !== 'admin') {
    throw new ApiError(400, 'Only users with a recruiter account can be added to a company', 'INVALID_USER_ROLE');
  }
  if (company.ownerId === targetUser.id) {
    throw new ApiError(409, 'This user is already the owner of the company', 'ALREADY_OWNER');
  }

  await withTransaction(async (tx) => {
    await repo.upsertMembership(
      {
        companyId,
        userId: targetUser.id,
        role,
        membershipStatus: 'ACTIVE',
      },
      tx
    );
    await repo.linkRecruiterProfileCompany(targetUser.id, companyId, tx);
  });

  const updated = await getCompanyOrThrow(companyId);
  return formatCompany(updated, currentUser);
};

exports.updateCompanyMemberRole = async (currentUser, companyId, membershipId, { role }) => {
  const company = await getCompanyOrThrow(companyId);
  const myRole = getEffectiveCompanyRole(company, currentUser);

  if (currentUser.role !== 'admin' && myRole !== 'OWNER') {
    throw new ApiError(403, 'Only the company owner can change member roles or transfer ownership', 'FORBIDDEN');
  }

  const membership = await repo.findMembershipById(membershipId);
  if (!membership || membership.companyId !== companyId || membership.membershipStatus !== 'ACTIVE') {
    throw new ApiError(404, 'Company member not found', 'MEMBER_NOT_FOUND');
  }

  if (role === 'OWNER') {
    // Transfer company ownership atomically
    await withTransaction(async (tx) => {
      if (company.ownerId) {
        await repo.upsertMembership(
          {
            companyId,
            userId: company.ownerId,
            role: 'ADMIN',
            membershipStatus: 'ACTIVE',
          },
          tx
        );
      }
      await repo.updateMembership(membershipId, { role: 'OWNER' }, tx);
      await repo.updateCompany(companyId, { ownerId: membership.userId }, tx);
    });
  } else {
    if (membership.userId === company.ownerId) {
      throw new ApiError(400, 'Cannot demote the company owner without transferring ownership first', 'CANNOT_DEMOTE_OWNER');
    }
    await repo.updateMembership(membershipId, { role });
  }

  const updated = await getCompanyOrThrow(companyId);
  return formatCompany(updated, currentUser);
};

exports.removeCompanyMember = async (currentUser, companyId, membershipId) => {
  const company = await getCompanyOrThrow(companyId);
  const myRole = assertCanManageCompany(company, currentUser);

  const membership = await repo.findMembershipById(membershipId);
  if (!membership || membership.companyId !== companyId || membership.membershipStatus !== 'ACTIVE') {
    throw new ApiError(404, 'Company member not found', 'MEMBER_NOT_FOUND');
  }

  if (membership.userId === company.ownerId || membership.role === 'OWNER') {
    throw new ApiError(400, 'The company owner cannot be removed from the company', 'CANNOT_REMOVE_OWNER');
  }

  if (membership.role === 'ADMIN' && myRole !== 'OWNER' && currentUser.role !== 'admin') {
    throw new ApiError(403, 'Only the company owner can remove a company admin', 'FORBIDDEN');
  }

  await repo.updateMembership(membershipId, { membershipStatus: 'REMOVED' });
  const updated = await getCompanyOrThrow(companyId);
  return formatCompany(updated, currentUser);
};
