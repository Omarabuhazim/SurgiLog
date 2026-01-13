
import { GoogleGenAI } from "@google/genai";

// Global cooldown state to prevent hammering the API after a 429
let cooldownUntil = 0;
let isApiAvailable = true; // Track if API is permanently disabled due to 403/Missing Key

export const getCooldownRemaining = (): number => {
  if (!isApiAvailable) return 999999; // API disabled
  const now = Date.now();
  return Math.max(0, Math.ceil((cooldownUntil - now) / 1000));
};

async function checkCooldown() {
  if (!isApiAvailable) throw new Error("API_DISABLED");
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
  
  // Early check for API Key
  if (!process.env.API_KEY) {
    console.warn("SurgiLog: Gemini API Key is missing. AI features disabled.");
    isApiAvailable = false;
    throw new Error("MISSING_KEY");
  }
  
  try {
    return await fn();
  } catch (error: any) {
    const errorMsg = error?.message || "";
    const status = error?.status;

    // Handle Rate Limiting (429)
    if (errorMsg.includes('429') || status === 429 || errorMsg.includes('RESOURCE_EXHAUSTED')) {
      setCooldown(45);
      throw new Error("429: API Quota exhausted. Switching to manual mode.");
    }

    // Handle Permission Issues (403, 400 with invalid key)
    if (errorMsg.includes('403') || status === 403 || errorMsg.includes('PermissionDenied') || errorMsg.includes('API key not valid')) {
      console.warn("SurgiLog: Gemini API Permission Denied. Disabling AI features. Please check your API key and enable the Generative Language API.");
      isApiAvailable = false;
      throw new Error("PERMISSION_DENIED");
    }

    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
      return withRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

export const scanPatientId = async (base64Image: string): Promise<string | null> => {
  if (!isApiAvailable) return null;
  
  return withRetry(async () => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
          parts: [
            { 
              text: `You are a medical scanner assistant.
              
              Task: Extract the Patient ID / MRN from the image.
              
              Priorities:
              1. BARCODE: If you see a barcode (linear or 2D) that represents a number/ID, decipher it if possible.
              2. TEXT: If no barcode is readable, look for text labels: "MRN", "Unit No", "ID", "URN", "Patient ID".
              
              Output Rules:
              - Return ONLY the alphanumeric code.
              - Remove labels like "MRN:", "ID:", "Barcode:".
              - Remove spaces/dashes unless part of the ID format.
              - If multiple numbers exist, prefer the one near a barcode or labeled MRN.
              - If uncertain, return 'null'.` 
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
      
      // Secondary cleaning
      return result.split('\n')[0].replace(/^(MRN|ID|PID|PT|ID:):?\s*/i, '').trim();
    } catch (error: any) {
      if (error.message === 'PERMISSION_DENIED' || error.message === 'MISSING_KEY') return null;
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
  if (!isApiAvailable) return [];
  if (getCooldownRemaining() > 0) return [];
  
  try {
    return await withRetry(async () => {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
          parts: [{ text: `User input: "${query}"
          
          TASK: Autocomplete professional surgical procedure names.
          
          CRITICAL RULES:
          1. Expand abbreviations (e.g., "Lap Chole" -> "Laparoscopic Cholecystectomy").
          2. Prioritize MODALITIES: Laparoscopic, Robotic, Open, Thoracoscopic, Endoscopic.
          3. Return EXACTLY 5 distinct options.
          4. Format: Plain text, one per line. No numbering.

          Example Input: "Appen"
          Example Output:
          Laparoscopic Appendectomy
          Open Appendectomy
          Robotic Appendectomy
          Appendectomy with Drainage
          Interval Appendectomy` }]
        },
        config: {
          temperature: 0.2,
        }
      });
      return response.text?.split('\n').filter(p => p.trim() && p.length > 3).map(p => p.replace(/^\d+\.\s*/, '').trim()) || [];
    }, 0, 0);
  } catch (error) {
    // Silently fail for autocomplete to avoid UI disruption
    return [];
  }
};
