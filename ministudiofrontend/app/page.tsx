'use client';

import { useState, useEffect, useRef } from 'react';
import { Sparkles, Film, Loader2, Play } from 'lucide-react';

interface Scene {
  scene_number: number;
  visual_description: string;
  narration: string;
}

interface Storyboard {
  title: string;
  scenes: Scene[];
}

interface ResultScene {
  scene_number: number;
  visual_prompt_used: string;
  image_url: string;
  narration: string;
}

export default function Home() {
  const [prompt, setPrompt] = useState('');
  const [numScenes, setNumScenes] = useState(3);
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState('idle'); // idle, queued, orchestrating, generating_images, completed, failed
  const [storyboard, setStoryboard] = useState<Storyboard | null>(null);
  const [results, setResults] = useState<ResultScene[]>([]);
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);

  const checkStatus = async (id: string) => {
    try {
      const res = await fetch(`https://mini-studio-two.vercel.app/api/status/${id}`);
      const data = await res.json();
      
      setStatus(data.status);

      if (data.status === 'completed') {
        setStoryboard(data.storyboard);
        setResults(data.results);
        if (pollingInterval.current) clearInterval(pollingInterval.current);
      } else if (data.status.startsWith('failed')) {
        if (pollingInterval.current) clearInterval(pollingInterval.current);
      }
    } catch (err) {
      console.error('Error checking status:', err);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setJobId(null);
    setStoryboard(null);
    setResults([]);
    setStatus('queued');

    try {
      const res = await fetch('https://mini-studio-two.vercel.app/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, num_scenes: Number(numScenes) }),
      });
      const data = await res.json();
      setJobId(data.job_id);

      pollingInterval.current = setInterval(() => {
        checkStatus(data.job_id);
      }, 1500);

    } catch (err) {
      setStatus('failed: Network Error');
      console.error(err);
    }
  };

  useEffect(() => {
    return () => {
      if (pollingInterval.current) clearInterval(pollingInterval.current);
    };
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        
        {/* Header Header */}
        <header className="flex items-center gap-3 mb-12 border-b border-slate-800 pb-6">
          <Film className="w-8 h-8 text-indigo-500" />
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
            MiniStudio AI
          </h1>
          <span className="text-xs font-mono px-2 py-1 bg-slate-900 border border-slate-700 text-slate-400 rounded">
            v1.0-FreeTier
          </span>
        </header>

        {/* Input Interface Panels */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <form onSubmit={handleGenerate} className="md:col-span-1 bg-slate-900 p-6 rounded-2xl border border-slate-800 flex flex-col gap-5 h-fit">
            <h2 className="text-lg font-bold text-slate-200">Director's Workspace</h2>
            
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Story Concept</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe your scene or sequence concept in vivid detail..."
                className="w-full h-32 bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition resize-none placeholder-slate-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Frame Count</label>
              <select
                value={numScenes}
                onChange={(e) => setNumScenes(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition"
              >
                <option value={3}>3 Frames (Fast)</option>
                <option value={4}>4 Frames</option>
                <option value={5}>5 Frames</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={status !== 'idle' && status !== 'completed' && !status.startsWith('failed')}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 font-medium rounded-xl text-sm transition flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed text-white shadow-lg shadow-indigo-600/10"
            >
              {status !== 'idle' && status !== 'completed' && !status.startsWith('failed') ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing Stack...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate Storyboard
                </>
              )}
            </button>
          </form>

          {/* Render Active Stage Feedback Panel */}
          <div className="md:col-span-2 bg-slate-900 p-6 rounded-2xl border border-slate-800 flex flex-col items-center justify-center min-h-[350px]">
            {status === 'idle' && (
              <div className="text-center max-w-sm">
                <Play className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                <p className="text-slate-400 font-medium text-sm">Your script is empty.</p>
                <p className="text-slate-600 text-xs mt-1">Provide a concept prompt to spin up the background generation models.</p>
              </div>
            )}

            {status !== 'idle' && status !== 'completed' && !status.startsWith('failed') && (
              <div className="text-center">
                <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mx-auto mb-4" />
                <h3 className="text-base font-semibold capitalize text-slate-200">{status.replace('_', ' ')}...</h3>
                <p className="text-slate-500 text-xs mt-1 font-mono">Job Tracking ID: {jobId}</p>
                
                <div className="w-48 h-1 bg-slate-800 rounded-full mt-4 mx-auto overflow-hidden">
                  <div className={`h-full bg-indigo-500 rounded-full transition-all duration-500 ${
                    status === 'queued' ? 'w-1/4' : status === 'orchestrating' ? 'w-1/2' : 'w-3/4'
                  }`} />
                </div>
              </div>
            )}

            {status.startsWith('failed') && (
              <div className="text-center p-4 border border-red-900/30 bg-red-950/20 rounded-xl max-w-md">
                <p className="text-red-400 font-semibold text-sm">Execution Failure</p>
                <p className="text-red-500 text-xs font-mono mt-2 break-words text-left bg-slate-950 p-3 rounded-lg border border-red-900/40">
                  {status}
                </p>
              </div>
            )}

            {status === 'completed' && storyboard && (
              <div className="w-full flex flex-col h-full">
                <div className="mb-6">
                  <span className="text-xs font-bold text-indigo-400 tracking-widest uppercase">Production Output</span>
                  <h3 className="text-xl font-bold text-slate-100 mt-1">{storyboard.title}</h3>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 overflow-y-auto w-full">
                  {results.map((scene) => (
                    <div key={scene.scene_number} className="bg-slate-950 rounded-xl border border-slate-800 p-3 flex flex-col gap-3">
                      <div className="relative aspect-video w-full bg-slate-900 rounded-lg overflow-hidden border border-slate-800">
                        <img
                          src={`https://mini-studio-two.vercel.app/${scene.image_url}`}
                          alt={`Frame ${scene.scene_number}`}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                        <span className="absolute top-2 left-2 bg-slate-950/80 border border-slate-700/60 backdrop-blur text-[10px] font-bold px-2 py-0.5 rounded-full text-slate-300">
                          Frame {scene.scene_number}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 font-medium leading-relaxed italic border-l-2 border-indigo-500/40 pl-2">
                        "{scene.narration}"
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </main>
  );
}