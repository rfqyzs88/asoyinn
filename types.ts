
export enum VoiceName {
  Kore = 'Kore',
  Puck = 'Puck',
  Charon = 'Charon',
  Kasper = 'Kasper',
  Fenrir = 'Fenrir',
  Aoede = 'Aoede'
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
  audioBuffer: AudioBuffer | null;
  metadata: VoiceMetadata | null;
  styleDescription: string;
}

export interface GenerationResult {
  take1: VoiceTake;
  take2: VoiceTake;
}
