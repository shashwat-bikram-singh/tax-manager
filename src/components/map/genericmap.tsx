import React, { useEffect, useRef, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import './projectmap.css';
import { useFetchAll } from '@/hooks/useFetchAll';
import type { Map } from '@/type/genericmap';

/* ─── GeoJSON asset map (Vite) ──────────────────────────────────────────── */
const GEO_ASSET_URLS: Record<string, string> = (() => {
  const modules = import.meta.glob<string>('../../assets/map/**/*.geojson', {
    eager: true,
    query: '?url',
    import: 'default',
  }) as Record<string, string>;
  const out: Record<string, string> = {};
  for (const [fullKey, url] of Object.entries(modules)) {
    const key = fullKey.replace(/\\/g, '/');
    const m = key.match(/assets\/map\/(.+\.geojson)$/i);
    if (m) out[m[1]] = url as string;
  }
  return out;
})();

/* ─── Dynamic Marker Generator (Land / Building Separation) ──────────────── */
function getMarkerIcon(type: string) {
  const normalizedType = type.toLowerCase();

  let markerColor = '#6b7280'; // fallback gray
  let glowColor = 'rgba(107,114,128,0.35)';

  if (normalizedType === 'land') {
    markerColor = '#10b981'; // emerald-500 (Green)
    glowColor = 'rgba(16,185,129,0.4)';
  } else if (normalizedType === 'building') {
    markerColor = '#3b82f6'; // blue-500 (Blue)
    glowColor = 'rgba(59,130,246,0.4)';
  }

  return L.divIcon({
    className: 'project-map-pin-custom',
    html: `
      <span style="
        position:relative;
        display:flex;
        align-items:center;
        justify-content:center;
        width:14px;height:14px;
      ">
        <span style="
          position:absolute;top:50%;left:50%;
          transform:translate(-50%,-50%);
          width:24px;height:24px;
          border-radius:50%;
          background:${glowColor};
          animation:pulse-ring 2s ease-out infinite;
        "></span>
        <span style="
          position:relative;z-index:1;
          display:block;
          width:13px;height:13px;
          border-radius:50%;
          background:${markerColor};
          border:2px solid #fff;
          box-shadow:0 2px 5px rgba(0,0,0,0.3);
        "></span>
      </span>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

/* ─── Shared Custom Reset Button ────────────────────────────────────────── */
function createResetControl(onReset: () => void): L.Control {
  const ResetControl = L.Control.extend({
    options: { position: 'topleft' as L.ControlPosition },
    onAdd() {
      const btn = L.DomUtil.create('button', 'leaflet-bar leaflet-control');
      btn.title = 'Reset to Nepal view';
      btn.setAttribute('aria-label', 'Reset map view');
      btn.style.cssText = `
        display:flex;align-items:center;justify-content:center;
        width:34px;height:34px;cursor:pointer;
        background:#fff;border:none;border-radius:4px;
        box-shadow:0 1px 5px rgba(0,0,0,0.25);
        font-size:16px;color:#374151;
        transition:background 0.15s,color 0.15s;
      `;
      btn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" stroke-width="2.2"
          stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
          <path d="M3 3v5h5"/>
        </svg>
      `;
      btn.onmouseenter = () => { btn.style.background = '#eff6ff'; btn.style.color = '#2563eb'; };
      btn.onmouseleave = () => { btn.style.background = '#fff'; btn.style.color = '#374151'; };
      L.DomEvent.on(btn, 'click', (e) => { L.DomEvent.stopPropagation(e); onReset(); });
      return btn;
    },
    onRemove() { },
  });
  return new ResetControl();
}

/* ─── Helpers ───────────────────────────────────────────────────────────── */
async function fetchBundledGeoJson(relPath: string): Promise<unknown | null> {
  let url = GEO_ASSET_URLS[relPath];
  if (!url) {
    const hit = Object.keys(GEO_ASSET_URLS).find(
      (k) => k.toLowerCase() === relPath.toLowerCase(),
    );
    if (hit) url = GEO_ASSET_URLS[hit];
  }
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

function groupBy<T>(xs: T[], key: keyof T): Record<string, T[]> {
  return xs.reduce<Record<string, T[]>>((rv, x) => {
    const k = String(x[key]);
    (rv[k] = rv[k] || []).push(x);
    return rv;
  }, {});
}

const PROVINCE_FILL_PALETTE = [
  '#bfdbfe', '#bbf7d0', '#fde68a', '#fbcfe8',
  '#ddd6fe', '#a5f3fc', '#fed7aa', '#e2e8f0',
  '#c7d2fe', '#d9f99d', '#fecdd3', '#e9d5ff',
];

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function getProvinceBaseStyle(feature: GeoJSON.Feature): L.PathOptions {
  const p = feature.properties as { name_en?: string; name?: string } | undefined;
  const key = p?.name_en?.trim() || p?.name?.trim() || '';
  return {
    color: '#475569',
    fillColor: PROVINCE_FILL_PALETTE[hashString(key) % PROVINCE_FILL_PALETTE.length],
    weight: 1,
    fillOpacity: 0.45,
  };
}

function getProvinceHoverStyle(feature: GeoJSON.Feature): L.PathOptions {
  const base = getProvinceBaseStyle(feature);
  return { ...base, color: '#0f172a', weight: 2, fillOpacity: Math.min(0.78, (base.fillOpacity ?? 0.45) + 0.22) };
}

const hoverStyle: L.PathOptions = { color: '#0f172a', fillColor: '#93c5fd', weight: 2, fillOpacity: 0.35 };
const selectedStyle: L.PathOptions = { color: '#dc2626', fillColor: '#fca5a5', weight: 3, fillOpacity: 0.22 };

function hideTooltips(layers: L.Layer[]) {
  layers.forEach((l) => {
    if ('closeTooltip' in l) (l as L.Path).closeTooltip();
  });
}

function districtGeoPaths(feature: GeoJSON.Feature): string[] {
  const p = feature.properties as Record<string, string | undefined> | undefined;
  if (!p) return [];
  const nameEn = p.name_en?.trim();
  const name = p.name?.trim();
  const paths: string[] = [];
  if (nameEn) paths.push(`districts/${nameEn}.geojson`);
  if (name && name !== nameEn) paths.push(`districts/${name}.geojson`);
  return paths;
}

/* ─── Types ─────────────────────────────────────────────────────────────── */
interface MapItem {
  type: string;
  name: string;
  lat: number;
  lng: number;
}

/* ─── Pure function: build markers and add them to the map ──────────────── */
function addPropertyMarkers(
  properties: Map[],
  map: L.Map,
  layersCtrl: L.Control.Layers,
  addedOverlays: Set<string>,
) {
  const items: MapItem[] = properties
    .map((item): MapItem | null => {
      const lat = item.Latitude ? parseFloat(String(item.Latitude)) : null;
      const lng = item.Longitude ? parseFloat(String(item.Longitude)) : null;

      if (
        lat === null ||
        lng === null ||
        Number.isNaN(lat) ||
        Number.isNaN(lng)
      ) {
        console.log('Skipped (no coords):', item.Name);
        return null;
      }

      return {
        type: String(item.PropertyType || 'Unknown'),
        name: item.Name?.trim() || 'Unnamed Property',
        lat,
        lng,
      };
    })
    .filter((x): x is MapItem => x !== null);

  if (!items.length) {
    console.warn('[ProjectMap] No properties with valid coordinates.');
    return;
  }

  const grouped = groupBy(items, 'type');
  const allLatLngs: L.LatLng[] = [];

  Object.entries(grouped).forEach(([typeKey, group]) => {
    if (addedOverlays.has(typeKey)) return;
    addedOverlays.add(typeKey);

    const markers: L.Layer[] = group
      .map((property): L.Layer | null => {
        const ll = L.latLng(property.lat, property.lng);
        allLatLngs.push(ll);

        // FIXED: String interpolation syntax token sequence
        const gmaps = `https://www.google.com/maps/search/?api=1&query=${property.lat},${property.lng}`;

        const norm = property.type.toLowerCase();
        const popupColor = norm === 'land' ? '#10b981' : norm === 'building' ? '#3b82f6' : '#6b7280';

        return L.marker(ll, { icon: getMarkerIcon(property.type) }).bindPopup(
          `<div style="font-size:13px;line-height:1.5;min-width:160px;">
            <strong style="color:#1e293b">${property.name}</strong>
            <div style="margin-top:4px;display:flex;align-items:center;gap:6px;">
              <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${popupColor};"></span>
              <span style="background:#f1f5f9;border-radius:4px;padding:2px 6px;
                           font-size:11px;color:#475569;font-weight:600;">${typeKey}</span>
            </div>
            <div style="margin-top:8px;">
              <a href="${gmaps}" target="_blank" rel="noreferrer"
                 style="color:#2563eb;font-size:11px;text-decoration:underline;">
                Open in Google Maps ↗
              </a>
            </div>
          </div>`,
          { maxWidth: 240 },
        );
      })
      .filter((m): m is L.Layer => m !== null);

    if (!markers.length) return;

    const group_ = L.layerGroup(markers);
    group_.addTo(map);

    const norm = typeKey.toLowerCase();
    const legendColor = norm === 'land' ? '#10b981' : norm === 'building' ? '#3b82f6' : '#6b7280';
    const labelWithLegend = `
      <span style="display:inline-flex;align-items:center;gap:6px;">
        <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${legendColor};"></span>
        <span>${typeKey} (${markers.length})</span>
      </span>
    `;

    layersCtrl.addOverlay(group_, labelWithLegend);
  });

  if (allLatLngs.length) {
    const bounds = L.latLngBounds(allLatLngs);
    if (bounds.getNorthEast().distanceTo(bounds.getSouthWest()) < 500_000) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
  }
}

/* ─── Component ─────────────────────────────────────────────────────────── */
export const GenericMap: React.FC<{ className?: string }> = ({ className }) => {
  const { items: propertyResponse } = useFetchAll<Map>('/api/generic-info', ['generic info']);
  const mapElRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layersCtrlRef = useRef<L.Control.Layers | null>(null);
  const addedOverlaysRef = useRef<Set<string>>(new Set());

  const provinceLayerRef = useRef<L.GeoJSON | null>(null);
  const districtLayerRef = useRef<L.GeoJSON | null>(null);
  const localBodyLayerRef = useRef<L.GeoJSON | null>(null);

  const HOME_CENTER: L.LatLngExpression = [28.3949, 84.124];
  const HOME_ZOOM = 7;

  // ── FIX 1: Parse the JSON string that comes back from the API ──────────
  const mapData: Map[] = useMemo(() => {
    try {
      const raw = (propertyResponse as any)?.data?.[0]?.mapData;

      if (!raw) return [];
      return typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch (err) {
      console.error('[ProjectMap] Failed to parse mapData JSON:', err);
      return [];
    }
  }, [propertyResponse]);

  const pendingPropertiesRef = useRef<Map[]>([]);

  // ── FIX 2: Use mapData (parsed array) instead of propertyResponse?.data ─
  useEffect(() => {
    pendingPropertiesRef.current = mapData;

    if (mapData.length && mapRef.current && layersCtrlRef.current) {
      addPropertyMarkers(mapData, mapRef.current, layersCtrlRef.current, addedOverlaysRef.current);
    }
  }, [mapData]);

  // ── Map initialisation — runs exactly once ──────────────────────────────
  useEffect(() => {
    const el = mapElRef.current;
    if (!el) return;

    let cancelled = false;

    const provinceTooltipLayers: L.Layer[] = [];
    let districtTooltipLayers: L.Layer[] = [];
    let localBodyTooltipLayers: L.Layer[] = [];
    let selectedLayer: L.Path | null = null;

    const districtRestyle: L.PathOptions = {
      color: '#334155', fillColor: '#cbd5e1', weight: 1, fillOpacity: 0.65,
    };

    const run = async () => {
      const raw = await fetchBundledGeoJson('all_provinces.geojson');
      if (cancelled) return;
      if (!raw) { toast.error('Could not load province boundaries from app assets.'); return; }

      const osmLayer = L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
        { maxZoom: 20, attribution: '© OpenStreetMap © CARTO' },
      );
      const esriImagery = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        { maxZoom: 19, attribution: 'Tiles © Esri' },
      );

      const map = L.map(el, {
        scrollWheelZoom: true,
        dragging: true,
        doubleClickZoom: false,
        center: HOME_CENTER,
        zoom: HOME_ZOOM,
        zoomControl: true,
        attributionControl: true,
      });
      mapRef.current = map;
      osmLayer.addTo(map);

      const layersCtrl = L.control.layers(
        { 'Carto light': osmLayer, 'Satellite (Esri)': esriImagery },
        undefined,
        { position: 'topright', collapsed: false },
      );
      layersCtrl.addTo(map);
      layersCtrlRef.current = layersCtrl;

      /* ── Reset View Integration ── */
      const resetControl = createResetControl(() => {
        provinceLayerRef.current?.remove();
        districtLayerRef.current?.remove();
        localBodyLayerRef.current?.remove();
        provinceLayerRef.current = null;
        districtLayerRef.current = null;
        localBodyLayerRef.current = null;
        selectedLayer = null;
        districtTooltipLayers = [];
        localBodyTooltipLayers = [];

        map.flyTo(HOME_CENTER, HOME_ZOOM, { animate: true, duration: 0.8 });
        toast.success('Map reset to Nepal overview');
      });
      resetControl.addTo(map);

      /* Province boundaries */
      L.geoJSON(raw as GeoJSON.GeoJsonObject, {
        style: (feat) => getProvinceBaseStyle(feat as GeoJSON.Feature),
        onEachFeature(feature: GeoJSON.Feature, layer) {
          const path = layer as L.Path;
          const name = (feature.properties as { name?: string })?.name ?? '';
          path.bindTooltip(name, { permanent: true, direction: 'center', className: 'map-label' });
          provinceTooltipLayers.push(layer);

          path.on({
            mouseover: () => path.setStyle(getProvinceHoverStyle(feature)),
            mouseout: () => path.setStyle(getProvinceBaseStyle(feature)),
            click: async () => {
              const provinceName = (feature.properties as { name_en?: string })?.name_en;
              if (!provinceName) {
                toast.message('This province has no English id in data; cannot open detail file.');
                return;
              }
              hideTooltips(provinceTooltipLayers);
              const provinceData = await fetchBundledGeoJson(`provinces/${provinceName}.geojson`);
              if (cancelled) return;
              if (!provinceData) { toast.error(`Missing asset: provinces/${provinceName}.geojson`); return; }

              provinceLayerRef.current?.remove();
              districtLayerRef.current?.remove();
              localBodyLayerRef.current?.remove();
              districtTooltipLayers = [];
              localBodyTooltipLayers = [];

              provinceLayerRef.current = L.geoJSON(provinceData as GeoJSON.GeoJsonObject, {
                style: { color: '#475569', fillColor: '#cbd5e1', weight: 1, fillOpacity: 0.55 },
                onEachFeature(dFeature: GeoJSON.Feature, dLayer) {
                  const dPath = dLayer as L.Path;
                  const dName = (dFeature.properties as { name?: string })?.name ?? '';
                  dPath.bindTooltip(dName, { permanent: true, direction: 'center', className: 'map-label' });
                  districtTooltipLayers.push(dLayer);
                  dPath.on({
                    mouseover: () => dPath.setStyle(hoverStyle),
                    mouseout: () => dPath.setStyle(districtRestyle),
                    click: () => { hideTooltips(districtTooltipLayers); void loadDistrict(dFeature); },
                  });
                },
              }).addTo(map);
              map.fitBounds(provinceLayerRef.current.getBounds(), { padding: [20, 20] });
            },
          });
        },
      }).addTo(map);

      async function loadDistrict(dFeature: GeoJSON.Feature) {
        const candidates = districtGeoPaths(dFeature);
        let districtData: unknown | null = null;
        for (const c of candidates) { districtData = await fetchBundledGeoJson(c); if (districtData) break; }
        if (cancelled) return;
        if (!districtData) {
          toast.error(candidates.length ? `No district GeoJSON for: ${candidates.join(' / ')}` : 'No district name.');
          return;
        }
        districtLayerRef.current?.remove();
        localBodyLayerRef.current?.remove();
        localBodyTooltipLayers = [];

        districtLayerRef.current = L.geoJSON(districtData as GeoJSON.GeoJsonObject, {
          style: { color: '#0f172a', fillColor: '#94a3b8', weight: 1, fillOpacity: 0.55 },
          onEachFeature(lFeature: GeoJSON.Feature, lLayer) {
            const lPath = lLayer as L.Path;
            const lbName =
              (lFeature.properties as { name?: string })?.name ??
              (lFeature.properties as { name_en?: string })?.name_en ?? '';
            lPath.bindTooltip(lbName, { permanent: true, direction: 'center', className: 'map-label' });
            localBodyTooltipLayers.push(lLayer);
            lPath.on({
              mouseover: () => lPath.setStyle(hoverStyle),
              mouseout: () => { if (selectedLayer !== lPath) districtLayerRef.current?.resetStyle(lPath); },
              click: () => {
                if (selectedLayer) districtLayerRef.current?.resetStyle(selectedLayer);
                selectedLayer = lPath;
                lPath.setStyle(selectedStyle);
                void loadLocalBody(lFeature);
              },
            });
          },
        }).addTo(map);
        map.fitBounds(districtLayerRef.current.getBounds(), { padding: [20, 20] });
      }

      async function loadLocalBody(lFeature: GeoJSON.Feature) {
        const p = lFeature.properties as { name?: string; name_en?: string } | undefined;
        const lbName = (p?.name ?? p?.name_en ?? '').trim();
        if (!lbName) return;
        const localData = await fetchBundledGeoJson(`localbody/${lbName}.geojson`);
        if (cancelled) return;
        if (!localData) {
          toast.message('Ward-level GeoJSON not bundled; selection is highlighted only.');
          return;
        }
        localBodyLayerRef.current?.remove();
        localBodyLayerRef.current = L.geoJSON(localData as GeoJSON.GeoJsonObject, {
          style: { color: '#0f172a', fillColor: '#cbd5e1', weight: 1, fillOpacity: 0.45 },
          onEachFeature(f: GeoJSON.Feature, l) {
            const path = l as L.Path;
            const nm = (f.properties as { name?: string })?.name ?? '';
            path.bindTooltip(nm, { permanent: true, direction: 'center', className: 'map-label' });
            path.on({
              mouseover: () => path.setStyle(hoverStyle),
              mouseout: () => { if (selectedLayer !== path) localBodyLayerRef.current?.resetStyle(path); },
              click: () => {
                if (selectedLayer) localBodyLayerRef.current?.resetStyle(selectedLayer);
                selectedLayer = path;
                path.setStyle(selectedStyle);
              },
            });
          },
        }).addTo(map);
        map.fitBounds(localBodyLayerRef.current.getBounds(), { padding: [20, 20] });
      }

      map.invalidateSize();

      if (pendingPropertiesRef.current.length) {
        addPropertyMarkers(
          pendingPropertiesRef.current,
          map,
          layersCtrl,
          addedOverlaysRef.current,
        );
      }
    };

    void run();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      layersCtrlRef.current = null;
      addedOverlaysRef.current.clear();
    };
  }, []);

  return (
    <div
      className={cn(
        'project-map flex h-full min-h-[420px] w-full overflow-hidden rounded-xl border border-border-main bg-white shadow-sm',
        className,
      )}
    >
      <style>{`
        @keyframes pulse-ring {
          0%   { opacity: 0.7; transform: translate(-50%, -50%) scale(0.8); }
          70%  { opacity: 0;   transform: translate(-50%, -50%) scale(1.5); }
          100% { opacity: 0;   transform: translate(-50%, -50%) scale(1.5); }
        }
      `}</style>
      <div
        ref={mapElRef}
        className="relative z-0 min-h-0 min-w-0 flex-1"
        role="application"
        aria-label="Nepal map"
      />
    </div>
  );
};