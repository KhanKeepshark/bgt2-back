export const fixEncoding = (str: string): string => {
  // If the string contains characters > 255, it is likely already correctly parsed Unicode
  if (/[^\u0000-\u00FF]/.test(str)) {
    return str;
  }

  try {
    // Try to interpret the string as bytes (Latin-1) and decode as UTF-8
    const decoded = Buffer.from(str, 'binary').toString('utf8');

    // If the result contains replacement characters, the "binary" assumption was probably wrong
    if (decoded.includes('\ufffd')) {
      return str;
    }

    return decoded;
  } catch {
    return str;
  }
};
