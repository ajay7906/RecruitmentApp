const nodemailer = require('nodemailer');
const env = require('../config/env');

const transporter = env.SMTP_HOST
  ? nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    })
  : null;

async function send({ to, subject, html }) {
  if (!transporter) {
    console.log(`\n[DEV EMAIL] to=${to}\nsubject=${subject}\n${html}\n`);
    return;
  }
  await transporter.sendMail({ from: env.MAIL_FROM, to, subject, html });
}

exports.sendVerificationEmail = (to, token) => {
  const link = `${env.CLIENT_URL}/verify-email?token=${token}`;
  return send({ to, subject: 'Verify your email', html: `<p>Verify your email: <a href="${link}">${link}</a></p><p>Valid for 24 hours.</p>` });
};

exports.sendPasswordResetEmail = (to, token) => {
  const link = `${env.CLIENT_URL}/reset-password?token=${token}`;
  return send({ to, subject: 'Reset your password', html: `<p>Reset your password: <a href="${link}">${link}</a></p><p>Valid for 1 hour.</p>` });
};
