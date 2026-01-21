import { Part } from "@google/genai";

export const createFilePart = (buffer: Buffer, mimetype: string): Part => {
    return {
        inlineData: {
            data: buffer.toString('base64'), // Кодирование буфера в Base64
            mimeType: mimetype,
        },
    };
}