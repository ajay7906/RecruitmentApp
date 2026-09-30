const env = require('../../config/env');
const asyncHandler = require('../../utils/asyncHandler');
const service = require('./auth.service');

const COOKIE = 'refresh_token';
const cookieOpts = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/api/v1/auth',
  maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
};
const meta = (req) => ({ userAgent: req.get('user-agent'), ip: req.ip });
const ok = (res, data, status = 200) => res.status(status).json({ success: true, data });
const msg = (res, message) => res.json({ success: true, message });

exports.register = asyncHandler(async (req, res) => {
  const user = await service.register(req.body);
  ok(res, { user, message: 'Registered. Check your email to verify your account.' }, 201);
});

exports.login = asyncHandler(async (req, res) => {
  const { user, accessToken, refreshToken } = await service.login(req.body, meta(req));
  res.cookie(COOKIE, refreshToken, cookieOpts);
  ok(res, { user, accessToken });
});

exports.refresh = asyncHandler(async (req, res) => {
  const { user, accessToken, refreshToken } = await service.refresh(req.cookies[COOKIE], meta(req));
  res.cookie(COOKIE, refreshToken, cookieOpts);
  ok(res, { user, accessToken });
});

exports.logout = asyncHandler(async (req, res) => {
  await service.logout(req.cookies[COOKIE]);
  res.clearCookie(COOKIE, { ...cookieOpts, maxAge: undefined });
  msg(res, 'Logged out');
});

exports.verifyEmail = asyncHandler(async (req, res) => {
  await service.verifyEmail(req.body.token);
  msg(res, 'Email verified');
});

exports.resendVerification = asyncHandler(async (req, res) => {
  await service.resendVerification(req.body.email);
  msg(res, 'If the account exists and is unverified, a new email has been sent');
});

exports.forgotPassword = asyncHandler(async (req, res) => {
  await service.forgotPassword(req.body.email);
  msg(res, 'If the email exists, a reset link has been sent');
});

exports.resetPassword = asyncHandler(async (req, res) => {
  await service.resetPassword(req.body);
  msg(res, 'Password reset. Please log in.');
});

exports.changePassword = asyncHandler(async (req, res) => {
  await service.changePassword(req.user.id, req.body);
  res.clearCookie(COOKIE, { ...cookieOpts, maxAge: undefined });
  msg(res, 'Password changed. Please log in again.');
});

exports.me = asyncHandler(async (req, res) => ok(res, { user: await service.me(req.user.id) }));
