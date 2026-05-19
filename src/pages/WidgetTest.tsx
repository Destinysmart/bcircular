import { useState } from 'react';

type View = 'score' | 'stats' | 'map';
type Window = '7d' | '30d' | '90d' | 'all';

const DIMS: Record<View, { w: number; h: number }> = {
  score: { w: 320, h: 160 },
  stats: { w: 380, h: 180 },
  map: { w: 480, h: 360 },
};

const SLUGS = ['bitcoin-beach', 'bitcoin-africa-story', 'bitcoin-anambra'];

const WidgetTest = () => {
  const [slug, setSlug] = useState('bitcoin-beach');
  const [view, setView] = useState<View>('score');
  const [win, setWin] = useState<Window>('30d');

  const url = (() => {
    const p = new URLSearchParams();
    p.set('view', view);
    if (view !== 'score') p.set('window', win);
    return `/widget/${slug}?${p.toString()}`;
  })();

  const dims = DIMS[view];
  const embedCode = `<iframe src="${window.location.origin}${url}" width="${dims.w}" height="${dims.h}" style="border:0;border-radius:12px;max-width:100%" loading="lazy" title="Bitcoin Circular widget"></iframe>`;

  return (
    <div className="min-h-screen bg-background text-foreground p-6 md:p-10 max-w-5xl mx-auto space-y-8 font-sans">
      <header>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Widget embed test page</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Sanity-check page used to verify widgets render responsively across viewports and views.
          Not part of the public navigation.
        </p>
      </header>

      {/* Controls */}
      <section className="rounded-xl border border-border bg-card p-4 grid sm:grid-cols-3 gap-4">
        <label className="text-xs uppercase tracking-wider text-muted-foreground">
          Economy
          <select
            value={slug}
            onChange={e => setSlug(e.target.value)}
            className="mt-1 w-full rounded-md border border-border bg-background text-foreground text-sm px-2 py-1.5"
          >
            {SLUGS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <label className="text-xs uppercase tracking-wider text-muted-foreground">
          View
          <select
            value={view}
            onChange={e => setView(e.target.value as View)}
            className="mt-1 w-full rounded-md border border-border bg-background text-foreground text-sm px-2 py-1.5"
          >
            <option value="score">Score</option>
            <option value="stats">Stats</option>
            <option value="map">Map</option>
          </select>
        </label>
        <label className="text-xs uppercase tracking-wider text-muted-foreground">
          Window
          <select
            value={win}
            disabled={view === 'score'}
            onChange={e => setWin(e.target.value as Window)}
            className="mt-1 w-full rounded-md border border-border bg-background text-foreground text-sm px-2 py-1.5 disabled:opacity-40"
          >
            <option value="7d">7d</option>
            <option value="30d">30d</option>
            <option value="90d">90d</option>
            <option value="all">All time</option>
          </select>
        </label>
      </section>

      {/* Fixed-size embed (as a 3rd-party site would paste) */}
      <section>
        <h2 className="text-sm font-semibold mb-2">1. Fixed-size embed</h2>
        <p className="text-xs text-muted-foreground mb-3">Exact <code>width × height</code> from the copy-paste snippet — this is what a marketing site usually renders.</p>
        <div className="rounded-lg border border-dashed border-border p-4 bg-secondary/30 inline-block">
          <iframe
            key={`fixed-${url}`}
            src={url}
            width={dims.w}
            height={dims.h}
            style={{ border: 0, borderRadius: 12 }}
            title="Widget fixed"
          />
        </div>
      </section>

      {/* Responsive embed - fluid container */}
      <section>
        <h2 className="text-sm font-semibold mb-2">2. Responsive container</h2>
        <p className="text-xs text-muted-foreground mb-3">
          Iframe with <code>max-width:100%</code> inside a fluid wrapper. Resize the browser to confirm it scales without overflow.
        </p>
        <div className="rounded-lg border border-dashed border-border p-4 bg-secondary/30">
          <iframe
            key={`fluid-${url}`}
            src={url}
            width={dims.w}
            height={dims.h}
            style={{ border: 0, borderRadius: 12, maxWidth: '100%' }}
            title="Widget fluid"
          />
        </div>
      </section>

      {/* Narrow mobile column */}
      <section>
        <h2 className="text-sm font-semibold mb-2">3. Mobile column (320px)</h2>
        <p className="text-xs text-muted-foreground mb-3">Simulates a narrow phone column. The widget should clamp to the container width.</p>
        <div className="w-[320px] max-w-full rounded-lg border border-dashed border-border p-4 bg-secondary/30">
          <iframe
            key={`mobile-${url}`}
            src={url}
            width={dims.w}
            height={dims.h}
            style={{ border: 0, borderRadius: 12, maxWidth: '100%' }}
            title="Widget mobile"
          />
        </div>
      </section>

      {/* Embed snippet */}
      <section>
        <h2 className="text-sm font-semibold mb-2">Copy-paste embed code</h2>
        <pre className="bg-secondary rounded-lg p-3 text-[11px] font-mono text-foreground overflow-x-auto whitespace-pre-wrap break-all">
{embedCode}
        </pre>
      </section>
    </div>
  );
};

export default WidgetTest;
