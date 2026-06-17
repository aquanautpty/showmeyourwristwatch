'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';

const APP_URL = 'https://showmeyourwristwatch.vercel.app';

const LOADING_MESSAGES = [
  '🔍 Scanning your watch DNA...',
  '🧠 Consulting the oracle...',
  '📡 Analyzing your life choices...',
  '🕵️ Reading between the links...',
  '💎 Calculating your net worth...',
  '🎯 Profiling your personality...',
  '🚗 Checking your garage...',
  '🎵 Tuning into your playlist...',
  '✨ Almost got you figured out...',
];

type Profile = {
  watch: string;
  age: string;
  vibe: string;
  music: string;
  song: string;
  car: string;
  job: string;
  personality: string[];
  style: 'modern' | 'vintage' | 'sporty' | 'luxury' | 'casual';
  quote: string;
  roast: string;
  emoji: string;
};

function SketchCard({ label, title, prompt }: { label: string; title?: string; prompt: string }) {
  const [loaded, setLoaded] = useState(false);
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=512&height=512&nologo=true&model=flux-schnell&seed=42`;
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
      <div className="px-4 pt-4 pb-2 flex items-baseline justify-between">
        <p className="text-xs text-zinc-500 uppercase tracking-widest">{label}</p>
        {title && <p className="text-sm font-bold text-white truncate ml-3 max-w-[65%] text-right">{title}</p>}
      </div>
      <div className="relative aspect-video bg-zinc-800">
        {!loaded && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <div className="w-6 h-6 border-2 border-zinc-700 border-t-emerald-400 rounded-full animate-spin" />
            <p className="text-zinc-600 text-xs">Loading…</p>
          </div>
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={title ?? label}
          onLoad={() => setLoaded(true)}
          className={`w-full h-full object-cover transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        />
      </div>
    </div>
  );
}

const styleColors: Record<string, string> = {
  modern:  'from-blue-500 to-cyan-400',
  vintage: 'from-emerald-600 to-green-400',
  sporty:  'from-green-500 to-emerald-400',
  luxury:  'from-green-500 to-emerald-300',
  casual:  'from-purple-500 to-pink-400',
};

const styleLabel: Record<string, string> = {
  modern:  '⚡ Modern',
  vintage: '🕰️ Vintage',
  sporty:  '🏎️ Sporty',
  luxury:  '💎 Luxury',
  casual:  '😎 Casual',
};

function encodeProfile(p: Profile) {
  const json = JSON.stringify(p);
  const bytes = new TextEncoder().encode(json);
  const binary = Array.from(bytes, b => String.fromCharCode(b)).join('');
  return btoa(binary);
}
function decodeProfile(s: string): Profile | null {
  try {
    const binary = atob(s);
    const bytes = new Uint8Array(Array.from(binary, c => c.charCodeAt(0)));
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch { return null; }
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lineH: number): number {
  const words = text.split(' ');
  let line = '';
  let curY = y;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, curY); line = word; curY += lineH;
    } else { line = test; }
  }
  if (line) ctx.fillText(line, x, curY);
  return curY + lineH;
}

export default function Home() {
  const [image, setImage]         = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<string>('image/jpeg');
  const [profile, setProfile]     = useState<Profile | null>(null);
  const [loading, setLoading]     = useState(false);
  const [loadMsg, setLoadMsg]     = useState(LOADING_MESSAGES[0]);
  const [error, setError]         = useState<string | null>(null);
  const [dragging, setDragging]   = useState(false);
  const [shared, setShared]           = useState(false);
  const [sharing, setSharing]         = useState(false);
  const [revealed, setRevealed]       = useState(false);
  const [verdictOpen, setVerdictOpen] = useState(false);
  const [verdict, setVerdict]         = useState<'nailed' | 'close' | 'miss' | null>(null);
  const fileRef  = useRef<HTMLInputElement>(null);
  const msgTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load shared result from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const r = params.get('r');
    if (r) {
      const p = decodeProfile(r);
      if (p) { setProfile(p); setTimeout(() => setRevealed(true), 100); }
    }
  }, []);

  // Rotate loading messages
  useEffect(() => {
    if (loading) {
      let i = 0;
      msgTimer.current = setInterval(() => {
        i = (i + 1) % LOADING_MESSAGES.length;
        setLoadMsg(LOADING_MESSAGES[i]);
      }, 1800);
    } else {
      if (msgTimer.current) clearInterval(msgTimer.current);
      setLoadMsg(LOADING_MESSAGES[0]);
    }
    return () => { if (msgTimer.current) clearInterval(msgTimer.current); };
  }, [loading]);

  const processFile = (file: File) => {
    const SUPPORTED = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const needsConversion = !SUPPORTED.includes(file.type);

    const applyImage = (dataUrl: string, type: string) => {
      setImage(dataUrl);
      setMediaType(type);
      setProfile(null);
      setError(null);
      setRevealed(false);
      setVerdictOpen(false);
      setVerdict(null);
    };

    if (!needsConversion) {
      const reader = new FileReader();
      reader.onload = (e) => applyImage(e.target?.result as string, file.type);
      reader.readAsDataURL(file);
      return;
    }

    // Convert unsupported formats (HEIC, BMP, TIFF, etc.) via canvas
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) { URL.revokeObjectURL(url); setError('Canvas not supported on this device.'); return; }
      ctx.drawImage(img, 0, 0);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      URL.revokeObjectURL(url);
      applyImage(dataUrl, 'image/jpeg');
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      setError('Could not open this file. Please try a JPG or PNG photo.');
    };
    img.src = url;
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
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'failed');
      setProfile(data);
      setTimeout(() => setRevealed(true), 100);
      try {
        const encoded = encodeProfile(data);
        window.history.replaceState(null, '', `?r=${encoded}`);
      } catch { /* URL sharing unavailable, profile still shows */ }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const generateShareCard = async (): Promise<Blob | null> => {
    if (!profile) return null;
    const W = 1080, H = 1920; // 9:16 story format
    const PAD = 64;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, W, H);

    // Watch photo — small square top-right
    const PHOTO_SIZE = 280;
    const PHOTO_Y = 72;
    if (image) {
      await new Promise<void>(resolve => {
        const img = new Image();
        img.onload = () => {
          const photoX = W - PAD - PHOTO_SIZE;
          ctx.save();
          ctx.beginPath();
          ctx.roundRect(photoX, PHOTO_Y, PHOTO_SIZE, PHOTO_SIZE, 20);
          ctx.clip();
          const scale = Math.max(PHOTO_SIZE / img.naturalWidth, PHOTO_SIZE / img.naturalHeight);
          const sw = PHOTO_SIZE / scale, sh = PHOTO_SIZE / scale;
          const sx = (img.naturalWidth - sw) / 2, sy = (img.naturalHeight - sh) / 2;
          ctx.drawImage(img, sx, sy, sw, sh, photoX, PHOTO_Y, PHOTO_SIZE, PHOTO_SIZE);
          ctx.restore();
          resolve();
        };
        img.onerror = () => resolve();
        img.src = image;
      });
    }

    // Green top bar
    ctx.fillStyle = '#10b981'; ctx.fillRect(0, 0, W, 8);

    // App title top-left
    ctx.font = 'bold 26px system-ui, sans-serif';
    ctx.fillStyle = '#10b981'; ctx.textAlign = 'left';
    ctx.fillText('SHOW ME YOUR WRISTWATCH', PAD, 108);

    // Intro line
    ctx.font = '500 28px system-ui, sans-serif'; ctx.fillStyle = '#71717a';
    ctx.fillText('My watch says I\'m...', PAD, 152);

    let y = PHOTO_Y + PHOTO_SIZE + 72;

    // Watch name
    ctx.font = 'bold 52px system-ui, sans-serif'; ctx.fillStyle = '#34d399';
    y = wrapText(ctx, profile.watch, PAD, y, W - PAD * 2, 64);
    y += 20;

    const badge = styleLabel[profile.style] ?? profile.style;
    ctx.font = 'bold 24px system-ui, sans-serif'; ctx.fillStyle = '#10b981';
    ctx.fillText(badge, PAD, y); y += 64;

    // Divider
    ctx.strokeStyle = '#27272a'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(PAD, y); ctx.lineTo(W - PAD, y); ctx.stroke();
    y += 56;

    // Vibe
    ctx.font = 'italic 30px system-ui, sans-serif'; ctx.fillStyle = '#a1a1aa';
    y = wrapText(ctx, `"${profile.vibe}"`, PAD, y, W - PAD * 2, 42);
    y += 60;

    // Stats 2×2
    const stats = [
      { label: 'AGE', val: profile.age },
      { label: 'MUSIC', val: profile.music },
      { label: 'JOB', val: profile.job },
      { label: 'SONG', val: profile.song ?? '' },
    ];
    stats.forEach((s, i) => {
      const cx = PAD + (i % 2) * 490, cy = y + Math.floor(i / 2) * 118;
      ctx.font = 'bold 20px system-ui, sans-serif'; ctx.fillStyle = '#52525b';
      ctx.fillText(s.label, cx, cy);
      ctx.font = '600 28px system-ui, sans-serif'; ctx.fillStyle = '#ffffff';
      wrapText(ctx, s.val, cx, cy + 36, 450, 34);
    });
    y += 258;

    // Divider
    ctx.strokeStyle = '#27272a'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(PAD, y); ctx.lineTo(W - PAD, y); ctx.stroke();
    y += 56;

    // Roast
    ctx.font = '600 30px system-ui, sans-serif'; ctx.fillStyle = '#ffffff';
    y = wrapText(ctx, `"${profile.roast}"`, PAD, y, W - PAD * 2, 42);
    y += 80;

    // CTA
    ctx.font = 'bold 32px system-ui, sans-serif'; ctx.fillStyle = '#10b981'; ctx.textAlign = 'center';
    ctx.fillText('Now try yours →', W / 2, y); y += 52;
    ctx.font = '500 26px system-ui, sans-serif'; ctx.fillStyle = '#34d399';
    ctx.fillText('showmeyourwristwatch.vercel.app', W / 2, y);

    // Footer
    ctx.font = '600 22px system-ui, sans-serif'; ctx.fillStyle = '#D4AF37';
    ctx.fillText('POWERED BY PTY LUXURY WATCH', W / 2, H - 32);

    return new Promise(resolve => canvas.toBlob(b => resolve(b), 'image/jpeg', 0.92));
  };

  const shareMsg = (p: Profile) =>
    `⌚ My ${p.watch} says I'm "${p.vibe}"\n\n🔥 "${p.roast}"\n\n👉 Now try yours: ${APP_URL}`;

  const share = async () => {
    if (!profile) return;
    setSharing(true);
    try {
      const blob = await generateShareCard();
      if (!blob) return;
      const file = new File([blob], 'my-watch-personality.jpg', { type: 'image/jpeg' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Show Me Your Wristwatch', text: shareMsg(profile) });
      } else {
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = blobUrl; a.download = 'my-watch-personality.jpg';
        a.click(); URL.revokeObjectURL(blobUrl);
        setShared(true); setTimeout(() => setShared(false), 3000);
      }
    } catch { /* cancelled */ } finally { setSharing(false); }
  };

  const shareToInstagram = async () => {
    if (!profile) return;
    setSharing(true);
    try {
      const blob = await generateShareCard();
      if (!blob) return;
      const file = new File([blob], 'my-watch-personality.jpg', { type: 'image/jpeg' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Show Me Your Wristwatch', text: shareMsg(profile) });
      } else {
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = blobUrl; a.download = 'my-watch-personality.jpg';
        a.click(); URL.revokeObjectURL(blobUrl);
        alert('Image downloaded! Open Instagram on your phone and post it as a Story.');
      }
    } catch { /* cancelled */ } finally { setSharing(false); }
  };

  const downloadCard = async () => {
    if (!profile) return;
    setSharing(true);
    try {
      const blob = await generateShareCard();
      if (!blob) return;
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = blobUrl; a.download = 'my-watch-personality.jpg';
      a.click(); URL.revokeObjectURL(blobUrl);
    } catch { /* ignore */ } finally { setSharing(false); }
  };

  const reset = () => {
    setImage(null);
    setProfile(null);
    setError(null);
    setRevealed(false);
    setShared(false);
    setSharing(false);
    setVerdict(null);
    setVerdictOpen(false);
    if (fileRef.current) fileRef.current.value = '';
    window.history.replaceState(null, '', '/');
  };

  const isSharedView = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('r') && !image;

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white" style={{ fontFamily: 'system-ui, sans-serif' }}>

      {/* Header */}
      <div className="text-center pt-12 pb-8 px-4">
        <p className="text-xs text-emerald-400 uppercase mb-3" style={{ letterSpacing: '0.35em' }}>
          AI Watch Personality Reader
        </p>
        <h1 className="text-3xl sm:text-5xl font-black leading-tight max-w-2xl mx-auto">
          Show me your{' '}
          <span className="bg-gradient-to-r from-emerald-400 to-green-300 bg-clip-text text-transparent">
            wristwatch
          </span>
          <br />
          and I'll tell you{' '}
          <span className="bg-gradient-to-r from-emerald-400 to-green-300 bg-clip-text text-transparent">
            who you are
          </span>
        </h1>
        <p className="mt-4 text-zinc-400 text-sm sm:text-base max-w-md mx-auto">
          {isSharedView
            ? 'A friend shared their watch personality with you 👇'
            : 'Upload a photo of your watch. Our AI will read your personality, music taste, car, job, and more.'}
        </p>

        {/* QR — solo desktop, solo si no hay resultados */}
        {!profile && (
          <div className="hidden sm:flex flex-col items-center gap-2 mt-6">
            <div className="bg-white p-3 rounded-xl shadow-lg shadow-emerald-400/10">
              <QRCodeSVG value={APP_URL} size={100} bgColor="#ffffff" fgColor="#1a1a1a" />
            </div>
            <p className="text-zinc-500 text-xs">Scan to open on your phone</p>
          </div>
        )}
      </div>

      <div className="max-w-2xl mx-auto px-4 pb-24">

        {/* Upload Zone */}
        {!profile && (
          <div
            onClick={() => !image && fileRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            className={`relative rounded-2xl border-2 border-dashed overflow-hidden transition-all duration-200
              ${dragging ? 'border-emerald-400 bg-emerald-400/5' : 'border-zinc-700 hover:border-zinc-500'}
              ${!image ? 'cursor-pointer' : ''}`}
          >
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
            {!image ? (
              <div className="text-center p-12">
                <div className="text-6xl mb-4 animate-bounce">⌚</div>
                <p className="text-zinc-300 font-semibold text-lg">Drop your watch photo here</p>
                <p className="text-zinc-500 text-sm mt-1">or tap to upload / take a photo</p>
                <p className="text-zinc-600 text-xs mt-4">JPG · PNG · HEIC</p>
              </div>
            ) : (
              <div className="relative">
                <img src={image} alt="watch" className="w-full max-h-80 object-contain bg-zinc-900" />
                <button onClick={(e) => { e.stopPropagation(); reset(); }}
                  className="absolute top-3 right-3 bg-black/70 rounded-full w-8 h-8 flex items-center justify-center text-sm hover:bg-black">✕</button>
              </div>
            )}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="mt-6 flex flex-col items-center gap-4 py-6 text-center">
            <div className="w-12 h-12 border-4 border-zinc-800 border-t-emerald-400 rounded-full animate-spin" />
            <p className="text-emerald-400 font-semibold text-base transition-all duration-500">{loadMsg}</p>
            <p className="text-zinc-600 text-xs">This takes about 10 seconds</p>
          </div>
        )}

        {/* Analyze button */}
        {image && !profile && !loading && (
          <button onClick={analyze}
            className="mt-4 w-full py-4 rounded-2xl font-bold text-base bg-gradient-to-r from-emerald-500 to-green-400 text-black hover:from-emerald-400 hover:to-green-300 transition-all flex items-center justify-center gap-3">
            ⌚ Tell me who I am
          </button>
        )}

        {error && <p className="mt-4 text-center text-red-400 text-sm">{error}</p>}

        {/* Results */}
        {profile && (
          <div className={`space-y-4 transition-all duration-700 ${revealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>

            {/* Shared view banner */}
            {isSharedView && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 text-center">
                <p className="text-emerald-400 font-semibold text-sm">👀 A friend shared their watch personality with you!</p>
                <button onClick={reset} className="text-zinc-400 text-xs mt-1 underline">Try with your own watch →</button>
              </div>
            )}

            {/* Watch + vibe */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
              {image && (
                <img src={image} alt="Your watch" className="w-full max-h-56 object-cover" style={{ objectPosition: 'center' }} />
              )}
              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Watch Detected</p>
                    <p className="text-xl font-bold text-emerald-400">{profile.watch}</p>
                  </div>
                  <span className={`bg-gradient-to-r ${styleColors[profile.style] ?? 'from-emerald-500 to-green-400'} text-black text-xs font-bold px-3 py-1 rounded-full shrink-0`}>
                    {styleLabel[profile.style] ?? profile.style}
                  </span>
                </div>
                <p className="text-zinc-300 mt-3 text-sm leading-relaxed italic border-t border-zinc-800 pt-3">"{profile.vibe}"</p>
              </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Age Range',    icon: '👤', value: profile.age   },
                { label: 'Profession',   icon: '💼', value: profile.job   },
                { label: 'Music',        icon: '🎵', value: profile.music },
                { label: 'Favorite Song', icon: '🎶', value: profile.song  },
              ].map(({ label, icon, value }) => (
                <div key={label} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
                  <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">{label}</p>
                  <p className="font-bold text-sm leading-snug">{icon} {value}</p>
                </div>
              ))}
            </div>

            {/* Your Ride — car name + photo merged */}
            <SketchCard
              label="Your Ride"
              title={profile.car}
              prompt={`professional studio photo of a ${profile.car}, side view, white background, car dealership photo, ultra realistic, high quality, no text`}
            />

            {/* Personality traits */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
              <p className="text-xs text-zinc-500 uppercase tracking-widest mb-3">Personality Traits</p>
              <div className="flex flex-wrap gap-2">
                {profile.personality.map((t, i) => (
                  <span key={i} className="bg-zinc-800 text-zinc-200 text-sm px-3 py-1 rounded-full border border-zinc-700">{t}</span>
                ))}
              </div>
            </div>

            {/* Quote */}
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-5">
              <p className="text-xs text-emerald-400 uppercase tracking-widest mb-2">Your Life Motto</p>
              <p className="text-white font-semibold text-lg">"{profile.quote}"</p>
            </div>

            {/* Roast */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <p className="text-xs text-zinc-500 uppercase tracking-widest mb-3">🔥 The Roast</p>
              <p className="text-white text-xl font-semibold leading-relaxed italic">{profile.roast}</p>
            </div>

            {/* Share */}
            <div className="grid grid-cols-2 gap-3">
              <button onClick={share} disabled={sharing}
                className="py-4 rounded-2xl font-bold text-base bg-gradient-to-r from-emerald-500 to-green-400 text-black hover:from-emerald-400 hover:to-green-300 transition-all flex items-center justify-center gap-2 disabled:opacity-60">
                {sharing
                  ? <><div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" /> Creating...</>
                  : shared ? '✅ Saved!' : '📸 Share results'}
              </button>
              <button onClick={shareToInstagram} disabled={sharing}
                className="py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-60"
                style={{ background: 'linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)', color: '#fff' }}>
                {sharing
                  ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Creating...</>
                  : '📱 Instagram Story'}
              </button>
            </div>

            {/* Verdict + Upsell */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => { setVerdictOpen(true); setVerdict(null); }}
                className="py-4 rounded-2xl font-bold text-sm border border-zinc-700 text-zinc-300 hover:border-emerald-400 hover:text-emerald-400 transition-all">
                🎯 Tell me how I did
              </button>
              <a
                href="https://ptyluxurywatch.com"
                target="_blank"
                rel="noopener noreferrer"
                className="py-4 rounded-2xl font-bold text-sm flex items-center justify-center text-center transition-all"
                style={{ background: 'linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%)', border: '1px solid #8B6914', color: '#D4AF37' }}>
                ⌚ Up your wrist game
              </a>
            </div>

            {/* Verdict panel */}
            {verdictOpen && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 text-center space-y-3">
                {verdict === null && (
                  <>
                    <p className="text-zinc-300 font-semibold">How accurate was the AI?</p>
                    <div className="flex gap-2 justify-center flex-wrap">
                      {(['nailed', 'close', 'miss'] as const).map((v, i) => (
                        <button key={v} onClick={() => setVerdict(v)}
                          className="px-4 py-2 rounded-full text-sm font-semibold border border-zinc-700 text-zinc-300 hover:border-emerald-400 hover:text-emerald-400 transition-all">
                          {['✅ Nailed it', '🤏 Pretty close', '❌ Way off'][i]}
                        </button>
                      ))}
                    </div>
                  </>
                )}
                {verdict === 'nailed' && <p className="text-2xl font-black text-emerald-400">🎉 YES! The watch never lies.</p>}
                {verdict === 'close'  && <p className="text-2xl font-black text-yellow-400">😅 Close enough — we'll take it.</p>}
                {verdict === 'miss'   && <p className="text-2xl font-black text-red-400">💀 We'll do better next time... maybe.</p>}
                {verdict && (
                  <button onClick={() => setVerdict(null)} className="text-zinc-500 text-xs underline">change answer</button>
                )}
              </div>
            )}

            <button onClick={reset}
              className="w-full py-4 rounded-2xl font-bold text-sm border border-zinc-700 text-zinc-300 hover:border-emerald-400 hover:text-emerald-400 transition-all">
              Try with another watch ⌚
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-8 pb-10 text-center px-4">
        <div className="inline-block border-t border-zinc-800 pt-6">
          <a
            href="https://ptyluxurywatch.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center gap-1 group"
          >
            <span className="text-zinc-600 text-xs uppercase tracking-widest">Powered by</span>
            <span
              className="text-sm font-black uppercase tracking-widest group-hover:opacity-80 transition-opacity"
              style={{ color: '#D4AF37', letterSpacing: '0.2em' }}>
              PTY Luxury Watch
            </span>
          </a>
        </div>
      </div>
    </main>
  );
}
