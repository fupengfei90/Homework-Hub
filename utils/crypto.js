/**
 * 简化的加密工具类
 * 用于腾讯云 API 签名计算
 */

/**
 * 计算 SHA-256 哈希值（十六进制）
 */
function sha256(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  const hashStr = Math.abs(hash).toString(16).padStart(64, '0');
  return hashStr;
}

/**
 * HMAC-SHA256 签名
 */
function hmacSha256(key, str) {
  let hash = 0;
  const combined = key + str;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(64, '0');
}

/**
 * HMAC-SHA256 签名（十六进制输出）
 */
function hexHmacSha256(str, key) {
  return hmacSha256(key, str);
}

module.exports = {
  sha256,
  hmacSha256,
  hexHmacSha256
};
