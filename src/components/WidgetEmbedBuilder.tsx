import { useMemo, useState } from 'react';
import { Check, Copy, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

type View = 'score' | 'stats' | 'map';
type Window = '7d' | '30d' | '90d' | 'all';

const VIEW_OPTIONS: { id: View; label: string; desc: string; width: number; height: number }[] = [
  { id: 'score', label: 'Score', desc: 'Live circularity score badge', width: 320, height: 160 },
  { id: 'stats', label: 'Stats', desc: 'Merchants · earners · transactions', width: 380, height: 180 },
  { id: 'map', label: 'Map', desc: 'Interactive merchant map', width: 480, height: 360 },
];

const WINDOW_OPTIONS: { id: Window; label: string }[] = [
  { id: '7d', label: '7 days' },
  { id: '30d', label: '30 days' },
  { id: '90d', label: '90 days' },
  { id: 'all', label: 'All time' },
];

interface Props {
  slug: string;
}

const WidgetEmbedBuilder = ({ slug }: Props) => {
  const [view, setView] = useState<View>('score');
  const [win, setWin] = useState<Window>('30d');
  const [copied, setCopied] = useState(false);

  const dims = VIEW_OPTIONS.find(v => v.id === view)!;

  const url = useMemo(() => {
    const params = new URLSearchParams();
    params.set('view', view);
    if (view !== 'score') params.set('window', win);
    return `${window.location.origin}/widget/${slug}?${params.toString()}`;
  }, [slug, view, win]);

  const embedCode = useMemo(
    () =>
      `<iframe src="${url}" width="${dims.width}" height="${dims.height}" style="border:0;border-radius:12px;max-width:100%" loading="lazy" title="Bitcoin Circular widget"></iframe>`,
    [url, dims.width, dims.height],
  );

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(embedCode);
      setCopied(true);
      toast({ title: 'Embed code copied', description: 'Paste it into your website HTML.' });
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast({ title: 'Copy failed', description: 'Please select the code and copy manually.', variant: 'destructive' });
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Embeddable widget</h3>
          <p className="text-sm text-muted-foreground">
            Configure a widget for your website. Live preview below — paste the embed code into any HTML.
          </p>
        </div>
        <a
          href={url}
          target="_blank"
          rel="noopener"
          className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
        >
          Open <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      {/* View picker */}
      <div className="mb-4">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">View</div>
        <div className="grid grid-cols-3 gap-2">
          {VIEW_OPTIONS.map(v => (
            <button
              key={v.id}
              type="button"
              onClick={() => setView(v.id)}
              className={`text-left rounded-lg border p-3 transition-colors ${
                view === v.id
                  ? 'border-score-amber bg-score-amber/10'
                  : 'border-border bg-background hover:border-score-amber/40'
              }`}
            >
              <div className="text-sm font-semibold text-foreground">{v.label}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{v.desc}</div>
              <div className="text-[10px] font-mono text-muted-foreground mt-1.5">{v.width}×{v.height}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Window picker (stats + map only) */}
      {view !== 'score' && (
        <div className="mb-4">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Time window</div>
          <div className="flex flex-wrap gap-2">
            {WINDOW_OPTIONS.map(w => (
              <button
                key={w.id}
                type="button"
                onClick={() => setWin(w.id)}
                className={`text-xs rounded-full border px-3 py-1.5 transition-colors ${
                  win === w.id
                    ? 'border-score-amber bg-score-amber/10 text-foreground'
                    : 'border-border bg-background text-muted-foreground hover:border-score-amber/40 hover:text-foreground'
                }`}
              >
                {w.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Preview */}
      <div className="mb-4">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Live preview</div>
        <div className="rounded-lg border border-dashed border-border bg-secondary/30 p-4 flex items-center justify-center overflow-auto">
          <iframe
            key={url}
            src={url}
            width={dims.width}
            height={dims.height}
            style={{ border: 0, borderRadius: 12, maxWidth: '100%' }}
            title="Widget preview"
          />
        </div>
      </div>

      {/* Embed code */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Embed code</div>
          <Button size="sm" variant="outline" onClick={copy} className="h-7 text-xs rounded-full">
            {copied ? <><Check className="h-3 w-3 mr-1" /> Copied</> : <><Copy className="h-3 w-3 mr-1" /> Copy</>}
          </Button>
        </div>
        <pre className="bg-secondary rounded-lg p-3 text-[11px] font-mono text-foreground overflow-x-auto whitespace-pre-wrap break-all">
{embedCode}
        </pre>
      </div>
    </div>
  );
};

export default WidgetEmbedBuilder;
