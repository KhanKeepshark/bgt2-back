const MIN_TEXT_LENGTH = 200;
const AMOUNT_PATTERN = /\d+[.,]\d{2}|\b\d{3,}\b/;
const DATE_PATTERN = /\d{4}-\d{2}-\d{2}|\d{1,2}[./-]\d{1,2}[./-]\d{2,4}/;

export const isUsablePdfText = (text: string): boolean => {
  const trimmed = text.trim();
  if (trimmed.length < MIN_TEXT_LENGTH) {
    return false;
  }

  return AMOUNT_PATTERN.test(trimmed) && DATE_PATTERN.test(trimmed);
};
