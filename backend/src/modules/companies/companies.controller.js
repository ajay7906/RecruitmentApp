'use strict';

const asyncHandler = require('../../utils/asyncHandler');
const service = require('./companies.service');
const notificationsService = require('../notifications/notifications.service');

const ok = (res, data, status = 200) => res.status(status).json({ success: true, data });

exports.registerCompany = asyncHandler(async (req, res) => {
  const company = await service.registerCompany(req.user, req.body);
  notificationsService
    .notifyUser({
      recipientId: req.user.id,
      templateKey: 'COMPANY_REGISTERED',
      eventType: 'COMPANY_REGISTERED',
      category: 'COMPANY',
      variables: {
        recruiterName: req.user.fullName || 'Recruiter',
        companyName: company.name,
      },
      relatedEntityType: 'COMPANY',
      relatedEntityId: company.id,
      actionUrl: `/app/companies/${company.id}/dashboard`,
      idempotencyKey: `company-registered:${company.id}`,
    })
    .catch(() => {});
  ok(res, { company }, 201);
});

exports.getMyCompanies = asyncHandler(async (req, res) => {
  const result = await service.getMyCompanies(req.user, req.query);
  ok(res, {
    companies: result.items,
    pagination: {
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    },
  });
});

exports.listCompanies = asyncHandler(async (req, res) => {
  const result = await service.listCompanies(req.user, req.query);
  ok(res, {
    companies: result.items,
    pagination: {
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    },
  });
});

exports.getCompanyDetails = asyncHandler(async (req, res) => {
  const company = await service.getCompanyDetails(req.user, req.params.id);
  ok(res, { company });
});

exports.updateCompanyDetails = asyncHandler(async (req, res) => {
  const company = await service.updateCompanyDetails(req.user, req.params.id, req.body);
  ok(res, { company });
});

exports.updateCompanyLogo = asyncHandler(async (req, res) => {
  const company = await service.updateCompanyLogo(req.user, req.params.id, req.body.logoUrl);
  ok(res, { company });
});

exports.submitCompany = asyncHandler(async (req, res) => {
  const company = await service.submitCompanyForApproval(req.user, req.params.id);
  notificationsService
    .notifyUser({
      recipientId: req.user.id,
      templateKey: 'COMPANY_SUBMITTED_FOR_APPROVAL',
      eventType: 'COMPANY_SUBMITTED_FOR_APPROVAL',
      category: 'COMPANY',
      variables: {
        recruiterName: req.user.fullName || 'Recruiter',
        companyName: company.name,
      },
      relatedEntityType: 'COMPANY',
      relatedEntityId: company.id,
      actionUrl: `/app/companies/${company.id}/approval`,
    })
    .catch(() => {});
  notificationsService
    .notifyAdminsByPermission({
      permission: 'companies.approve',
      templateKey: 'ADMIN_COMPANY_REVIEW_REQUIRED',
      eventType: 'ADMIN_COMPANY_REVIEW_REQUIRED',
      category: 'ADMIN',
      variables: {
        recruiterName: req.user.fullName || 'Recruiter',
        companyName: company.name,
      },
      relatedEntityType: 'COMPANY',
      relatedEntityId: company.id,
      actionUrl: `/admin/companies/${company.id}`,
    })
    .catch(() => {});
  ok(res, { company, message: 'Company submitted for approval' });
});

exports.approveCompany = asyncHandler(async (req, res) => {
  const company = await service.approveCompany(req.user, req.params.id);
  if (company.ownerId) {
    notificationsService
      .notifyUser({
        recipientId: company.ownerId,
        templateKey: 'COMPANY_APPROVED',
        eventType: 'COMPANY_APPROVED',
        category: 'COMPANY',
        variables: { companyName: company.name },
        relatedEntityType: 'COMPANY',
        relatedEntityId: company.id,
        actionUrl: `/app/companies/${company.id}/dashboard`,
      })
      .catch(() => {});
  }
  ok(res, { company, message: 'Company approved successfully' });
});

exports.rejectCompany = asyncHandler(async (req, res) => {
  const company = await service.rejectCompany(req.user, req.params.id, req.body.reason);
  if (company.ownerId) {
    notificationsService
      .notifyUser({
        recipientId: company.ownerId,
        templateKey: 'COMPANY_REJECTED',
        eventType: 'COMPANY_REJECTED',
        category: 'COMPANY',
        variables: { companyName: company.name, reason: req.body.reason },
        relatedEntityType: 'COMPANY',
        relatedEntityId: company.id,
        actionUrl: `/app/companies/${company.id}/approval`,
      })
      .catch(() => {});
  }
  ok(res, { company, message: 'Company rejected' });
});

exports.suspendCompany = asyncHandler(async (req, res) => {
  const company = await service.suspendCompany(req.user, req.params.id, req.body.reason);
  if (company.ownerId) {
    notificationsService
      .notifyUser({
        recipientId: company.ownerId,
        templateKey: 'COMPANY_SUSPENDED',
        eventType: 'COMPANY_SUSPENDED',
        category: 'COMPANY',
        variables: { companyName: company.name, reason: req.body.reason },
        relatedEntityType: 'COMPANY',
        relatedEntityId: company.id,
        actionUrl: `/app/companies/${company.id}/dashboard`,
      })
      .catch(() => {});
  }
  ok(res, { company, message: 'Company suspended' });
});

exports.addMember = asyncHandler(async (req, res) => {
  const company = await service.addCompanyMember(req.user, req.params.id, req.body);
  ok(res, { company, message: 'Member added to company' }, 201);
});

exports.updateMemberRole = asyncHandler(async (req, res) => {
  const company = await service.updateCompanyMemberRole(
    req.user,
    req.params.id,
    req.params.membershipId,
    req.body
  );
  ok(res, { company, message: 'Member role updated' });
});

exports.removeMember = asyncHandler(async (req, res) => {
  const company = await service.removeCompanyMember(req.user, req.params.id, req.params.membershipId);
  ok(res, { company, message: 'Member removed from company' });
});
