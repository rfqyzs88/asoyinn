
import { GoogleGenAI, Modality, Type } from "@google/genai";
import { VoiceName, Emotion, VoiceMetadata } from "../types";

const API_KEY = process.env.API_KEY || "";

// Custom Decode Functions as per guidelines
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export class GeminiService {
  private ai: GoogleGenAI;
  private audioContext: AudioContext;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: API_KEY });
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
  }

  async generateMetadata(text: string, voice: VoiceName, emotion: Emotion, expression: string): Promise<VoiceMetadata> {
    const response = await this.ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analyze this script for Indonesian TTS and generate technical audio metadata. 
      Script: "${text}"
      Voice Profile: ${voice}
      Base Emotion: ${emotion}
      Nuance/Expression: ${expression}
      
      Target: -16 LUFS. Output must be raw JSON matching the schema.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            language: { type: Type.STRING },
            accent: { type: Type.STRING },
            gender_style: { type: Type.STRING },
            pace_wpm: { type: Type.NUMBER },
            pitch: { type: Type.STRING },
            energy: { type: Type.STRING },
            room_tone: { type: Type.STRING },
            noise_floor: { type: Type.STRING },
            de_esser: { type: Type.STRING },
            limiter: { type: Type.STRING },
            loudness_target_lufs: { type: Type.NUMBER },
            file_format: { type: Type.STRING },
            duration_estimate_sec: { type: Type.NUMBER },
          },
          required: ["language", "accent", "gender_style", "pace_wpm", "pitch", "energy", "room_tone", "noise_floor", "de_esser", "limiter", "loudness_target_lufs", "file_format", "duration_estimate_sec"]
        }
      }
    });

    return JSON.parse(response.text.trim());
  }

  async generateTTS(text: string, voice: VoiceName, emotion: Emotion, expression: string, styleNote: string): Promise<AudioBuffer> {
    const prompt = `Act as a professional Indonesian voice actor. 
    Voice: ${voice}. 
    Mood: ${emotion}. 
    Expression/Nuance: ${expression}.
    Additional Style: ${styleNote}.
    
    Performance Instructions:
    - Use natural Indonesian pronunciation (conversational, colloquial where needed, not rigid/formal). 
    - Avoid rhythmic "AI cadence". 
    - Insert micro-pauses at commas and 0.5s pauses at periods. 
    - Add very subtle, natural breaths where appropriate to enhance realism. 
    
    Script to Speak: "${text}"`;

    const response = await this.ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error("No audio data received");

    const bytes = decode(base64Audio);
    return await decodeAudioData(bytes, this.audioContext, 24000, 1);
  }

  getAudioContext() {
    return this.audioContext;
  }
}
