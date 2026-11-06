const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const ApiError = require('../utils/ApiError');

const STORAGE_ROOT = path.resolve(__dirname, '../../storage/resumes');
const MAX_RESUME_BYTES = 5 * 1024 * 1024; // 5 MB

const ALLOWED_FORMATS = {
  'application/pdf': {
    ext: '.pdf',
    checkSignature: (buf) => buf.length >= 5 && buf.subarray(0, 5).toString('ascii') === '%PDF-',
  },
  'application/msword': {
    ext: '.doc',
    checkSignature: (buf) =>
      buf.length >= 4 &&
      buf[0] === 0xd0 &&
      buf[1] === 0xcf &&
      buf[2] === 0x11 &&
      buf[3] === 0xe0,
  },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
    ext: '.docx',
    checkSignature: (buf) =>
      buf.length >= 4 &&
      buf[0] === 0x50 &&
      buf[1] === 0x4b &&
      buf[2] === 0x03 &&
      buf[3] === 0x04,
  },
};

const EXT_TO_MIME = {
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

function sanitizeFileName(rawName, fallbackExt = '.pdf') {
  const base = path
    .basename(String(rawName || 'resume'))
    .replace(/[^a-zA-Z0-9._ -]/g, '_')
    .trim();
  if (!base) return `resume${fallbackExt}`;
  const ext = path.extname(base).toLowerCase();
  if (!EXT_TO_MIME[ext]) {
    return `${base}${fallbackExt}`;
  }
  return base;
}

function parseBase64Payload(input, providedMimeType, fileName) {
  if (!input || typeof input !== 'string') {
    throw new ApiError(400, 'Resume file content is required', 'INVALID_RESUME_CONTENT');
  }

  let mimeType = providedMimeType ? String(providedMimeType).trim().toLowerCase() : '';
  let base64Data = input.trim();

  if (base64Data.startsWith('data:')) {
    const commaIdx = base64Data.indexOf(',');
    if (commaIdx === -1) {
      throw new ApiError(400, 'Malformed resume data URI', 'INVALID_RESUME_CONTENT');
    }
    const header = base64Data.slice(5, commaIdx);
    const semiIdx = header.indexOf(';');
    const extractedMime = (semiIdx !== -1 ? header.slice(0, semiIdx) : header).trim().toLowerCase();
    if (extractedMime) {
      mimeType = extractedMime;
    }
    base64Data = base64Data.slice(commaIdx + 1);
  }

  if (!mimeType && fileName) {
    const ext = path.extname(String(fileName)).toLowerCase();
    mimeType = EXT_TO_MIME[ext] || '';
  }

  const formatSpec = ALLOWED_FORMATS[mimeType];
  if (!formatSpec) {
    throw new ApiError(
      400,
      'Unsupported resume format. Please upload a PDF, DOC, or DOCX file.',
      'UNSUPPORTED_RESUME_FORMAT'
    );
  }

  const buffer = Buffer.from(base64Data, 'base64');
  if (!buffer || buffer.length === 0) {
    throw new ApiError(400, 'Uploaded resume file is empty', 'EMPTY_RESUME_FILE');
  }

  if (buffer.length > MAX_RESUME_BYTES) {
    throw new ApiError(
      400,
      'Resume file size exceeds the 5 MB maximum limit',
      'RESUME_FILE_TOO_LARGE'
    );
  }

  if (!formatSpec.checkSignature(buffer)) {
    throw new ApiError(
      400,
      'Uploaded file content does not match its declared resume format (PDF, DOC, or DOCX)',
      'INVALID_RESUME_SIGNATURE'
    );
  }

  return {
    buffer,
    mimeType,
    ext: formatSpec.ext,
    fileSize: buffer.length,
    safeFileName: sanitizeFileName(fileName, formatSpec.ext),
  };
}

exports.saveResumeFile = async ({ userId, fileName, mimeType, contentBase64 }) => {
  if (!userId) {
    throw new ApiError(401, 'Authenticated user is required to store resume', 'UNAUTHORIZED');
  }

  const parsed = parseBase64Payload(contentBase64, mimeType, fileName);
  const userDir = path.join(STORAGE_ROOT, String(userId));
  await fs.mkdir(userDir, { recursive: true });

  const uniqueFile = `${crypto.randomUUID()}${parsed.ext}`;
  const resumeKey = `${userId}/${uniqueFile}`;
  const fullPath = path.resolve(STORAGE_ROOT, resumeKey);

  if (!fullPath.startsWith(STORAGE_ROOT)) {
    throw new ApiError(400, 'Invalid resume storage key', 'INVALID_STORAGE_KEY');
  }

  await fs.writeFile(fullPath, parsed.buffer);

  return {
    resumeKey,
    resumeFileName: parsed.safeFileName,
    resumeMimeType: parsed.mimeType,
    resumeFileSize: parsed.fileSize,
  };
};

exports.readResumeFile = async (resumeKey) => {
  if (!resumeKey || typeof resumeKey !== 'string') {
    throw new ApiError(404, 'Resume file not found', 'RESUME_NOT_FOUND');
  }

  const normalizedRel = resumeKey.replace(/\\/g, '/').replace(/^\/+/, '');
  const fullPath = path.resolve(STORAGE_ROOT, normalizedRel);

  if (!fullPath.startsWith(STORAGE_ROOT + path.sep)) {
    throw new ApiError(403, 'Invalid resume key access', 'FORBIDDEN_RESUME_KEY');
  }

  try {
    const buffer = await fs.readFile(fullPath);
    const ext = path.extname(fullPath).toLowerCase();
    const mimeType = EXT_TO_MIME[ext] || 'application/octet-stream';
    return { buffer, fullPath, mimeType };
  } catch (err) {
    if (err.code === 'ENOENT') {
      throw new ApiError(404, 'Resume file not found on storage', 'RESUME_FILE_MISSING');
    }
    throw err;
  }
};

exports.deleteResumeFileIfExists = async (resumeKey) => {
  if (!resumeKey || typeof resumeKey !== 'string') return;
  const normalizedRel = resumeKey.replace(/\\/g, '/').replace(/^\/+/, '');
  const fullPath = path.resolve(STORAGE_ROOT, normalizedRel);
  if (!fullPath.startsWith(STORAGE_ROOT + path.sep)) return;
  try {
    await fs.unlink(fullPath);
  } catch {
    // Ignore if already deleted
  }
};
