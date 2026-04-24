import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { RotateCcw } from 'lucide-react';

interface EconomyPin {
  id: string;
  name: string;
  slug: string;
  city?: string | null;
  country?: string | null;
  lat?: number | null;
  lng?: number | null;
  bbox_north?: number | null;
  bbox_south?: number | null;
  bbox_east?: number | null;
  bbox_west?: number | null;
  monthlyTransactions?: number;
  merchants?: number;
}

interface Props {
  economies: EconomyPin[];
}

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';

const getCenter = (e: EconomyPin): [number, number] | null => {
  if (e.lat != null && e.lng != null) return [Number(e.lng), Number(e.lat)];
  if (e.bbox_north != null && e.bbox_south != null && e.bbox_east != null && e.bbox_west != null) {
    return [(Number(e.bbox_east) + Number(e.bbox_west)) / 2, (Number(e.bbox_north) + Number(e.bbox_south)) / 2];
  }
  return null;
};

const GlobalEconomiesMap = ({ economies }: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const initialBoundsRef = useRef<mapboxgl.LngLatBounds | null>(null);

  useEffect(() => {
    if (!containerRef.current || !MAPBOX_TOKEN) return;
    mapboxgl.accessToken = MAPBOX_TOKEN;

    const pinned = economies
      .map(e => ({ eco: e, coords: getCenter(e) }))
      .filter((x): x is { eco: EconomyPin; coords: [number, number] } => x.coords !== null);

    const isMobile = window.innerWidth < 768;

    // Desktop only: force explicit pixel dimensions on the container before init
    // so Mapbox doesn't read a 0px height during section reorder/animation.
    if (!isMobile && containerRef.current) {
      containerRef.current.style.width = '100%';
      containerRef.current.style.height = '450px';
    }

    mapRef.current = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [20, 10],
      zoom: 1.5,
    });

    mapRef.current.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');

    const maxTxns = Math.max(1, ...pinned.map(p => p.eco.monthlyTransactions ?? 0));

    const addAllEconomyPins = () => {
      if (!mapRef.current) return;
      pinned.forEach(({ eco, coords }) => {
        const txns = eco.monthlyTransactions ?? 0;
        const size = 12 + Math.round((Math.min(txns, maxTxns) / maxTxns) * 14);

        const el = document.createElement('div');
        el.style.width = `${size}px`;
        el.style.height = `${size}px`;
        el.style.borderRadius = '50%';
        el.style.backgroundColor = '#F7931A';
        el.style.border = '2px solid #0A0F1E';
        el.style.boxShadow = '0 0 0 2px rgba(247, 147, 26, 0.25), 0 4px 12px rgba(247, 147, 26, 0.4)';
        el.style.cursor = 'pointer';
        el.style.transition = 'transform 0.15s ease';
        el.addEventListener('mouseenter', () => { el.style.transform = 'scale(1.2)'; });
        el.addEventListener('mouseleave', () => { el.style.transform = 'scale(1)'; });

        const popup = new mapboxgl.Popup({ offset: size / 2 + 8, closeButton: true, maxWidth: '260px' }).setHTML(`
          <div style="color:#0A0F1E;font-family:'Plus Jakarta Sans',sans-serif;padding:4px 2px;min-width:200px">
            <div style="font-weight:700;font-size:14px;margin-bottom:2px">${eco.name}</div>
            <div style="font-size:11px;color:#6B7280;margin-bottom:8px">${eco.city || ''}${eco.city && eco.country ? ', ' : ''}${eco.country || ''}</div>
            <div style="display:flex;gap:12px;margin-bottom:10px">
              <div>
                <div style="font-family:'JetBrains Mono',monospace;font-weight:700;font-size:14px;color:#F7931A">${txns.toLocaleString()}</div>
                <div style="font-size:10px;color:#6B7280;text-transform:uppercase;letter-spacing:0.05em">Txns/mo</div>
              </div>
              <div>
                <div style="font-family:'JetBrains Mono',monospace;font-weight:700;font-size:14px;color:#111827">${(eco.merchants ?? 0).toLocaleString()}</div>
                <div style="font-size:10px;color:#6B7280;text-transform:uppercase;letter-spacing:0.05em">Merchants</div>
              </div>
            </div>
            <a href="/c/${eco.slug}" style="display:inline-block;background:#F7931A;color:#0A0F1E;font-weight:600;font-size:12px;padding:6px 12px;border-radius:8px;text-decoration:none">View Economy →</a>
          </div>
        `);

        new mapboxgl.Marker(el).setLngLat(coords).setPopup(popup).addTo(mapRef.current!);
      });
    };

    const fitMapToPins = () => {
      if (!mapRef.current) return;
      if (pinned.length >= 2) {
        const bounds = new mapboxgl.LngLatBounds();
        pinned.forEach(p => bounds.extend(p.coords));
        mapRef.current.fitBounds(bounds, { padding: 60, maxZoom: 6, duration: 0 });
        initialBoundsRef.current = bounds;
      } else if (pinned.length === 1) {
        mapRef.current.setCenter(pinned[0].coords);
        mapRef.current.setZoom(8);
      }
    };

    const map = mapRef.current;
    const container = containerRef.current;
    const triggerResize = () => mapRef.current?.resize();

    if (isMobile) {
      // Keep existing working mobile behavior: add pins immediately + resize nudges
      addAllEconomyPins();
      fitMapToPins();
      requestAnimationFrame(triggerResize);
      map.once('load', triggerResize);
    } else {
      // Desktop: wait for map to be fully idle (style + tiles loaded, container sized)
      // before plotting pins. Guard with a flag so we only run once.
      let pinsAlreadyAdded = false;
      map.on('idle', () => {
        if (pinsAlreadyAdded) return;
        pinsAlreadyAdded = true;
        map.resize();
        addAllEconomyPins();
        fitMapToPins();
      });
    }

    const t1 = window.setTimeout(triggerResize, 250);
    const t2 = window.setTimeout(triggerResize, 800);

    // Observe container size changes (e.g., when it becomes visible)
    let ro: ResizeObserver | null = null;
    if (container && typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => {
        triggerResize();
        if (!isMobile) {
          window.setTimeout(fitMapToPins, 200);
        }
      });
      ro.observe(container);
    }

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      ro?.disconnect();
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [economies]);

  const handleReset = () => {
    if (!mapRef.current) return;
    if (initialBoundsRef.current) {
      mapRef.current.fitBounds(initialBoundsRef.current, { padding: 60, maxZoom: 6, duration: 600 });
    } else {
      mapRef.current.flyTo({ center: [20, 10], zoom: 1.5 });
    }
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.5 }}
      className="container pt-10 pb-4"
    >
      <div className="mb-5">
        <h2 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">Bitcoin Circular Economies Worldwide</h2>
        <p className="text-sm text-muted-foreground mt-1">Every pin is a real community using Bitcoin.</p>
      </div>

      <div className="relative rounded-2xl border border-border overflow-hidden bg-card">
        {!MAPBOX_TOKEN ? (
          <div className="h-[300px] md:h-[450px] flex items-center justify-center text-muted-foreground text-sm">
            <span className="font-mono">Set VITE_MAPBOX_TOKEN to enable map</span>
          </div>
        ) : (
          <>
            <div ref={containerRef} className="h-[300px] md:h-[450px] w-full" />
            <button
              onClick={handleReset}
              className="absolute top-3 left-3 z-10 inline-flex items-center gap-1.5 rounded-lg bg-background/90 backdrop-blur border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:border-score-amber/50 hover:text-score-amber transition-colors shadow-sm"
              title="Reset view"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset view
            </button>
            <div className="absolute bottom-3 right-3 rounded-lg bg-background/90 backdrop-blur border border-border px-3 py-1.5 text-[11px] text-muted-foreground">
              <span className="font-mono font-semibold text-score-amber">{economies.filter(e => getCenter(e)).length}</span> economies plotted
            </div>
          </>
        )}
      </div>
    </motion.section>
  );
};

export default GlobalEconomiesMap;
