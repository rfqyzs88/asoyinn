
import React, { useState, useRef, useEffect } from 'react';
import { GeminiService } from '../services/geminiService';
import { VoiceName, Emotion, GenerationResult, VoiceMetadata, VoiceTake } from '../types';
import { Play, Square, Download, Activity, Music, Settings, Info, Loader2, Sparkles, Volume2, ListChecks } from 'lucide-react';

const gemini = new GeminiService();

const VOICE_OPTIONS = [
  { name: VoiceName.Kore, description: 'Male, deep, professional', icon: '👨‍💼' },
  { name: VoiceName.Puck, description: 'Female, energetic, bright', icon: '👩‍🎤' },
  { name: VoiceName.Charon, description: 'Male, warm, narrative', icon: '🎙️' },
  { name: VoiceName.Fenrir, description: 'Male, authoritative, clear', icon: '🏛️' },
  { name: VoiceName.Aoede, description: 'Female, soft, instructional', icon: '📚' },
];

const EMOTIONS = Object.values(Emotion);

export const VoiceStudio: React.FC = () => {
  const [text, setText] = useState('Selamat datang di Vocalis Pro. Mesin suara profesional untuk kebutuhan iklan dan edukasi Anda. Suara kami terdengar natural, jernih, dan penuh emosi.');
  const [selectedVoice, setSelectedVoice] = useState<VoiceName>(VoiceName.Kore);
  const [selectedEmotion, setSelectedEmotion] = useState<Emotion>(Emotion.Professional);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState('');
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [activeSource, setActiveSource] = useState<AudioBufferSourceNode | null>(null);
  const [isPlaying, setIsPlaying] = useState<'take1' | 'take2' | null>(null);

  const stopAudio = () => {
    if (activeSource) {
      activeSource.stop();
      setActiveSource(null);
      setIsPlaying(null);
    }
  };

  const playAudio = (buffer: AudioBuffer, take: 'take1' | 'take2') => {
    stopAudio();
    const ctx = gemini.getAudioContext();
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.onended = () => setIsPlaying(null);
    source.start();
    setActiveSource(source);
    setIsPlaying(take);
  };

  const handleGenerate = async () => {
    if (!text.trim()) return;
    setIsGenerating(true);
    setResult(null);

    try {
      // PROSES SEKUENSIAL (SEQUENCE GENERATION)
      
      // Tahap 1: Metadata Take 1
      setGenerationStatus('Tahap 1/4: Menganalisis Metadata Take 1...');
      const meta1 = await gemini.generateMetadata(text, selectedVoice, selectedEmotion);
      
      // Tahap 2: Audio Take 1
      setGenerationStatus('Tahap 2/4: Mensintesis Audio Take 1 (Studio Standard)...');
      const audio1 = await gemini.generateTTS(text, selectedVoice, selectedEmotion, "standard high-quality studio");
      
      // Tahap 3: Metadata Take 2
      setGenerationStatus('Tahap 3/4: Menyiapkan Alternatif Take 2...');
      const meta2 = await gemini.generateMetadata(text, selectedVoice, selectedEmotion);
      
      // Tahap 4: Audio Take 2
      setGenerationStatus('Tahap 4/4: Mensintesis Audio Take 2 (Conversational)...');
      const audio2 = await gemini.generateTTS(text, selectedVoice, selectedEmotion, "more conversational and dynamic alternate version");

      setResult({
        take1: { audioBuffer: audio1, metadata: meta1, styleDescription: "Take 1: Primary Style (Studio Standard)" },
        take2: { audioBuffer: audio2, metadata: meta2, styleDescription: "Take 2: Alternative Interpretation (Conversational)" },
      });
      
      setGenerationStatus('');
    } catch (error) {
      console.error("Generation failed", error);
      alert("Terjadi kesalahan saat generate audio. Pastikan API key Anda valid.");
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadAudio = (buffer: AudioBuffer, filename: string) => {
    const length = buffer.length * 2;
    const arrayBuffer = new ArrayBuffer(44 + length);
    const view = new DataView(arrayBuffer);

    const writeString = (view: DataView, offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(view, 0, 'RIFF');
    view.setUint32(4, 32 + length, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, buffer.sampleRate, true);
    view.setUint32(28, buffer.sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(view, 36, 'data');
    view.setUint32(40, length, true);

    const channel = buffer.getChannelData(0);
    let offset = 44;
    for (let i = 0; i < channel.length; i++, offset += 2) {
      const s = Math.max(-1, Math.min(1, channel[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }

    const blob = new Blob([view], { type: 'audio/wav' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold gradient-text">Vocalis Pro</h1>
          <p className="text-slate-400 mt-1">Professional Indonesian Voice Engine & Synthesis</p>
        </div>
        <div className="flex gap-2 bg-slate-800/50 p-1 rounded-lg border border-slate-700">
            <div className="px-3 py-1 flex items-center gap-2 text-xs font-mono text-blue-400">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                SYSTEM ACTIVE: SEQUENTIAL-GEN-V2
            </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Input Panel */}
        <section className="lg:col-span-7 space-y-6">
          <div className="glass rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2 text-slate-300 font-semibold mb-2">
              <Sparkles className="w-5 h-5 text-blue-400" />
              Script Editor
            </div>
            <textarea
              className="w-full h-48 bg-slate-900/50 border border-slate-700 rounded-xl p-4 text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none"
              placeholder="Masukkan teks iklan atau edukasi Anda di sini..."
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <div className="flex justify-between items-center text-xs text-slate-500 font-mono">
              <span>{text.length} CHARACTERS</span>
              <span>INDONESIAN (ID-ID)</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Voice Selector */}
            <div className="glass rounded-2xl p-6 space-y-4">
              <label className="flex items-center gap-2 text-slate-300 font-semibold">
                <Music className="w-5 h-5 text-purple-400" />
                Select Voice
              </label>
              <div className="grid grid-cols-1 gap-2">
                {VOICE_OPTIONS.map((v) => (
                  <button
                    key={v.name}
                    onClick={() => setSelectedVoice(v.name)}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                      selectedVoice === v.name
                        ? 'bg-blue-600/20 border-blue-500 text-blue-100 neon-blue'
                        : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-500'
                    }`}
                  >
                    <span className="text-2xl">{v.icon}</span>
                    <div className="text-left">
                      <div className="font-medium">{v.name}</div>
                      <div className="text-[10px] opacity-60 uppercase tracking-wider">{v.description}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Emotion Selector */}
            <div className="glass rounded-2xl p-6 space-y-4">
              <label className="flex items-center gap-2 text-slate-300 font-semibold">
                <Volume2 className="w-5 h-5 text-pink-400" />
                Mood & Intonation
              </label>
              <div className="grid grid-cols-2 gap-2">
                {EMOTIONS.map((e) => (
                  <button
                    key={e}
                    onClick={() => setSelectedEmotion(e)}
                    className={`p-3 rounded-xl border text-sm transition-all ${
                      selectedEmotion === e
                        ? 'bg-pink-600/20 border-pink-500 text-pink-100'
                        : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-500'
                    }`}
                  >
                    {e}
                  </button>
                ))}
              </div>
              <div className="pt-4 space-y-2">
                 <div className="flex items-center justify-between text-xs text-slate-400">
                   <span>Sequence Optimization</span>
                   <span className="text-blue-400">ENABLED</span>
                 </div>
                 <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-blue-500 h-full w-full"></div>
                 </div>
              </div>
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={isGenerating || !text.trim()}
            className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold rounded-2xl shadow-lg transition-all transform active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                Processing Sequence...
              </>
            ) : (
              <>
                <ListChecks className="w-6 h-6" />
                RUN SEQUENTIAL GENERATION
              </>
            )}
          </button>
        </section>

        {/* Results Panel */}
        <section className="lg:col-span-5 space-y-6">
          {!result && !isGenerating && (
            <div className="glass rounded-2xl p-12 flex flex-col items-center justify-center text-center space-y-4 h-full border-dashed border-2 border-slate-700 bg-slate-900/20">
              <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center">
                <Settings className="w-10 h-10 text-slate-600 animate-pulse" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-slate-400">Ready to Sequence</h3>
                <p className="text-sm text-slate-500 max-w-xs">Engine will generate two versions sequentially for maximum precision.</p>
              </div>
            </div>
          )}

          {isGenerating && (
             <div className="glass rounded-2xl p-12 flex flex-col items-center justify-center text-center space-y-6 h-full border-blue-500/30">
                <div className="relative">
                    <div className="w-24 h-24 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Activity className="w-8 h-8 text-blue-500" />
                    </div>
                </div>
                <div className="space-y-3">
                  <h3 className="text-xl font-bold text-blue-400">Audio Synthesis Engine</h3>
                  <div className="bg-slate-900/80 px-4 py-2 rounded-lg border border-slate-700">
                    <p className="text-sm font-mono text-slate-200">{generationStatus}</p>
                  </div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest">Memproses naskah untuk hasil natural...</p>
                </div>
             </div>
          )}

          {result && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
              <TakeCard 
                id="take1" 
                take={result.take1} 
                isPlaying={isPlaying === 'take1'} 
                onPlay={() => result.take1.audioBuffer && playAudio(result.take1.audioBuffer, 'take1')}
                onStop={stopAudio}
                onDownload={() => result.take1.audioBuffer && downloadAudio(result.take1.audioBuffer, 'vocalis-pro-take1.wav')}
              />
              <TakeCard 
                id="take2" 
                take={result.take2} 
                isPlaying={isPlaying === 'take2'} 
                onPlay={() => result.take2.audioBuffer && playAudio(result.take2.audioBuffer, 'take2')}
                onStop={stopAudio}
                onDownload={() => result.take2.audioBuffer && downloadAudio(result.take2.audioBuffer, 'vocalis-pro-take2.wav')}
              />
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

interface TakeCardProps {
  id: string;
  take: any;
  isPlaying: boolean;
  onPlay: () => void;
  onStop: () => void;
  onDownload: () => void;
}

const TakeCard: React.FC<TakeCardProps> = ({ id, take, isPlaying, onPlay, onStop, onDownload }) => {
  const metadata = take.metadata as VoiceMetadata;
  
  return (
    <div className="glass rounded-2xl overflow-hidden border-l-4 border-l-blue-500">
      <div className="p-4 bg-slate-800/30 border-b border-slate-700 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-green-500 animate-ping' : 'bg-slate-500'}`}></div>
          <span className="text-sm font-bold text-slate-200">{take.styleDescription}</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onDownload} title="Download WAV" className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 transition-colors">
            <Download className="w-4 h-4" />
          </button>
          <button className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 transition-colors">
            <Info className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={isPlaying ? onStop : onPlay}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all transform active:scale-90 ${
              isPlaying 
                ? 'bg-red-500/20 text-red-500 border border-red-500/50' 
                : 'bg-blue-600 text-white shadow-lg shadow-blue-900/40'
            }`}
          >
            {isPlaying ? <Square className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-1" />}
          </button>
          <div className="flex-1 space-y-1">
             <div className="h-8 bg-slate-900/50 rounded flex items-center px-3 gap-1 overflow-hidden">
                {Array.from({ length: 40 }).map((_, i) => (
                  <div 
                    key={i} 
                    className={`w-1 rounded-full transition-all duration-300 ${isPlaying ? 'bg-blue-500' : 'bg-slate-700'}`}
                    style={{ 
                        height: isPlaying ? `${Math.random() * 80 + 20}%` : '20%',
                        animationDelay: `${i * 0.05}s`
                    }}
                  ></div>
                ))}
             </div>
             <div className="flex justify-between text-[10px] font-mono text-slate-500 px-1">
                <span>00:00</span>
                <span>{metadata?.duration_estimate_sec?.toFixed(1) || '0.0'}s</span>
             </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-3">
          <MetaItem label="Accent" value={metadata?.accent || '-'} />
          <MetaItem label="Pace" value={`${metadata?.pace_wpm || 0} WPM`} />
          <MetaItem label="Energy" value={metadata?.energy || '-'} />
          <MetaItem label="Loudness" value={`${metadata?.loudness_target_lufs || 0} LUFS`} />
          <MetaItem label="De-esser" value={metadata?.de_esser || '-'} />
          <MetaItem label="Noise Floor" value={metadata?.noise_floor || '-'} />
        </div>
      </div>
    </div>
  );
};

const MetaItem: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex justify-between items-center text-xs">
    <span className="text-slate-500">{label}</span>
    <span className="font-mono text-blue-400 font-medium uppercase">{value}</span>
  </div>
);
