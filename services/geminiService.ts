
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
      // If we hit a rate limit, set a global cooldown
      setCooldown(45); // 45 second global block for aggressive throttling
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
              text: `Act as a specialized medical scanner. Your task is to decode linear barcodes (Code 128, Code 39) or extract the Patient MRN from the image.
              
              PRIORITY:
              1. Decode any linear barcode into its alphanumeric string representation.
              2. Find high-contrast Patient ID strings (usually 6-12 digits).
              
              OUTPUT RULES:
              - Return ONLY the decoded value.
              - No labels, no prefixes (no 'MRN:', no 'ID:').
              - If none found, return 'null'.` 
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
      
      return result.split('\n')[0].replace(/^(MRN|ID|PID|PT|ID:):?\s*/i, '').trim();
    } catch (error: any) {
      if (error.message?.includes('429') || error.message?.includes('RESOURCE_EXHAUSTED')) {
        throw error;
      }
      console.error("Scanning error details:", error);
      return null;
    }
  });
};

export const suggestProcedures = async (query: string): Promise<string[]> => {
  if (!query || query.length < 3) return [];
  
  // Silent check for suggestions to avoid throwing errors during background typing
  if (getCooldownRemaining() > 0) {
    return [];
  }
  
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
          temperature: 0.1, // More precise
        }
      });
      return response.text?.split('\n').filter(p => p.trim() && p.length > 3).map(p => p.replace(/^\d+\.\s*/, '').trim()) || [];
    }, 0, 0); // No retries for autocomplete suggestions to save quota
  } catch (error) {
    // Silently consume suggestion errors (mostly 429s) to keep UX clean
    return [];
  }
};
