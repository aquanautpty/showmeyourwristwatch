'use client';

import { useState, useRef, useCallback } from 'react';

type Profile = {
  watch: string;
  age: string;
  vibe: string;
  music: string;
  car: string;
  job: string;
  personality: string[];
  style: 'modern' | 'vintage' | 'sporty' | 'luxury' | 'casual';
  quote: string;
  roast: string;
};

const styleColors: Record<string, string> = {
  modern:  'from-blue-500 to-cyan-400',
  vintage: 'from-amber-600 to-yellow-400',
  sporty:  'from-green-500 to-emerald-400',
  luxury:  'from-yellow-500 to-amber-300',
  casual:  'from-purple-500 to-pink-400',
};

const styleLabel: Record<string, string> = {
  modern:  '⚡ Modern',
  vintage: '🕰️ Vintage',
  sporty:  '🏎️ Sporty',
  luxury:  '💎 Luxury',
  casual:  '😎 Casual',
};

export default function Home() {
  const [image, setImage]         = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<string>('image/jpeg');
  const [profile, setProfile]     = useState<Profile | null>(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [dragging, setDragging]   = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    setMediaType(file.type);
    const reader = new FileReader();
    reader.onload = (e) => {
      setImage(e.target?.result as string);
      setProfile(null);
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }, []);

  const analyze = async () => {
    if (!image) return;
    setLoading(true);
    setError(null);
    try {
      const base64 = image.split(',')[1];
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64, mediaType }),
      });
      if (!res.ok) throw new Error('failed');
      setProfile(await res.json());
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setImage(null);
    setProfile(null);
    setError(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white" style={{ fontFamily: 'system-ui, sans-serif' }}>

      {/* Header */}
      <div className="text-center pt-12 pb-8 px-4">
        <p className="text-xs tracking-widest text-amber-400 uppercase mb-3" style={{ letterSpacing: '0.35em' }}>
          AI Watch Personality Reader
        </p>
        <h1 className="text-3xl sm:text-5xl font-black leading-tight max-w-2xl mx-auto">
          Show me your{' '}
          <span className="bg-gradient-to-r from-amber-400 to-yellow-300 bg-clip-text text-transparent">
            wristwatch
          </span>
          <br />
          and I'll tell you{' '}
          <span className="bg-gradient-to-r from-amber-400 to-yellow-300 bg-clip-text text-transparent">
            who you are
          </span>
        </h1>
        <p className="mt-4 text-zinc-400 text-sm sm:text-base max-w-md mx-auto">
          Upload a photo of your watch. Our AI will read your personality, music taste, car, job, and more.
        </p>
      </div>

      <div className="max-w-2xl mx-auto px-4 pb-20">

        {/* Upload Zone */}
        {!profile && (
          <div
            onClick={() => !image && fileRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            className={`relative rounded-2xl border-2 border-dashed overflow-hidden transition-all duration-200
              ${dragging ? 'border-amber-400 bg-amber-400/5' : 'border-zinc-700 hover:border-zinc-500'}
              ${!image ? 'cursor-pointer' : ''}`}
          >
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFile}
              className="hidden"
            />
            {!image ? (
              <div className="text-center p-12">
                <div className="text-6xl mb-4">⌚</div>
                <p className="text-zinc-300 font-semibold text-lg">Drop your watch photo here</p>
                <p className="text-zinc-500 text-sm mt-1">or tap to upload / take a photo</p>
                <p className="text-zinc-600 text-xs mt-4">JPG · PNG · HEIC</p>
              </div>
            ) : (
              <div className="relative">
                <img src={image} alt="watch" className="w-full max-h-80 object-contain bg-zinc-900" />
                <button
                  onClick={(e) => { e.stopPropagation(); reset(); }}
                  className="absolute top-3 right-3 bg-black/70 rounded-full w-8 h-8 flex items-center justify-center text-sm hover:bg-black"
                >✕</button>
              </div>
            )}
          </div>
        )}

        {/* Analyze button */}
        {image && !profile && (
          <button
            onClick={analyze}
            disabled={loading}
            className="mt-4 w-full py-4 rounded-2xl font-bold text-base bg-gradient-to-r from-amber-500 to-yellow-400 text-black hover:from-amber-400 hover:to-yellow-300 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-3"
          >
            {loading ? (
              <>
                <span className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                Reading your personality…
              </>
            ) : (
              '⌚ Tell me who I am'
            )}
          </button>
        )}

        {error && <p className="mt-4 text-center text-red-400 text-sm">{error}</p>}

        {/* Results */}
        {profile && (
          <div className="space-y-4">

            {/* Photo + style badge */}
            <div className="relative rounded-2xl overflow-hidden">
              <img src={image!} alt="watch" className="w-full max-h-64 object-contain bg-zinc-900" />
              <div className={`absolute top-3 left-3 bg-gradient-to-r ${styleColors[profile.style] ?? 'from-amber-500 to-yellow-400'} text-black text-xs font-bold px-3 py-1 rounded-full`}>
                {styleLabel[profile.style] ?? profile.style}
              </div>
            </div>

            {/* Watch + vibe */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
              <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Watch Detected</p>
              <p className="text-xl font-bold text-amber-400">{profile.watch}</p>
              <p className="text-zinc-300 mt-2 text-sm leading-relaxed italic">"{profile.vibe}"</p>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Age Range',   icon: '👤', value: profile.age   },
                { label: 'Profession',  icon: '💼', value: profile.job   },
                { label: 'Music',       icon: '🎵', value: profile.music },
                { label: 'Car',         icon: '🚗', value: profile.car   },
              ].map(({ label, icon, value }) => (
                <div key={label} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
                  <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">{label}</p>
                  <p className="font-bold text-sm leading-snug">{icon} {value}</p>
                </div>
              ))}
            </div>

            {/* Traits */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
              <p className="text-xs text-zinc-500 uppercase tracking-widest mb-3">Personality Traits</p>
              <div className="flex flex-wrap gap-2">
                {profile.personality.map((t, i) => (
                  <span key={i} className="bg-zinc-800 text-zinc-200 text-sm px-3 py-1 rounded-full border border-zinc-700">
                    {t}
                  </span>
                ))}
              </div>
            </div>

            {/* Quote */}
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5">
              <p className="text-xs text-amber-400 uppercase tracking-widest mb-2">Your Life Motto</p>
              <p className="text-white font-semibold text-lg">"{profile.quote}"</p>
            </div>

            {/* Roast */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
              <p className="text-xs text-zinc-500 uppercase tracking-widest mb-2">🔥 The Roast</p>
              <p className="text-zinc-300 leading-relaxed">{profile.roast}</p>
            </div>

            {/* Reset */}
            <button
              onClick={reset}
              className="w-full py-4 rounded-2xl font-bold text-sm border border-zinc-700 text-zinc-300 hover:border-amber-400 hover:text-amber-400 transition-all"
            >
              Try with another watch ⌚
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
