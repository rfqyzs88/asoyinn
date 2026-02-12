
import React from 'react';
import { VoiceStudio } from './components/VoiceStudio';

function App() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-blue-500/30">
      {/* Background Decorative Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600 rounded-full blur-[120px]"></div>
      </div>
      
      <main className="relative z-10">
        <VoiceStudio />
      </main>

      <footer className="relative z-10 border-t border-slate-900 bg-slate-950/80 backdrop-blur-md py-6 mt-12">
        <div className="max-w-6xl mx-auto px-8 flex flex-col md:flex-row justify-between items-center gap-4 text-slate-500 text-sm">
          <div className="flex items-center gap-4">
            <span className="font-bold text-slate-300">VOCALIS PRO v1.0</span>
            <span className="hidden md:inline">|</span>
            <span>Digital Audio Workstation Engine</span>
          </div>
          <div className="flex gap-6">
            <a href="#" className="hover:text-blue-400 transition-colors">Documentation</a>
            <a href="#" className="hover:text-blue-400 transition-colors">API Status</a>
            <a href="#" className="hover:text-blue-400 transition-colors">Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
