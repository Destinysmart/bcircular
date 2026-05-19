import { useEffect, useMemo, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { MapPin, Tag, CreditCard, ExternalLink } from 'lucide-react';
import { useMapboxToken } from '@/hooks/useMapboxToken';

interface Merchant {
  id: string;
  name: string;
  category: string;
  lat: number | null;
  lng: number | null;
  payment_methods: string[] | null;
  source?: string;
}

interface MerchantMapProps {
  merchants: Merchant[];
  fallbackCenter?: { lat: number | null; lng: number | null } | null;
}



// Color tokens (mapbox needs literal hex; mirror our semantic palette)
const COLOR_VERIFIED = '#818cf8'; // primary indigo
const COLOR_BTCMAP = '#f59e0b'; // score-amber
const COLOR_BORDER = '#0a0f1e';

const titleCase = (s: string) =>
  s.replace(/[_-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

const MerchantMap = ({ merchants, fallbackCenter }: MerchantMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  const [activeCat, setActiveCat] = useState<string>('all');
  const [selected, setSelected] = useState<Merchant | null>(null);

  const validMerchants = useMemo(
    () => merchants.filter(m => m.lat != null && m.lng != null),
    [merchants],
  );

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    validMerchants.forEach(m => {
      const c = (m.category || 'other').toLowerCase();
      counts.set(c, (counts.get(c) || 0) + 1);
    });
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
  }, [validMerchants]);

  const filtered = useMemo(
    () => (activeCat === 'all'
      ? validMerchants
      : validMerchants.filter(m => (m.category || 'other').toLowerCase() === activeCat)),
    [validMerchants, activeCat],
  );

  const verifiedCount = validMerchants.filter(m => m.source !== 'btcmap').length;
  const btcmapCount = validMerchants.filter(m => m.source === 'btcmap').length;

  // Init map once
  useEffect(() => {
    if (!mapContainer.current || !MAPBOX_TOKEN || map.current) return;
    mapboxgl.accessToken = MAPBOX_TOKEN;

    let center: [number, number] = [20, 2];
    let zoom = 3;
    if (validMerchants.length === 1) {
      center = [validMerchants[0].lng!, validMerchants[0].lat!];
      zoom = 14;
    } else if (validMerchants.length === 0 && fallbackCenter?.lat && fallbackCenter?.lng) {
      center = [fallbackCenter.lng, fallbackCenter.lat];
      zoom = 11;
    }

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center,
      zoom,
    });
    map.current.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');

    return () => {
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];
      map.current?.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-render markers when filtered list changes
  useEffect(() => {
    if (!map.current) return;

    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    filtered.forEach(m => {
      const isBtcmap = m.source === 'btcmap';
      const el = document.createElement('button');
      el.type = 'button';
      el.setAttribute('aria-label', `View ${m.name}`);
      el.style.width = '14px';
      el.style.height = '14px';
      el.style.padding = '0';
      el.style.backgroundColor = isBtcmap ? COLOR_BTCMAP : COLOR_VERIFIED;
      el.style.borderRadius = '50%';
      el.style.border = `2px solid ${COLOR_BORDER}`;
      el.style.cursor = 'pointer';
      el.style.boxShadow = '0 0 0 1px rgba(255,255,255,0.15)';
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        setSelected(m);
      });

      const marker = new mapboxgl.Marker(el)
        .setLngLat([m.lng!, m.lat!])
        .addTo(map.current!);
      markersRef.current.push(marker);
    });

    if (filtered.length >= 2) {
      const bounds = new mapboxgl.LngLatBounds();
      filtered.forEach(m => bounds.extend([m.lng!, m.lat!]));
      map.current.fitBounds(bounds, { padding: 60, maxZoom: 15, duration: 400 });
    } else if (filtered.length === 1) {
      map.current.flyTo({ center: [filtered[0].lng!, filtered[0].lat!], zoom: 14, duration: 400 });
    }
  }, [filtered]);

  if (!MAPBOX_TOKEN) {
    return (
      <div className="h-[400px] bg-secondary/30 flex items-center justify-center text-muted-foreground text-sm">
        <span className="font-mono">Set VITE_MAPBOX_TOKEN to enable map</span>
      </div>
    );
  }

  return (
    <div>
      {/* Filters + legend */}
      <div className="flex flex-col gap-2 px-4 py-3 border-b border-border bg-card/50">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveCat('all')}
            className={`shrink-0 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors ${
              activeCat === 'all'
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-background text-muted-foreground hover:text-foreground'
            }`}
          >
            All <span className="opacity-70">{validMerchants.length}</span>
          </button>
          {categories.map(([cat, count]) => (
            <button
              key={cat}
              onClick={() => setActiveCat(cat)}
              className={`shrink-0 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors ${
                activeCat === cat
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-background text-muted-foreground hover:text-foreground'
              }`}
            >
              {titleCase(cat)} <span className="opacity-70">{count}</span>
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: COLOR_VERIFIED }} />
            Verified · {verifiedCount}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: COLOR_BTCMAP }} />
            BTCMap · {btcmapCount}
          </span>
          <span className="ml-auto opacity-70">Click a marker for details</span>
        </div>
      </div>

      <div ref={mapContainer} className="h-[400px] w-full" />

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="sm:max-w-md">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 pr-6">
                  {selected.name}
                  {selected.source === 'btcmap' && (
                    <Badge variant="outline" className="border-score-amber/40 text-score-amber bg-score-amber/10">
                      BTCMap
                    </Badge>
                  )}
                </DialogTitle>
                <DialogDescription className="sr-only">Merchant details</DialogDescription>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Tag className="h-4 w-4" />
                  <span className="capitalize">{titleCase(selected.category || 'Other')}</span>
                </div>
                {selected.payment_methods?.length ? (
                  <div className="flex items-start gap-2 text-muted-foreground">
                    <CreditCard className="h-4 w-4 mt-0.5" />
                    <div className="flex flex-wrap gap-1">
                      {selected.payment_methods.map(p => (
                        <Badge key={p} variant="secondary" className="text-[10px]">{p}</Badge>
                      ))}
                    </div>
                  </div>
                ) : null}
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span className="font-mono text-xs">
                    {selected.lat?.toFixed(4)}, {selected.lng?.toFixed(4)}
                  </span>
                </div>
                <a
                  href={`https://www.openstreetmap.org/?mlat=${selected.lat}&mlon=${selected.lng}#map=18/${selected.lat}/${selected.lng}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  Open in OpenStreetMap <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MerchantMap;
