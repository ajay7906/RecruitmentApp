const router = require('express').Router();
const c = require('./auth.controller');
const v = require('./auth.validation');
const validate = require('../../middlewares/validate');
const { authenticate } = require('../../middlewares/authenticate');
const { authLimiter } = require('../../middlewares/rateLimiter');

router.use(authLimiter);

router.post('/register', validate(v.register), c.register);
router.post('/login', validate(v.login), c.login);
router.post('/refresh', c.refresh);
router.post('/logout', c.logout);
router.post('/verify-email', validate(v.verifyEmail), c.verifyEmail);
router.post('/resend-verification', validate(v.emailOnly), c.resendVerification);
router.post('/forgot-password', validate(v.emailOnly), c.forgotPassword);
router.post('/reset-password', validate(v.resetPassword), c.resetPassword);
router.post('/change-password', authenticate, validate(v.changePassword), c.changePassword);
router.get('/me', authenticate, c.me);

module.exports = router;
