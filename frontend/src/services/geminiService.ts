/**
 * src/services/geminiService.ts
 * Google Gemini API Integration for Sanjeevani (संजीवनी) - Plexus GraphDB AI Copilot
 */

import { RouteGraphDatabase } from '../lib/graphDb';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'bot' | 'system';
  text: string;
  timestamp: string;
  isSpoken?: boolean;
}

const STORAGE_KEY = 'plexus_gemini_api_key';

// Default Gemini API key fallback (loaded from environment or storage)
export const DEFAULT_GEMINI_KEY = '';

/**
 * Returns the currently active Gemini API key from localStorage, env, or window
 */
export function getGeminiApiKey(): string {
  if (typeof window === 'undefined') return '';
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && stored.trim().length > 0) return stored.trim();

  // Vite environment variable fallback (e.g. from .env.local)
  try {
    const envKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;
    if (envKey) return String(envKey).trim();
  } catch {
    // Ignore env read error
  }

  // Window global fallback
  if ((window as any).GEMINI_API_KEY) {
    return String((window as any).GEMINI_API_KEY).trim();
  }

  return '';
}

/**
 * Stores the user's Gemini API key in localStorage
 */
export function setGeminiApiKey(key: string): void {
  if (typeof window === 'undefined') return;
  const clean = key.trim();
  if (!clean) {
    localStorage.removeItem(STORAGE_KEY);
  } else {
    localStorage.setItem(STORAGE_KEY, clean);
  }
}

/**
 * Checks whether a valid Gemini API key is configured
 */
export function hasGeminiApiKey(): boolean {
  const key = getGeminiApiKey();
  return typeof key === 'string' && key.length > 10;
}

/**
 * Executes a query with Google Gemini AI strictly grounded in Plexus GraphDB data
 */
export async function askGeminiGraphCopilot(
  userQuery: string,
  history: ChatMessage[],
  graphDb: RouteGraphDatabase
): Promise<{ reply: string; usedGemini: boolean }> {
  const apiKey = getGeminiApiKey();

  // If no Gemini API key is available, use GraphDB native graph reasoning
  if (!apiKey) {
    const localReply = graphDb.evaluateLocalRuleQuery(userQuery);
    return {
      reply: localReply,
      usedGemini: false,
    };
  }

  // Construct comprehensive GraphDB contextual snapshot
  const graphContext = graphDb.exportGraphSnapshotAsContext();

  const systemInstructionText = `You are "Sanjeevani" (संजीवनी), the autonomous clinical logistics intelligence companion for the Plexus Delhi-NCR emergency platelet mesh.

STRICT GROUNDING & ACCURACY INSTRUCTIONS:
1. You MUST strictly and exclusively base your reasoning, hospital status, stock numbers, shortages, surpluses, transfer orders, cold-chain readings, and donor recommendations on the live GraphDB dataset provided below.
2. Do not invent, hallucinate, or alter any numbers, hospital codes, or active courier states. If a hospital is in deficit, state its exact net balance and target from the dataset.
3. Platelets have an ultra-short 5-day (120-hour) shelf life. Mechanical agitation is mandatory. The safe transit cold-chain temperature band is strictly 20.0°C to 24.0°C.
4. Level-1 Apex Trauma facilities (e.g. AIIMS Trauma [AIM], Safdarjung [SFD], RML [RML]) take absolute priority during emergencies.
5. Format your answers clearly with markdown bullet points, bold key figures (units, ETA in minutes, distance in km), and actionable advice for dispatch operators.

Live Plexus Route GraphDB Dataset:
${graphContext}`;

  // Build message sequence
  const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

  // Add recent conversation history for multi-turn dialogue (skipping any truncated messages)
  const recentHistory = history.slice(-4);
  for (const msg of recentHistory) {
    if (msg.sender === 'user') {
      contents.push({ role: 'user', parts: [{ text: msg.text }] });
    } else if (msg.sender === 'bot') {
      const cleanText = msg.text.replace(/\*\([^\)]+\)\*/g, '').trim();
      // Only include complete previous bot turns
      if (cleanText && cleanText.length > 20 && !cleanText.endsWith('-')) {
        contents.push({ role: 'model', parts: [{ text: cleanText }] });
      }
    }
  }

  // Append user's current query
  contents.push({
    role: 'user',
    parts: [{ text: userQuery }],
  });

  // Candidate models supported for this key
  const modelCandidates = ['gemini-3.5-flash', 'gemini-3.5-flash-lite', 'gemini-flash-latest'];

  for (const model of modelCandidates) {
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: systemInstructionText }],
          },
          contents,
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 2048,
            thinkingConfig: { thinkingBudget: 0 },
            topP: 0.85,
          },
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        console.warn(`[Sanjeevani AI] ${model} returned:`, errJson?.error?.message || response.status);
        continue; // Try next candidate model
      }

      const data = await response.json();
      const parts = data?.candidates?.[0]?.content?.parts || [];
      const candidateText = parts
        .map((p: any) => p.text || '')
        .filter((t: string) => t.trim().length > 0)
        .join('\n\n');

      if (candidateText && candidateText.trim().length > 0) {
        return {
          reply: candidateText.trim(),
          usedGemini: true,
        };
      }
    } catch (fetchErr) {
      console.warn(`[Sanjeevani AI] Network issue with ${model}:`, fetchErr);
    }
  }

  // If network calls fail, use GraphDB local engine fallback
  const fallbackReply = graphDb.evaluateLocalRuleQuery(userQuery);
  return {
    reply: fallbackReply,
    usedGemini: false,
  };
}
