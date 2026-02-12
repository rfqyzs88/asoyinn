
import React, { useState, useMemo, useCallback } from 'react';
import { GeminiService } from '../services/geminiService';
import { VoiceName, Emotion, VoiceStack, VoiceTake, VoiceMetadata, VoiceStackManifest, BackgroundPlan } from '../types';
import { Play, Square, Download, Activity, Music, Settings, Info, Loader2, Sparkles, Volume2, ListChecks, History, Code, Trash2, Layers, Zap, PauseCircle, PlayCircle } from 'lucide-react';

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
  
  // Background Simulation States
  const [isBackgroundSim, setIsBackgroundSim] = useState(false);
  const [batchCount, setBatchCount] = useState(2);
  const [takesPerBatch, setTakesPerBatch] = useState(2);
  const [resumeToken, setResumeToken] = useState<string | null>(null);
  const [nextPlan, setNextPlan] = useState<BackgroundPlan | null>(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState('');
  const [stackHistory, setStackHistory] = useState<VoiceStack[]>([]);
  const [activeSource, setActiveSource] = useState<AudioBufferSourceNode | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [showManifest, setShowManifest] = useState(false);

  const manifest: VoiceStackManifest = useMemo(() => ({
    sessionStarted: Date.now(),
    totalStacks: stackHistory.length,
    stacks: stackHistory,
    resume_token: resumeToken,
    next_plan: nextPlan,
    background_sim_active: isBackgroundSim
  }), [stackHistory, resumeToken, nextPlan, isBackgroundSim]);

  const stopAudio = () => {
    if (activeSource) {
      activeSource.stop();
      setActiveSource(null);
      setPlayingId(null);
    }
  };

  const playAudio = (buffer: AudioBuffer, id: string) => {
    stopAudio();
    const ctx = gemini.getAudioContext();
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.onended = () => setPlayingId(null);
    source.start();
    setActiveSource(source);
    setPlayingId(id);
  };

  const generateSingleTake = async (stackId: string, takeIdx: number, style: string): Promise<VoiceTake> => {
    const takeIdStr = takeIdx.toString().padStart(2, '0');
    const fullId = `${stackId}-T${takeIdStr}`;
    
    setGenerationStatus(`[${fullId}] Analyzing Metadata...`);
    const meta = await gemini.generateMetadata(text, selectedVoice, selectedEmotion);
    
    setGenerationStatus(`[${fullId}] Synthesizing Audio (${style})...`);
    const audio = await gemini.generateTTS(text, selectedVoice, selectedEmotion, style);
    
    return {
      id: fullId,
      fileName: `vocalis_${stackId}_T${takeIdStr}.wav`,
      audioBuffer: audio,
      metadata: meta,
      styleDescription: `${takeIdx === 1 ? 'Primary' : 'Alternative'}: ${style}`,
      timestamp: Date.now()
    };
  };

  const handleGenerate = async (isResuming = false) => {
    if (!text.trim()) return;
    setIsGenerating(true);
    
    // Determine starting stack index
    const startStackIdx = stackHistory.length + 1;
    const totalToGenerate = isResuming && nextPlan ? nextPlan.remainingStacks : (isBackgroundSim ? batchCount : 1);
    const takesToGenerate = isResuming && nextPlan ? nextPlan.takesPerStack : (isBackgroundSim ? takesPerBatch : 2);

    try {
      const newStacks: VoiceStack[] = [];

      for (let s = 0; s < totalToGenerate; s++) {
        const currentStackIdx = startStackIdx + s;
        const stackId = `V${currentStackIdx.toString().padStart(2, '0')}`;
        const takes: VoiceTake[] = [];

        for (let t = 1; t <= takesToGenerate; t++) {
          const style = t === 1 ? "standard high-quality studio" : `conversational variation ${t-1}`;
          const take = await generateSingleTake(stackId, t, style);
          takes.push(take);

          // Simulated check for length/limit after each take
          // In a real background scenario, we might hit a timeout or token limit
          // We simulate a stop if s > 0 and we're in background mode randomly or after fixed limit
          if (isBackgroundSim && s === 1 && totalToGenerate > 2 && t === takesToGenerate) {
            const token = `RESUME_${Math.random().toString(36).substring(7).toUpperCase()}`;
            setResumeToken(token);
            setNextPlan({
                totalStacksPlanned: totalToGenerate,
                remainingStacks: totalToGenerate - (s + 1),
                takesPerStack: takesToGenerate
            });
            
            // Append partial progress
            const interruptedStack: VoiceStack = {
                stackId,
                takes,
                prompt: text,
                voice: selectedVoice,
                emotion: selectedEmotion,
                timestamp: Date.now(),
            };
            newStacks.push(interruptedStack);
            setStackHistory(prev => [...newStacks.reverse(), ...prev]);
            setGenerationStatus('BACKGROUND_SIM: Output Limit Reached. Resume Token Issued.');
            setIsGenerating(false);
            return; // Terminate early
          }
        }

        const newStack: VoiceStack = {
          stackId,
          takes,
          prompt: text,
          voice: selectedVoice,
          emotion: selectedEmotion,
          timestamp: Date.now(),
        };
        newStacks.push(newStack);
      }

      // Finalize Batch
      setStackHistory(prev => [...newStacks.reverse(), ...prev]);
      setResumeToken(null);
      setNextPlan(null);
      setGenerationStatus('');
    } catch (error) {
      console.error("Batch Generation failed", error);
      alert("Terjadi kesalahan sistem pada background process.");
    } finally {
      setIsGenerating(false);
    }
  };

  const clearHistory = () => {
    if (confirm("Hapus semua riwayat stack dalam sesi ini?")) {
      setStackHistory([]);
      setResumeToken(null);
      setNextPlan(null);
    }
  };

  const downloadAudio = (buffer: AudioBuffer, filename: string) => {
    const length = buffer.length * 2;
    const arrayBuffer = new ArrayBuffer(44 + length);
    const view = new DataView(arrayBuffer);
    const writeString = (v: DataView, o: number, s: string) => {
      for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i));
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
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Layers className="text-white w-7 h-7" />
          </div>
          <div>
            <h1 className="text-4xl font-bold gradient-text">Vocalis Pro</h1>
            <p className="text-slate-400 mt-1 uppercase text-xs tracking-[0.2em] font-medium">BG_SIM Dynamic Audio Stacker</p>
          </div>
        </div>
        <div className="flex gap-3">
            <button 
              onClick={() => setShowManifest(!showManifest)}
              className="px-4 py-2 glass rounded-xl text-xs font-mono text-blue-400 flex items-center gap-2 hover:bg-blue-500/10 transition-colors"
            >
              <Code className="w-4 h-4" />
              MANIFEST.JSON
            </button>
            <div className={`px-4 py-2 glass rounded-xl flex items-center gap-2 text-xs font-mono transition-colors ${isBackgroundSim ? 'text-purple-400' : 'text-green-400'}`}>
                <span className={`w-2 h-2 rounded-full animate-pulse ${isBackgroundSim ? 'bg-purple-500' : 'bg-green-500'}`}></span>
                {isBackgroundSim ? 'BACKGROUND_SIM ACTIVE' : 'STANDARD_STACK ACTIVE'}
            </div>
        </div>
      </header>

      {showManifest && (
        <div className="glass rounded-2xl p-6 border-blue-500/30 animate-in fade-in zoom-in duration-300">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-bold text-blue-400 font-mono flex items-center gap-2">
              <Code className="w-4 h-4" /> VOICE_STACK_MANIFEST
            </h3>
            <button onClick={() => setShowManifest(false)} className="text-slate-500 hover:text-white">✕</button>
          </div>
          <pre className="bg-slate-950 p-4 rounded-xl text-[10px] text-blue-300/80 overflow-auto max-h-[400px] font-mono border border-slate-800">
            {JSON.stringify(manifest, (key, value) => key === 'audioBuffer' ? '[AudioData]' : value, 2)}
          </pre>
        </div>
      )}

      {resumeToken && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4 animate-pulse">
            <div className="flex items-center gap-4">
                <PauseCircle className="w-8 h-8 text-amber-500" />
                <div>
                    <h3 className="font-bold text-amber-500">RESUME_TOKEN ISSUED</h3>
                    <p className="text-xs text-slate-400 font-mono">{resumeToken} — {nextPlan?.remainingStacks} stacks remaining in current plan.</p>
                </div>
            </div>
            <button 
                onClick={() => handleGenerate(true)}
                disabled={isGenerating}
                className="px-6 py-2 bg-amber-500 text-black font-bold rounded-xl flex items-center gap-2 hover:bg-amber-400 transition-colors disabled:opacity-50"
            >
                <PlayCircle className="w-5 h-5" /> RESUME BACKGROUND BATCH
            </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Control Panel */}
        <section className="lg:col-span-5 space-y-6">
          <div className="glass rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-300 font-semibold">
                    <Sparkles className="w-5 h-5 text-blue-400" />
                    Input Script
                </div>
                <div className="flex items-center gap-2 bg-slate-800/80 p-1 px-2 rounded-lg border border-slate-700">
                    <span className="text-[10px] font-bold text-slate-500">BG_SIM</span>
                    <button 
                        onClick={() => setIsBackgroundSim(!isBackgroundSim)}
                        className={`w-8 h-4 rounded-full transition-colors relative ${isBackgroundSim ? 'bg-purple-600' : 'bg-slate-700'}`}
                    >
                        <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${isBackgroundSim ? 'left-4.5' : 'left-0.5'}`}></div>
                    </button>
                </div>
            </div>
            <textarea
              className="w-full h-32 bg-slate-900/50 border border-slate-700 rounded-xl p-4 text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none text-sm"
              placeholder="Script content..."
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </div>

          {isBackgroundSim && (
             <div className="glass rounded-2xl p-6 space-y-4 border-purple-500/30 animate-in slide-in-from-top-2 duration-300">
                <div className="flex items-center gap-2 text-purple-400 font-bold text-xs uppercase tracking-widest">
                    <Zap className="w-4 h-4" /> Batch Configuration
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-[10px] text-slate-500 font-bold">STACKS TO GENERATE</label>
                        <input 
                            type="number" min="1" max="10" 
                            value={batchCount} 
                            onChange={(e) => setBatchCount(parseInt(e.target.value))}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-purple-200 outline-none focus:border-purple-500"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] text-slate-500 font-bold">TAKES PER STACK</label>
                        <input 
                            type="number" min="1" max="4" 
                            value={takesPerBatch} 
                            onChange={(e) => setTakesPerBatch(parseInt(e.target.value))}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-purple-200 outline-none focus:border-purple-500"
                        />
                    </div>
                </div>
                <p className="text-[10px] text-slate-500 leading-relaxed italic">
                    Engine will process all stacks and takes in a single sequence. This mode is optimized for large production batches.
                </p>
             </div>
          )}

          <div className="glass rounded-2xl p-6 space-y-4">
            <label className="flex items-center gap-2 text-slate-300 font-semibold">
              <Music className="w-5 h-5 text-purple-400" />
              Actor Profile
            </label>
            <div className="grid grid-cols-1 gap-2">
              {VOICE_OPTIONS.map((v) => (
                <button
                  key={v.name}
                  onClick={() => setSelectedVoice(v.name)}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                    selectedVoice === v.name ? 'bg-blue-600/20 border-blue-500 text-blue-100 neon-blue' : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  <span className="text-xl">{v.icon}</span>
                  <div className="text-left">
                    <div className="text-xs font-bold">{v.name}</div>
                    <div className="text-[10px] opacity-60">{v.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => handleGenerate()}
            disabled={isGenerating || !text.trim()}
            className={`w-full py-4 font-bold rounded-2xl shadow-lg transition-all transform active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50 ${
                isBackgroundSim 
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500' 
                    : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500'
            } text-white`}
          >
            {isGenerating ? (
              <><Loader2 className="w-6 h-6 animate-spin" /> {isBackgroundSim ? 'PROCESSING BATCH...' : 'STACKING...'}</>
            ) : (
              <><ListChecks className="w-6 h-6" /> {isBackgroundSim ? 'EXECUTE BACKGROUND BATCH' : 'START NEW STACK'}</>
            )}
          </button>
        </section>

        {/* Master Stacks History */}
        <section className="lg:col-span-7 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <History className="w-6 h-6 text-blue-400" />
              Active Workspace
            </h2>
            {stackHistory.length > 0 && (
              <button onClick={clearHistory} className="text-xs text-slate-500 hover:text-red-400 flex items-center gap-1 transition-colors">
                <Trash2 className="w-3 h-3" /> PURGE MANIFEST
              </button>
            )}
          </div>

          {isGenerating && (
            <div className={`glass rounded-2xl p-12 flex flex-col items-center justify-center text-center space-y-6 animate-pulse border-2 border-dashed ${isBackgroundSim ? 'border-purple-500/50' : 'border-blue-500/50'}`}>
              <div className={`w-16 h-16 border-4 rounded-full animate-spin ${isBackgroundSim ? 'border-purple-500/20 border-t-purple-500' : 'border-blue-500/20 border-t-blue-500'}`}></div>
              <div className="space-y-2">
                <h3 className={`text-lg font-bold ${isBackgroundSim ? 'text-purple-400' : 'text-blue-400'}`}>
                    {isBackgroundSim ? 'BACKGROUND_SIM ENGINE BUSY' : 'SEQUENTIAL ENGINE ACTIVE'}
                </h3>
                <p className="text-sm font-mono text-slate-300">{generationStatus}</p>
              </div>
            </div>
          )}

          {stackHistory.length === 0 && !isGenerating ? (
             <div className="h-96 glass border-dashed border-2 border-slate-800 rounded-3xl flex flex-col items-center justify-center text-slate-600 p-8 text-center">
                <Activity className="w-12 h-12 mb-4 opacity-10" />
                <p className="text-sm font-medium">Workspace is idle.<br/>Stacks will be appended to the manifest in sequence.</p>
             </div>
          ) : (
            <div className="space-y-12 pb-20">
              {stackHistory.map((stack) => (
                <StackGroup 
                  key={stack.stackId} 
                  stack={stack} 
                  playingId={playingId}
                  onPlay={playAudio}
                  onStop={stopAudio}
                  onDownload={downloadAudio}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

const StackGroup: React.FC<{
  stack: VoiceStack;
  playingId: string | null;
  onPlay: (buf: AudioBuffer, id: string) => void;
  onStop: () => void;
  onDownload: (buf: AudioBuffer, name: string) => void;
}> = ({ stack, playingId, onPlay, onStop, onDownload }) => {
  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-3 px-2">
        <div className="w-4 h-4 rounded-full bg-blue-500/20 border border-blue-500/40 flex items-center justify-center">
            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
        </div>
        <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest bg-slate-900/80 px-4 py-1.5 rounded-xl border border-slate-800">
          STACK {stack.stackId} • {stack.voice} • {stack.emotion}
        </span>
        <div className="flex-1 h-[1px] bg-gradient-to-r from-slate-800 to-transparent"></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {stack.takes.map((take) => (
          <TakeCard 
            key={take.id}
            take={take}
            isPlaying={playingId === take.id}
            onPlay={() => take.audioBuffer && onPlay(take.audioBuffer, take.id)}
            onStop={onStop}
            onDownload={() => take.audioBuffer && onDownload(take.audioBuffer, take.fileName)}
          />
        ))}
      </div>
    </div>
  );
};

const TakeCard: React.FC<{
  take: VoiceTake;
  isPlaying: boolean;
  onPlay: () => void;
  onStop: () => void;
  onDownload: () => void;
}> = ({ take, isPlaying, onPlay, onStop, onDownload }) => {
  const meta = take.metadata as VoiceMetadata;
  return (
    <div className={`glass rounded-2xl overflow-hidden border transition-all ${isPlaying ? 'border-blue-500/50 shadow-lg shadow-blue-500/10' : 'border-slate-800 hover:border-slate-700'}`}>
      <div className="p-3 bg-slate-800/40 flex justify-between items-center border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono font-bold text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-lg border border-blue-500/20">{take.id}</span>
          <span className="text-[10px] font-bold text-slate-400 truncate max-w-[120px]">{take.styleDescription}</span>
        </div>
        <button onClick={onDownload} title="Export WAV" className="text-slate-500 hover:text-white transition-colors p-1 hover:bg-slate-700 rounded-md">
          <Download className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="p-5 space-y-5">
        <div className="flex items-center gap-4">
          <button 
            onClick={isPlaying ? onStop : onPlay}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-md ${
              isPlaying ? 'bg-red-500 text-white shadow-red-500/20' : 'bg-slate-700 text-white hover:bg-blue-600 shadow-slate-900/50'
            }`}
          >
            {isPlaying ? <Square className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
          </button>
          <div className="flex-1 space-y-1.5">
             <div className="h-8 bg-slate-950/80 rounded-xl flex items-center px-3 gap-0.5 overflow-hidden border border-slate-900">
                {Array.from({ length: 35 }).map((_, i) => (
                  <div 
                    key={i} 
                    className={`w-0.5 rounded-full transition-all duration-300 ${isPlaying ? 'bg-blue-500' : 'bg-slate-800'}`}
                    style={{ height: isPlaying ? `${Math.random() * 80 + 20}%` : '20%', animationDelay: `${i * 0.02}s` }}
                  ></div>
                ))}
             </div>
             <div className="flex justify-between text-[9px] font-mono text-slate-600 px-1">
                <span className="uppercase">{take.fileName}</span>
                <span className="font-bold text-slate-400">{meta?.duration_estimate_sec?.toFixed(2) || '0.00'}s</span>
             </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 pt-3 border-t border-slate-800/50">
           <MetaSmall label="PACE" value={`${meta?.pace_wpm || 0}WPM`} />
           <MetaSmall label="ENERGY" value={meta?.energy || '-'} />
           <MetaSmall label="LUFS" value={`${meta?.loudness_target_lufs || 0}`} />
           <MetaSmall label="FLOOR" value={meta?.noise_floor || '-'} />
        </div>
      </div>
    </div>
  );
};

const MetaSmall: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex justify-between items-center text-[10px] font-mono">
    <span className="text-slate-500 font-medium">{label}</span>
    <span className="text-blue-400 font-bold uppercase truncate max-w-[70px]">{value}</span>
  </div>
);
