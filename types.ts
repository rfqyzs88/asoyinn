
export enum VoiceName {
  Kore = 'Kore',
  Puck = 'Puck',
  Charon = 'Charon',
  Fenrir = 'Fenrir',
  Zephyr = 'Zephyr'
}

export enum Emotion {
  Neutral = 'Neutral',
  Cheerful = 'Cheerful',
  Professional = 'Professional',
  Serious = 'Serious',
  Dramatic = 'Dramatic',
  Conversational = 'Conversational'
}

export interface VoiceMetadata {
  language: string;
  accent: string;
  gender_style: string;
  pace_wpm: number;
  pitch: string;
  energy: string;
  room_tone: string;
  noise_floor: string;
  de_esser: string;
  limiter: string;
  loudness_target_lufs: number;
  file_format: string;
  duration_estimate_sec: number;
}

export interface VoiceTake {
  id: string; // V{stack}-T{take}
  fileName: string;
  audioBuffer: AudioBuffer | null;
  metadata: VoiceMetadata | null;
  styleDescription: string;
  timestamp: number;
}

export interface VoiceStack {
  stackId: string; // V{stack}
  takes: VoiceTake[];
  prompt: string;
  voice: VoiceName;
  emotion: Emotion;
  expression: string;
  timestamp: number;
}

export interface BackgroundPlan {
  totalStacksPlanned: number;
  remainingStacks: number;
  takesPerStack: number;
}

export interface VoiceStackManifest {
  sessionStarted: number;
  totalStacks: number;
  stacks: VoiceStack[];
  resume_token?: string | null;
  next_plan?: BackgroundPlan | null;
  background_sim_active: boolean;
}
