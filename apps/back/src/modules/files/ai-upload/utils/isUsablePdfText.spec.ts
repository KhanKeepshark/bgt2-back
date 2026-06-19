import { isUsablePdfText } from './isUsablePdfText';

describe('isUsablePdfText', () => {
  it('accepts text with amount and date patterns', () => {
    const text = `${'x'.repeat(200)}\n100.50 2025-01-15 Kaspi payment`;
    expect(isUsablePdfText(text)).toBe(true);
  });

  it('rejects short text', () => {
    expect(isUsablePdfText('100.50 2025-01-15')).toBe(false);
  });

  it('rejects text without financial markers', () => {
    expect(isUsablePdfText('lorem ipsum '.repeat(30))).toBe(false);
  });
});
