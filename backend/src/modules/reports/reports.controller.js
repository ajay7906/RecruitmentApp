'use strict';

const asyncHandler = require('../../utils/asyncHandler');
const service = require('./reports.service');

const ok = (res, data, status = 200) => res.status(status).json({ success: true, data });

exports.listAvailableReports = asyncHandler(async (req, res) => {
  const result = await service.listAvailableReports(req.user);
  ok(res, result);
});

exports.getReport = asyncHandler(async (req, res) => {
  const result = await service.generateReport(req.user, req.params.type, req.query, {
    isExport: false,
  });
  ok(res, result);
});

exports.exportReport = asyncHandler(async (req, res) => {
  const { fileName, mimeType, buffer } = await service.exportReport(
    req.user,
    req.params.type,
    req.query,
    {
      ip: req.ip,
      userAgent: req.get('user-agent'),
    }
  );

  res.setHeader('Content-Type', mimeType);
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${encodeURIComponent(fileName)}"`
  );
  res.setHeader('Content-Length', buffer.length);
  res.send(buffer);
});
