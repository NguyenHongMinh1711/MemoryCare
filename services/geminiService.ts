
import { GoogleGenAI, GenerateContentResponse, Chat } from "@google/genai";
import { GEMINI_TEXT_MODEL } from '../constants';
import { GroundingChunk } from "../types";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.error("API_KEY for Gemini is not set. Please ensure the process.env.API_KEY environment variable is configured.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY || "MISSING_API_KEY" }); // Fallback to prevent crash if key is missing

export const generateText = async (prompt: string, systemInstruction?: string): Promise<string> => {
  if (!API_KEY) return "API Key for Gemini is not configured.";
  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: GEMINI_TEXT_MODEL,
      contents: prompt,
      config: systemInstruction ? { systemInstruction } : undefined,
    });
    return response.text;
  } catch (error) {
    console.error("Error generating text with Gemini:", error);
    return `Error: Could not generate text. ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
};

export const generateTextWithGoogleSearch = async (prompt: string): Promise<{text: string, sources: GroundingChunk[]}> => {
  if (!API_KEY) return {text: "API Key for Gemini is not configured.", sources: []};
  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: GEMINI_TEXT_MODEL,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });
    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    return {text: response.text, sources: sources as GroundingChunk[]}; // Type assertion
  } catch (error) {
    console.error("Error generating text with Google Search & Gemini:", error);
    return {text: `Error: Could not generate text. ${error instanceof Error ? error.message : 'Unknown error'}`, sources: []};
  }
};


let chatInstance: Chat | null = null;

export const startOrGetChat = (systemInstruction?: string): Chat => {
  if (!API_KEY) {
    // This is a simplified error handling. In a real app, you might throw or handle more gracefully.
    console.error("API Key for Gemini is not configured. Chat functionality will be impaired.");
    // Return a mock chat or throw, depending on desired behavior. Here, we allow it to proceed but it will fail later.
  }
  if (!chatInstance) {
     chatInstance = ai.chats.create({
        model: GEMINI_TEXT_MODEL,
        config: systemInstruction ? { systemInstruction } : undefined,
     });
  }
  return chatInstance;
};

export const sendMessageInChat = async (message: string, systemInstruction?: string): Promise<string> => {
  if (!API_KEY) return "API Key for Gemini is not configured.";
  try {
    const chat = startOrGetChat(systemInstruction);
    const response: GenerateContentResponse = await chat.sendMessage({ message });
    return response.text;
  } catch (error) {
    console.error("Error sending message in chat with Gemini:", error);
    return `Error: Could not send message. ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
};

export const streamMessageInChat = async (
  message: string,
  onChunk: (chunkText: string) => void,
  systemInstruction?: string
): Promise<void> => {
  if (!API_KEY) {
    onChunk("API Key for Gemini is not configured.");
    return;
  }
  try {
    const chat = startOrGetChat(systemInstruction);
    const responseStream = await chat.sendMessageStream({ message });
    for await (const chunk of responseStream) {
      onChunk(chunk.text);
    }
  } catch (error) {
    console.error("Error streaming message in chat with Gemini:", error);
    onChunk(`Error: Could not stream message. ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Helper to parse JSON, potentially cleaning markdown fences
export const parseJsonFromGeminiResponse = <T,>(textResponse: string): T | null => {
  let jsonStr = textResponse.trim();
  const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
  const match = jsonStr.match(fenceRegex);
  if (match && match[2]) {
    jsonStr = match[2].trim();
  }
  try {
    return JSON.parse(jsonStr) as T;
  } catch (e) {
    console.error("Failed to parse JSON response:", e, "Original text:", textResponse);
    return null;
  }
};
