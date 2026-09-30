const crypto = require('crypto');

const randomToken = () => crypto.randomBytes(32).toString('hex');
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

module.exports = { randomToken, sha256 };
