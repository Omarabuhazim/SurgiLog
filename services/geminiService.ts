
import { GoogleGenAI } from "@google/genai";

// Global cooldown state to prevent hammering the API after a 429
let cooldownUntil = 0;

export const getCooldownRemaining = (): number => {
  const now = Date.now();
  return Math.max(0, Math.ceil((cooldownUntil - now) / 1000));
};

async function checkCooldown() {
  const remaining = getCooldownRemaining();
  if (remaining > 0) {
    throw new Error(`429: AI service is cooling down. Please wait ${remaining}s.`);
  }
}

function setCooldown(seconds: number) {
  cooldownUntil = Date.now() + (seconds * 1000);
}

// Helper for exponential backoff retry logic
async function withRetry<T>(fn: () => Promise<T>, retries = 2, delay = 2000): Promise<T> {
  await checkCooldown();
  
  try {
    return await fn();
  } catch (error: any) {
    const errorMsg = error?.message || "";
    const isRateLimit = errorMsg.includes('429') || error?.status === 429 || errorMsg.includes('RESOURCE_EXHAUSTED');
    
    if (isRateLimit) {
      setCooldown(45);
      throw new Error("429: API Quota exhausted. Switching to manual mode.");
    }

    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
      return withRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

export const scanPatientId = async (base64Image: string): Promise<string | null> => {
  return withRetry(async () => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
          parts: [
            { 
              text: `Act as a precision medical scanner. Your primary goal is to extract a Patient MRN or decode a Linear Barcode from a hospital wristband.
              
              INSTRUCTIONS:
              1. LINEAR BARCODES: Carefully look for thin vertical black lines. Decode the alphanumeric value they represent (Code 128/39).
              2. TEXT OCR: Look for labels like "MRN", "ID", "Patient ID", or "URN". 
              3. FORMAT: IDs are typically 6-12 digits or alphanumeric (e.g., 1234567, ABC123456).
              
              STRICT OUTPUT:
              - Return ONLY the raw alphanumeric ID.
              - No prefix, no labels, no punctuation.
              - If not absolutely certain, return 'null'.` 
            },
            { inlineData: { mimeType: 'image/jpeg', data: base64Image } }
          ]
        },
        config: {
          temperature: 0,
          thinkingConfig: { thinkingBudget: 0 }
        }
      });

      const result = response.text?.trim() || 'null';
      if (result.toLowerCase() === 'null' || result.length < 2) return null;
      
      // Secondary cleaning of common AI hallucinated prefixes
      return result.split('\n')[0].replace(/^(MRN|ID|PID|PT|ID:):?\s*/i, '').trim();
    } catch (error: any) {
      if (error.message?.includes('429') || error.message?.includes('RESOURCE_EXHAUSTED')) {
        throw error;
      }
      console.error("Scanning error:", error);
      return null;
    }
  });
};

export const suggestProcedures = async (query: string): Promise<string[]> => {
  if (!query || query.length < 3) return [];
  if (getCooldownRemaining() > 0) return [];
  
  try {
    return await withRetry(async () => {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
          parts: [{ text: `List exactly 5 professional surgical procedures starting with or containing: "${query}". 
          Format: "Standard medical name" (e.g., "Laparoscopic Cholecystectomy"). 
          No numbers, no bullets, one per line.` }]
        },
        config: {
          temperature: 0.1,
        }
      });
      return response.text?.split('\n').filter(p => p.trim() && p.length > 3).map(p => p.replace(/^\d+\.\s*/, '').trim()) || [];
    }, 0, 0);
  } catch (error) {
    return [];
  }
};
