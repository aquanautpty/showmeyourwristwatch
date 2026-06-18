export const revalidate = 60;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

async function fetchAnalyses() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/analyses?select=*&order=created_at.desc`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
    },
    cache: 'no-store',
  });
  if (!res.ok) return [];
  return res.json();
}

function topN(items: string[], n = 5): { name: string; count: number }[] {
  const freq: Record<string, number> = {};
  for (const item of items) if (item) freq[item] = (freq[item] || 0) + 1;
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([name, count]) => ({ name, count }));
}

const styleColors: Record<string, string> = {
  modern: 'bg-blue-500',
  vintage: 'bg-blue-700',
  sporty: 'bg-blue-500',
  luxury: 'bg-yellow-500',
  casual: 'bg-purple-500',
};

export default async function StatsPage() {
  const analyses = await fetchAnalyses();
  const total = analyses.length;

  if (total === 0) {
    return (
      <main className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center">
        <p className="text-zinc-400">No hay datos todavía. ¡Analiza un reloj primero!</p>
      </main>
    );
  }

  const watches = topN(analyses.map((a: any) => a.watch));
  const cars = topN(analyses.map((a: any) => a.car));
  const jobs = topN(analyses.map((a: any) => a.job));
  const music = topN(analyses.map((a: any) => a.music));

  const styleCount: Record<string, number> = {};
  for (const a of analyses) if (a.style) styleCount[a.style] = (styleCount[a.style] || 0) + 1;

  const recent = analyses.slice(0, 10);

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white px-4 py-10" style={{ fontFamily: 'system-ui, sans-serif' }}>
      <div className="max-w-3xl mx-auto space-y-8">

        {/* Header */}
        <div className="text-center">
          <p className="text-xs text-blue-400 uppercase mb-2" style={{ letterSpacing: '0.3em' }}>Dashboard</p>
          <h1 className="text-3xl font-black">Show Me Your Wristwatch</h1>
          <p className="text-zinc-500 text-sm mt-1">Analytics en tiempo real</p>
        </div>

        {/* Total */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center">
          <p className="text-7xl font-black text-blue-400">{total}</p>
          <p className="text-zinc-400 mt-2 text-lg">relojes analizados</p>
        </div>

        {/* Estilos */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <p className="text-xs text-zinc-500 uppercase tracking-widest mb-4">Estilos más comunes</p>
          <div className="space-y-3">
            {Object.entries(styleCount).sort((a, b) => b[1] - a[1]).map(([style, count]) => (
              <div key={style}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="capitalize text-zinc-300">{style}</span>
                  <span className="text-zinc-500">{count} ({Math.round(count / total * 100)}%)</span>
                </div>
                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${styleColors[style] ?? 'bg-zinc-600'}`}
                    style={{ width: `${(count / total) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top watches + cars */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
            <p className="text-xs text-zinc-500 uppercase tracking-widest mb-4">⌚ Relojes más vistos</p>
            <ol className="space-y-2">
              {watches.map((w, i) => (
                <li key={w.name} className="flex items-start gap-2 text-sm">
                  <span className="text-blue-400 font-bold w-4 shrink-0">{i + 1}.</span>
                  <span className="text-zinc-200 leading-snug">{w.name}</span>
                  <span className="text-zinc-600 ml-auto shrink-0">×{w.count}</span>
                </li>
              ))}
            </ol>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
            <p className="text-xs text-zinc-500 uppercase tracking-widest mb-4">🚗 Autos más asignados</p>
            <ol className="space-y-2">
              {cars.map((c, i) => (
                <li key={c.name} className="flex items-start gap-2 text-sm">
                  <span className="text-blue-400 font-bold w-4 shrink-0">{i + 1}.</span>
                  <span className="text-zinc-200 leading-snug">{c.name}</span>
                  <span className="text-zinc-600 ml-auto shrink-0">×{c.count}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/* Top jobs + music */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
            <p className="text-xs text-zinc-500 uppercase tracking-widest mb-4">💼 Trabajos más comunes</p>
            <ol className="space-y-2">
              {jobs.map((j, i) => (
                <li key={j.name} className="flex items-start gap-2 text-sm">
                  <span className="text-blue-400 font-bold w-4 shrink-0">{i + 1}.</span>
                  <span className="text-zinc-200 leading-snug">{j.name}</span>
                  <span className="text-zinc-600 ml-auto shrink-0">×{j.count}</span>
                </li>
              ))}
            </ol>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
            <p className="text-xs text-zinc-500 uppercase tracking-widest mb-4">🎵 Música más frecuente</p>
            <ol className="space-y-2">
              {music.map((m, i) => (
                <li key={m.name} className="flex items-start gap-2 text-sm">
                  <span className="text-blue-400 font-bold w-4 shrink-0">{i + 1}.</span>
                  <span className="text-zinc-200 leading-snug">{m.name}</span>
                  <span className="text-zinc-600 ml-auto shrink-0">×{m.count}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/* Análisis recientes */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <p className="text-xs text-zinc-500 uppercase tracking-widest mb-4">Últimos análisis</p>
          <div className="space-y-3">
            {recent.map((a: any) => (
              <div key={a.id} className="flex items-center justify-between gap-3 border-b border-zinc-800 pb-3 last:border-0 last:pb-0">
                <div>
                  <p className="text-sm font-semibold text-blue-400">{a.watch}</p>
                  <p className="text-xs text-zinc-500 mt-0.5 italic">"{a.vibe}"</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-zinc-400">{a.job}</p>
                  <p className="text-xs text-zinc-600">{new Date(a.created_at).toLocaleDateString('es', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-center text-zinc-700 text-xs pb-4">
          <a href="/" className="hover:text-blue-400 transition-colors">← Volver al app</a>
        </p>
      </div>
    </main>
  );
}
