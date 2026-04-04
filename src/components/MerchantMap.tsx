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
  }>;
}

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';

const MerchantMap = ({ merchants }: MerchantMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (!mapContainer.current || !MAPBOX_TOKEN) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    const validMerchants = merchants.filter(m => m.lat && m.lng);
    const center: [number, number] = validMerchants.length > 0
      ? [validMerchants[0].lng!, validMerchants[0].lat!]
      : [0, 20];

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center,
      zoom: validMerchants.length > 0 ? 13 : 2,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    validMerchants.forEach(m => {
      const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(
        `<div style="color:#0a0f1e;font-size:13px">
          <strong>${m.name}</strong><br/>
          <span style="text-transform:capitalize">${m.category}</span><br/>
          <span style="color:#666">${(m.payment_methods || []).join(', ')}</span>
        </div>`
      );

      const el = document.createElement('div');
      el.style.width = '12px';
      el.style.height = '12px';
      el.style.backgroundColor = '#f59e0b';
      el.style.borderRadius = '50%';
      el.style.border = '2px solid #0a0f1e';
      el.style.cursor = 'pointer';

      new mapboxgl.Marker(el)
        .setLngLat([m.lng!, m.lat!])
        .setPopup(popup)
        .addTo(map.current!);
    });

    return () => { map.current?.remove(); };
  }, [merchants]);

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
