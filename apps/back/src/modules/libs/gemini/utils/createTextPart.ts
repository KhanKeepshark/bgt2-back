import type { Part } from '@google/genai';

export const createTextPart = (text: string): Part => ({
  text,
});
