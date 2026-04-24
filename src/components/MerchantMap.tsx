import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

interface MerchantMapProps {
  merchants: Array<{
    id: string;
    name: string;
    category: string;
    lat: number | null;
    lng: number | null;
    payment_methods: string[] | null;
    source?: string;
  }>;
  fallbackCenter?: { lat: number | null; lng: number | null } | null;
}

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';

const MerchantMap = ({ merchants, fallbackCenter }: MerchantMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (!mapContainer.current || !MAPBOX_TOKEN) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    const validMerchants = merchants.filter(m => m.lat && m.lng);

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

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    validMerchants.forEach(m => {
      const isBtcmap = m.source === 'btcmap';
      const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(
        `<div style="color:#0a0f1e;font-size:13px">
          <strong>${m.name}</strong>${isBtcmap ? ' <span style="background:#f59e0b;color:#0a0f1e;padding:1px 5px;border-radius:4px;font-size:10px;font-weight:600">BTCMap ⚡</span>' : ''}<br/>
          <span style="text-transform:capitalize">${m.category}</span><br/>
          <span style="color:#666">${(m.payment_methods || []).join(', ')}</span>
        </div>`
      );

      const el = document.createElement('div');
      el.style.width = '12px';
      el.style.height = '12px';
      el.style.backgroundColor = isBtcmap ? '#f59e0b' : '#818cf8';
      el.style.borderRadius = '50%';
      el.style.border = '2px solid #0a0f1e';
      el.style.cursor = 'pointer';

      new mapboxgl.Marker(el)
        .setLngLat([m.lng!, m.lat!])
        .setPopup(popup)
        .addTo(map.current!);
    });

    if (validMerchants.length >= 2) {
      const bounds = new mapboxgl.LngLatBounds();
      validMerchants.forEach(m => bounds.extend([m.lng!, m.lat!]));
      map.current.fitBounds(bounds, { padding: 60, maxZoom: 15, duration: 0 });
    }

    return () => { map.current?.remove(); };
  }, [merchants, fallbackCenter]);

  if (!MAPBOX_TOKEN) {
    return (
      <div className="h-[400px] bg-secondary/30 flex items-center justify-center text-muted-foreground text-sm">
        <span className="font-mono">Set VITE_MAPBOX_TOKEN to enable map</span>
      </div>
    );
  }

  return <div ref={mapContainer} className="h-[400px] w-full" />;
};

export default MerchantMap;
