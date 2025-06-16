/**
 * Utility functions for formatting data, especially for cryptographic purposes.
 */

/**
 * Converts a base64 encoded SPKI public key string to PEM format.
 * @param base64Spki The base64 encoded SPKI public key.
 * @returns The public key in PEM format.
 */
export function base64SpkiToPem(base64Spki: string): string {
  if (!base64Spki || typeof base64Spki !== 'string') {
    console.error('[Formatters] base64SpkiToPem: Input must be a non-empty string.');
    // Or throw an error, depending on desired strictness
    // For now, returning a format that will likely fail subsequent crypto ops visibly
    return "INVALID_PUBLIC_KEY_INPUT";
  }
  // Remove any existing line breaks from base64 string, then wrap
  const cleanedBase64 = base64Spki.replace(/\r?\n|\r/g, '');

  // Wrap the base64 string in 64-character lines
  let pemContents = '';
  for (let i = 0; i < cleanedBase64.length; i += 64) {
    pemContents += cleanedBase64.substring(i, Math.min(i + 64, cleanedBase64.length)) + '\n';
  }

  return `-----BEGIN PUBLIC KEY-----\n${pemContents.trim()}\n-----END PUBLIC KEY-----`;
}

/**
 * Converts a PEM formatted key (public or private) to its base64 encoded content.
 * This removes the PEM headers/footers and any line breaks.
 * @param pemKey The key in PEM format.
 * @returns The base64 encoded key content as a single string.
 */
export function pemToBase64(pemKey: string): string {
  if (!pemKey || typeof pemKey !== 'string') {
    console.error('[Formatters] pemToBase64: Input must be a non-empty string.');
    return "INVALID_PEM_KEY_INPUT";
  }
  // Remove header, footer, and line breaks
  const base64Content = pemKey
    .replace(/-----BEGIN PUBLIC KEY-----/g, '')
    .replace(/-----END PUBLIC KEY-----/g, '')
    .replace(/-----BEGIN PRIVATE KEY-----/g, '') // Also handle private key if ever needed by this func
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\r?\n|\r/g, '')
    .trim();
  return base64Content;
}
