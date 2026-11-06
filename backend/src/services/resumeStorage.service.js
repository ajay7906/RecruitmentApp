const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const zlib = require('zlib');
const ApiError = require('../utils/ApiError');

const STORAGE_ROOT = path.resolve(__dirname, '../../storage/resumes');
const TEXT_STORAGE_ROOT = path.resolve(__dirname, '../../storage/resume-text');

const maxMb = Number(process.env.MAX_RESUME_SIZE_MB) || 5;
const MAX_RESUME_BYTES = maxMb * 1024 * 1024;

const ALLOWED_FORMATS = {
  'application/pdf': {
    ext: '.pdf',
    fileType: 'PDF',
    checkSignature: (buf) => buf.length >= 8 && buf.subarray(0, 5).toString('ascii') === '%PDF-',
    checkStructure: (buf) => {
      // Check for %%EOF or xref/startxref in the tail or body to detect truncated/corrupted PDFs
      const tail = buf.subarray(Math.max(0, buf.length - 2048)).toString('latin1');
      const body = buf.toString('latin1');
      return tail.includes('%%EOF') || body.includes('%%EOF');
    },
  },
  'application/msword': {
    ext: '.doc',
    fileType: 'DOC',
    checkSignature: (buf) =>
      buf.length >= 8 &&
      buf[0] === 0xd0 &&
      buf[1] === 0xcf &&
      buf[2] === 0x11 &&
      buf[3] === 0xe0,
    checkStructure: (buf) => buf.length >= 512,
  },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
    ext: '.docx',
    fileType: 'DOCX',
    checkSignature: (buf) =>
      buf.length >= 4 &&
      buf[0] === 0x50 &&
      buf[1] === 0x4b &&
      buf[2] === 0x03 &&
      buf[3] === 0x04,
    checkStructure: (buf) => {
      // Valid ZIP archive must contain End of Central Directory (PK\x05\x06) and word/document.xml
      const str = buf.toString('latin1');
      return str.includes('PK\x05\x06') && str.includes('word/document.xml');
    },
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

// ── Basic Node.js Text Extraction (No AI / No External Libraries) ─────────

function decodeXmlEntities(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function extractTextFromDocxBuffer(buf) {
  let offset = 0;
  while (offset + 30 <= buf.length) {
    // Local file header signature = 0x04034b50
    if (buf.readUInt32LE(offset) !== 0x04034b50) {
      break;
    }
    const compressionMethod = buf.readUInt16LE(offset + 8);
    const compressedSize = buf.readUInt32LE(offset + 18);
    const fileNameLen = buf.readUInt16LE(offset + 26);
    const extraLen = buf.readUInt16LE(offset + 28);
    const entryName = buf
      .subarray(offset + 30, offset + 30 + fileNameLen)
      .toString('utf8');
    const dataStart = offset + 30 + fileNameLen + extraLen;
    const dataEnd = dataStart + compressedSize;

    if (dataEnd > buf.length) break;

    if (entryName === 'word/document.xml') {
      const rawData = buf.subarray(dataStart, dataEnd);
      let xmlContent = '';
      if (compressionMethod === 0) {
        xmlContent = rawData.toString('utf8');
      } else if (compressionMethod === 8) {
        xmlContent = zlib.inflateRawSync(rawData).toString('utf8');
      } else {
        return { status: 'UNSUPPORTED', text: '' };
      }

      const plain = decodeXmlEntities(
        xmlContent
          .replace(/<\/w:p>/g, '\n')
          .replace(/<w:tab\/>/g, '\t')
          .replace(/<w:br[^/>]*\/>/g, '\n')
          .replace(/<[^>]+>/g, '')
      )
        .replace(/\r?\n\s*\r?\n/g, '\n\n')
        .trim();

      return {
        status: plain.length > 0 ? 'TEXT_EXTRACTED' : 'NOT_PROCESSED',
        text: plain,
      };
    }

    offset = dataEnd;
  }

  return { status: 'FAILED', text: '' };
}

function extractTextFromPdfBuffer(buf) {
  const raw = buf.toString('latin1');
  const chunks = [];

  function collectLiteralStrings(contentStr) {
    const literalRegex = /\(([^()\\]*(?:\\.[^()\\]*)*)\)\s*Tj/g;
    let m;
    while ((m = literalRegex.exec(contentStr)) !== null) {
      chunks.push(
        m[1]
          .replace(/\\n/g, '\n')
          .replace(/\\r/g, '\r')
          .replace(/\\t/g, '\t')
          .replace(/\\\(/g, '(')
          .replace(/\\\)/g, ')')
          .replace(/\\\\/g, '\\')
      );
    }

    const tjArrayRegex = /\[([^\]]+)\]\s*TJ/g;
    while ((m = tjArrayRegex.exec(contentStr)) !== null) {
      const inner = m[1];
      const strParts = [];
      const partRegex = /\(([^()\\]*(?:\\.[^()\\]*)*)\)/g;
      let pm;
      while ((pm = partRegex.exec(inner)) !== null) {
        strParts.push(
          pm[1]
            .replace(/\\\(/g, '(')
            .replace(/\\\)/g, ')')
            .replace(/\\\\/g, '\\')
        );
      }
      if (strParts.length > 0) {
        chunks.push(strParts.join(''));
      }
    }
  }

  collectLiteralStrings(raw);

  // Also inspect FlateDecode streams if present
  const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let sm;
  while ((sm = streamRegex.exec(raw)) !== null) {
    try {
      const streamBuf = Buffer.from(sm[1], 'latin1');
      const inflated = zlib.inflateSync(streamBuf).toString('latin1');
      collectLiteralStrings(inflated);
    } catch {
      // Non-FlateDecode or binary image/font stream; skip safely
    }
  }

  const text = chunks
    .join(' ')
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (text.length > 0) {
    return { status: 'TEXT_EXTRACTED', text };
  }
  // Valid PDF whose text uses custom CID font maps; stored safely for future Python parser
  return { status: 'NOT_PROCESSED', text: '' };
}

async function processDocumentText({ userId, uniqueBase, fileType, buffer }) {
  try {
    let result = { status: 'NOT_PROCESSED', text: '' };

    if (fileType === 'DOCX') {
      result = extractTextFromDocxBuffer(buffer);
    } else if (fileType === 'PDF') {
      result = extractTextFromPdfBuffer(buffer);
    } else if (fileType === 'DOC') {
      result = { status: 'UNSUPPORTED', text: '' };
    }

    if (result.status === 'TEXT_EXTRACTED' && result.text) {
      const userTextDir = path.join(TEXT_STORAGE_ROOT, String(userId));
      await fs.mkdir(userTextDir, { recursive: true });
      const textRelKey = `${userId}/${uniqueBase}.txt`;
      const textFullPath = path.resolve(TEXT_STORAGE_ROOT, textRelKey);
      if (textFullPath.startsWith(TEXT_STORAGE_ROOT)) {
        await fs.writeFile(textFullPath, result.text, 'utf8');
        return {
          resumeStatus: 'TEXT_EXTRACTED',
          extractedTextReference: textRelKey,
          extractedCharCount: result.text.length,
        };
      }
    }

    return {
      resumeStatus: result.status,
      extractedTextReference: null,
      extractedCharCount: 0,
    };
  } catch {
    return {
      resumeStatus: 'FAILED',
      extractedTextReference: null,
      extractedCharCount: 0,
    };
  }
}

function parseBase64Payload(input, providedMimeType, fileName) {
  if (!input || typeof input !== 'string') {
    throw new ApiError(400, 'Resume file content is required', 'INVALID_RESUME_CONTENT');
  }

  const extFromName = fileName ? path.extname(String(fileName)).toLowerCase() : '';
  if (extFromName && !EXT_TO_MIME[extFromName]) {
    throw new ApiError(
      400,
      `Unsupported file extension "${extFromName}". Only .pdf, .doc, and .docx are allowed.`,
      'UNSUPPORTED_FILE_EXTENSION'
    );
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
    if (extractedMime && ALLOWED_FORMATS[extractedMime]) {
      mimeType = extractedMime;
    }
    base64Data = base64Data.slice(commaIdx + 1);
  }

  if ((!mimeType || !ALLOWED_FORMATS[mimeType]) && extFromName) {
    mimeType = EXT_TO_MIME[extFromName] || '';
  }

  const formatSpec = ALLOWED_FORMATS[mimeType];
  if (!formatSpec) {
    throw new ApiError(
      400,
      'Unsupported resume format. Please upload a PDF, DOC, or DOCX file.',
      'UNSUPPORTED_RESUME_FORMAT'
    );
  }

  // Verify extension matches declared MIME type if an extension was provided
  if (extFromName && extFromName !== formatSpec.ext) {
    throw new ApiError(
      400,
      `File extension (${extFromName}) does not match declared MIME type (${mimeType})`,
      'EXTENSION_MIME_MISMATCH'
    );
  }

  const buffer = Buffer.from(base64Data, 'base64');
  if (!buffer || buffer.length === 0) {
    throw new ApiError(400, 'Uploaded resume file is empty', 'EMPTY_RESUME_FILE');
  }

  if (buffer.length > MAX_RESUME_BYTES) {
    throw new ApiError(
      400,
      `Resume file size exceeds the ${maxMb} MB maximum limit`,
      'RESUME_FILE_TOO_LARGE'
    );
  }

  if (!formatSpec.checkSignature(buffer)) {
    throw new ApiError(
      400,
      'Uploaded file signature does not match a valid PDF, DOC, or DOCX document',
      'INVALID_RESUME_SIGNATURE'
    );
  }

  if (!formatSpec.checkStructure(buffer)) {
    throw new ApiError(
      400,
      'Uploaded document appears to be corrupted or incomplete',
      'CORRUPTED_RESUME_DOCUMENT'
    );
  }

  return {
    buffer,
    mimeType,
    ext: formatSpec.ext,
    fileType: formatSpec.fileType,
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

  const uniqueBase = crypto.randomUUID();
  const storedFileName = `${uniqueBase}${parsed.ext}`;
  const resumeKey = `${userId}/${storedFileName}`;
  const fullPath = path.resolve(STORAGE_ROOT, resumeKey);

  if (!fullPath.startsWith(STORAGE_ROOT)) {
    throw new ApiError(400, 'Invalid resume storage key', 'INVALID_STORAGE_KEY');
  }

  await fs.writeFile(fullPath, parsed.buffer);

  const textProcessing = await processDocumentText({
    userId,
    uniqueBase,
    fileType: parsed.fileType,
    buffer: parsed.buffer,
  });

  return {
    resumeKey,
    storageKey: resumeKey,
    storedFileName,
    originalFileName: parsed.safeFileName,
    resumeFileName: parsed.safeFileName,
    fileType: parsed.fileType,
    mimeType: parsed.mimeType,
    resumeMimeType: parsed.mimeType,
    fileSize: parsed.fileSize,
    resumeFileSize: parsed.fileSize,
    resumeStatus: textProcessing.resumeStatus,
    extractedTextReference: textProcessing.extractedTextReference,
    extractedCharCount: textProcessing.extractedCharCount,
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

exports.readExtractedText = async (extractedTextReference) => {
  if (!extractedTextReference || typeof extractedTextReference !== 'string') {
    return null;
  }
  const normalizedRel = extractedTextReference.replace(/\\/g, '/').replace(/^\/+/, '');
  const fullPath = path.resolve(TEXT_STORAGE_ROOT, normalizedRel);
  if (!fullPath.startsWith(TEXT_STORAGE_ROOT + path.sep)) {
    return null;
  }
  try {
    return await fs.readFile(fullPath, 'utf8');
  } catch {
    return null;
  }
};

exports.deleteResumeFileIfExists = async (resumeKey, extractedTextReference = null) => {
  if (resumeKey && typeof resumeKey === 'string') {
    const normalizedRel = resumeKey.replace(/\\/g, '/').replace(/^\/+/, '');
    const fullPath = path.resolve(STORAGE_ROOT, normalizedRel);
    if (fullPath.startsWith(STORAGE_ROOT + path.sep)) {
      try {
        await fs.unlink(fullPath);
      } catch {
        // Ignore if already deleted
      }
    }
  }
  if (extractedTextReference && typeof extractedTextReference === 'string') {
    const normalizedTextRel = extractedTextReference.replace(/\\/g, '/').replace(/^\/+/, '');
    const fullTextPath = path.resolve(TEXT_STORAGE_ROOT, normalizedTextRel);
    if (fullTextPath.startsWith(TEXT_STORAGE_ROOT + path.sep)) {
      try {
        await fs.unlink(fullTextPath);
      } catch {
        // Ignore
      }
    }
  }
};

exports.MAX_RESUME_BYTES = MAX_RESUME_BYTES;
