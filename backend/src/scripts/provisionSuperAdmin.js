'use strict';

require('dotenv').config();
const bcrypt = require('bcrypt');
const prisma = require('../config/prisma');
const { recordAudit } = require('../services/audit.service');

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,72}$/;

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token === '--force') {
      args.force = true;
    } else if (token.startsWith('--email=')) {
      args.email = token.slice('--email='.length);
    } else if (token === '--email' && argv[i + 1]) {
      args.email = argv[++i];
    } else if (token.startsWith('--password=')) {
      args.password = token.slice('--password='.length);
    } else if (token === '--password' && argv[i + 1]) {
      args.password = argv[++i];
    } else if (token.startsWith('--name=')) {
      args.fullName = token.slice('--name='.length);
    } else if (token === '--name' && argv[i + 1]) {
      args.fullName = argv[++i];
    }
  }
  return args;
}

/**
 * Provisions a SUPER_ADMIN account safely.
 * Can be called programmatically in tests or via `npm run admin:create-super`.
 */
async function provisionSuperAdmin({ email, password, fullName, force = false } = {}, db = prisma) {
  const cleanEmail = (email || process.env.SUPER_ADMIN_EMAIL || '').trim().toLowerCase();
  const cleanPassword = password || process.env.SUPER_ADMIN_PASSWORD || '';
  const cleanName = (fullName || process.env.SUPER_ADMIN_NAME || 'Platform Super Admin').trim();

  if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    throw new Error('Valid SUPER_ADMIN_EMAIL (or --email) is required.');
  }

  if (!PASSWORD_REGEX.test(cleanPassword)) {
    throw new Error(
      'SUPER_ADMIN_PASSWORD must be 8-72 characters and include uppercase, lowercase, number, and special character.'
    );
  }

  const runInTx = typeof db.$transaction === 'function' ? (fn) => db.$transaction(fn) : (fn) => fn(db);

  return runInTx(async (tx) => {
    const existingSuperCount = await tx.user.count({
      where: { role: 'admin', adminRole: 'SUPER_ADMIN', status: 'active' },
    });

    const existingTarget = await tx.user.findUnique({ where: { email: cleanEmail } });

    if (existingSuperCount > 0 && !force && existingTarget?.adminRole !== 'SUPER_ADMIN') {
      throw new Error(
        'An active SUPER_ADMIN already exists. Pass --force (or force: true) to provision an additional SUPER_ADMIN.'
      );
    }

    const passwordHash = await bcrypt.hash(cleanPassword, 12);
    const now = new Date();

    let user;
    let previousRole = null;

    if (existingTarget) {
      previousRole = existingTarget.adminRole || null;
      user = await tx.user.update({
        where: { id: existingTarget.id },
        data: {
          fullName: cleanName || existingTarget.fullName,
          passwordHash,
          role: 'admin',
          adminRole: 'SUPER_ADMIN',
          status: 'active',
          emailVerifiedAt: existingTarget.emailVerifiedAt || now,
          suspendedAt: null,
          suspendedById: null,
          suspensionReason: null,
          statusChangedAt: now,
        },
      });
    } else {
      user = await tx.user.create({
        data: {
          email: cleanEmail,
          fullName: cleanName,
          passwordHash,
          role: 'admin',
          adminRole: 'SUPER_ADMIN',
          status: 'active',
          emailVerifiedAt: now,
          statusChangedAt: now,
        },
      });
    }

    await tx.adminRoleHistory.create({
      data: {
        userId: user.id,
        changeType: existingTarget ? 'ROLE' : 'CREATED',
        previousRole,
        newRole: 'SUPER_ADMIN',
        changedBy: user.id,
        reason: 'Super Admin CLI provisioning',
      },
    });

    await recordAudit(
      {
        actor: { id: user.id, role: 'admin', adminRole: 'SUPER_ADMIN' },
        action: 'SUPER_ADMIN_PROVISIONED',
        entityType: 'USER',
        entityId: user.id,
        previousValue: existingTarget ? { role: existingTarget.role, adminRole: previousRole } : null,
        newValue: { email: user.email, role: 'admin', adminRole: 'SUPER_ADMIN' },
        reason: 'Provisioned via super admin bootstrap script',
      },
      tx
    );

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      adminRole: user.adminRole,
      status: user.status,
    };
  });
}

if (require.main === module) {
  const cliArgs = parseArgs(process.argv.slice(2));
  provisionSuperAdmin(cliArgs)
    .then(async (admin) => {
      console.log(`SUPER_ADMIN provisioned: ${admin.email} (${admin.id})`);
      await prisma.$disconnect();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('Failed to provision SUPER_ADMIN:', err.message);
      await prisma.$disconnect();
      process.exit(1);
    });
}

module.exports = { provisionSuperAdmin };
