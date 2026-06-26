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

/* ─── Marker icons (Land=pin, Building=house) ────────────────────────────── */
function getMarkerIcon(type: string): L.DivIcon {
  const norm = type.toLowerCase();
  const SIZE = 28;

  if (norm === 'land') {
    return L.divIcon({
      className: 'project-map-pin-custom',
      html: `<span style="position:relative;display:flex;align-items:center;justify-content:center;width:${SIZE}px;height:${SIZE}px;">
        <span style="
          position:absolute;top:50%;left:50%;
          transform:translate(-50%,-50%);
          width:36px;height:36px;border-radius:50%;
          background:rgba(16,185,129,0.30);
          animation:pulse-ring 2s ease-out infinite;
        "></span>
        <svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 24 24"
          style="position:relative;z-index:1;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.35));">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
            fill="#10b981" stroke="#fff" stroke-width="1.2"/>
          <circle cx="12" cy="9" r="2.5" fill="#fff"/>
        </svg>
      </span>`,
      iconSize: [SIZE, SIZE],
      iconAnchor: [SIZE / 2, SIZE],
    });
  }

  if (norm === 'building') {
    return L.divIcon({
      className: 'project-map-pin-custom',
      html: `<span style="position:relative;display:flex;align-items:center;justify-content:center;width:${SIZE}px;height:${SIZE}px;">
        <span style="
          position:absolute;top:50%;left:50%;
          transform:translate(-50%,-50%);
          width:36px;height:36px;border-radius:4px;
          background:rgba(59,130,246,0.30);
          animation:pulse-ring-sq 2s ease-out infinite;
        "></span>
        <svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 24 24"
          style="position:relative;z-index:1;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.35));">
          <path d="M3 9.5L12 3l9 6.5V21H3V9.5z" fill="#3b82f6" stroke="#fff" stroke-width="1.2" stroke-linejoin="round"/>
          <rect x="9" y="14" width="6" height="7" fill="#fff" opacity="0.9"/>
          <path d="M9 14h6v7H9z" fill="none" stroke="#3b82f6" stroke-width="0.8"/>
        </svg>
      </span>`,
      iconSize: [SIZE, SIZE],
      iconAnchor: [SIZE / 2, SIZE],
    });
  }

  // fallback
  return L.divIcon({
    className: 'project-map-pin-custom',
    html: `<span style="display:block;width:14px;height:14px;border-radius:50%;background:#6b7280;border:2px solid #fff;box-shadow:0 2px 5px rgba(0,0,0,0.3);"></span>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
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
  } catch { return null; }
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

function getProvinceBaseStyle(feature: GeoJSON.Feature, isSatellite = false): L.PathOptions {
  if (isSatellite) return { color: '#ffffff', fillColor: 'transparent', weight: 1.5, fillOpacity: 0 };
  const p = feature.properties as { name_en?: string; name?: string } | undefined;
  const key = p?.name_en?.trim() || p?.name?.trim() || '';
  return {
    color: '#475569',
    fillColor: PROVINCE_FILL_PALETTE[hashString(key) % PROVINCE_FILL_PALETTE.length],
    weight: 1,
    fillOpacity: 0.45,
  };
}

function getProvinceHoverStyle(feature: GeoJSON.Feature, isSatellite = false): L.PathOptions {
  if (isSatellite) return { color: '#3b82f6', fillColor: 'transparent', weight: 2, fillOpacity: 0 };
  const base = getProvinceBaseStyle(feature, false);
  return { ...base, color: '#0f172a', weight: 2, fillOpacity: Math.min(0.78, (base.fillOpacity ?? 0.45) + 0.22) };
}

function hideTooltips(layers: L.Layer[]) {
  layers.forEach((l) => { if ('closeTooltip' in l) (l as L.Path).closeTooltip(); });
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

const ZOOM_PROVINCE_MAX = 7;
const ZOOM_DISTRICT_MIN = 8;
const ZOOM_DISTRICT_MAX = 10;
const ZOOM_LOCALBODY_MIN = 11;

function setLayerLabelsVisible(layers: L.Layer[], visible: boolean) {
  layers.forEach((l) => {
    const path = l as L.Path;
    if (!path.getTooltip()) return;
    visible ? path.openTooltip() : path.closeTooltip();
  });
}

function syncVisibility(
  zoom: number,
  map: L.Map,
  provinceTooltipLayers: L.Layer[],
  districtTooltipLayersRef: React.MutableRefObject<L.Layer[]>,
  localBodyTooltipLayersRef: React.MutableRefObject<L.Layer[]>,
  provinceLayerRef: React.MutableRefObject<L.GeoJSON | null>,
  districtLayerRef: React.MutableRefObject<L.GeoJSON | null>,
  localBodyLayerRef: React.MutableRefObject<L.GeoJSON | null>,
  resetSelectionState: () => void,
) {
  setLayerLabelsVisible(provinceTooltipLayers, zoom <= ZOOM_PROVINCE_MAX);

  if (zoom <= ZOOM_PROVINCE_MAX) {
    if (provinceLayerRef.current) { map.removeLayer(provinceLayerRef.current); provinceLayerRef.current = null; }
    if (districtLayerRef.current) { map.removeLayer(districtLayerRef.current); districtLayerRef.current = null; }
    if (localBodyLayerRef.current) { map.removeLayer(localBodyLayerRef.current); localBodyLayerRef.current = null; }
    districtTooltipLayersRef.current = [];
    localBodyTooltipLayersRef.current = [];
    resetSelectionState();
    return;
  }

  const showDistricts = zoom >= ZOOM_DISTRICT_MIN && zoom <= ZOOM_DISTRICT_MAX;
  if (provinceLayerRef.current) {
    if (showDistricts && !map.hasLayer(provinceLayerRef.current)) provinceLayerRef.current.addTo(map);
    else if (!showDistricts && map.hasLayer(provinceLayerRef.current)) map.removeLayer(provinceLayerRef.current);
  }
  setLayerLabelsVisible(districtTooltipLayersRef.current, showDistricts);

  const showLocalBodies = zoom > ZOOM_DISTRICT_MAX && zoom < ZOOM_LOCALBODY_MIN;
  if (districtLayerRef.current) {
    if (showLocalBodies && !map.hasLayer(districtLayerRef.current)) districtLayerRef.current.addTo(map);
    else if (!showLocalBodies && map.hasLayer(districtLayerRef.current)) map.removeLayer(districtLayerRef.current);
  }

  const showWards = zoom >= ZOOM_LOCALBODY_MIN;
  if (localBodyLayerRef.current) {
    if (showWards && !map.hasLayer(localBodyLayerRef.current)) localBodyLayerRef.current.addTo(map);
    else if (!showWards && map.hasLayer(localBodyLayerRef.current)) map.removeLayer(localBodyLayerRef.current);
  }
  setLayerLabelsVisible(localBodyTooltipLayersRef.current, showWards);
}

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
        box-shadow:0 1px 5px rgba(0,0,0,0.25);font-size:16px;color:#374151;
        transition:background 0.15s,color 0.15s;
      `;
      btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>
      </svg>`;
      btn.onmouseenter = () => { btn.style.background = '#eff6ff'; btn.style.color = '#2563eb'; };
      btn.onmouseleave = () => { btn.style.background = '#fff'; btn.style.color = '#374151'; };
      L.DomEvent.on(btn, 'click', (e) => { L.DomEvent.stopPropagation(e); onReset(); });
      return btn;
    },
    onRemove() { },
  });
  return new ResetControl();
}

interface MapItem { type: string; name: string; lat: number; lng: number; }

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
      if (lat === null || lng === null || Number.isNaN(lat) || Number.isNaN(lng)) return null;
      return { type: String(item.PropertyType || 'Unknown'), name: item.Name?.trim() || 'Unnamed Property', lat, lng };
    })
    .filter((x): x is MapItem => x !== null);

  if (!items.length) return;

  const grouped = groupBy(items, 'type');
  const allLatLngs: L.LatLng[] = [];

  Object.entries(grouped).forEach(([typeKey, group]) => {
    if (addedOverlays.has(typeKey)) return;
    addedOverlays.add(typeKey);

    const markers: L.Layer[] = group
      .map((property): L.Layer | null => {
        const ll = L.latLng(property.lat, property.lng);
        allLatLngs.push(ll);

        const gmaps = `https://maps.google.com/?q=${property.lat},${property.lng}`;
        const norm = property.type.toLowerCase();
        const popupColor = norm === 'land' ? '#10b981' : norm === 'building' ? '#3b82f6' : '#6b7280';
        const shapeStyle = norm === 'building' ? 'border-radius:2px' : 'border-radius:50%';
        const shapeLabel = norm === 'land' ? '📍 Pin' : norm === 'building' ? '🏠 House' : '●';

        return L.marker(ll, { icon: getMarkerIcon(property.type) }).bindPopup(
          `<div style="font-size:13px;line-height:1.5;min-width:160px;">
            <strong style="color:#1e293b">${property.name}</strong>
            <div style="margin-top:4px;display:flex;align-items:center;gap:6px;">
              <span style="display:inline-block;width:8px;height:8px;${shapeStyle};background:${popupColor};"></span>
              <span style="background:#f1f5f9;border-radius:4px;padding:2px 6px;
                           font-size:11px;color:#475569;font-weight:600;">
                ${typeKey} ${shapeLabel}
              </span>
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
    const legendShape = norm === 'building' ? 'border-radius:2px' : 'border-radius:50%';

    layersCtrl.addOverlay(
      group_,
      `<span style="display:inline-flex;align-items:center;gap:6px;">
        <span style="display:inline-block;width:9px;height:9px;${legendShape};
                     background:${legendColor};border:1.5px solid #fff;
                     box-shadow:0 1px 3px rgba(0,0,0,0.2);"></span>
        <span>${typeKey} (${markers.length})</span>
      </span>`,
    );
  });

  if (allLatLngs.length) {
    const bounds = L.latLngBounds(allLatLngs);
    if (bounds.getNorthEast().distanceTo(bounds.getSouthWest()) < 500_000)
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
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

  const districtTooltipLayersRef = useRef<L.Layer[]>([]);
  const localBodyTooltipLayersRef = useRef<L.Layer[]>([]);
  const selectedLayerRef = useRef<L.Path | null>(null);
  const isSatelliteModeRef = useRef<boolean>(false);

  const HOME_CENTER: L.LatLngExpression = [28.3949, 84.124];
  const HOME_ZOOM = 7;

  const mapData: Map[] = useMemo(() => {
    try {
      const raw = (propertyResponse as any)?.data?.[0]?.mapData;
      if (!raw) return [];
      return typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch (err) {
      console.error('[GenericMap] Failed to parse mapData JSON:', err);
      return [];
    }
  }, [propertyResponse]);

  const pendingPropertiesRef = useRef<Map[]>([]);

  useEffect(() => {
    pendingPropertiesRef.current = mapData;
    if (mapData.length && mapRef.current && layersCtrlRef.current) {
      addPropertyMarkers(mapData, mapRef.current, layersCtrlRef.current, addedOverlaysRef.current);
    }
  }, [mapData]);

  useEffect(() => {
    const el = mapElRef.current;
    if (!el) return;

    let cancelled = false;
    let baseProvinceGeoJSON: L.GeoJSON | null = null;
    const provinceTooltipLayers: L.Layer[] = [];

    const standardDistrictStyle: L.PathOptions = { color: '#334155', fillColor: '#cbd5e1', weight: 1, fillOpacity: 0.65 };
    const satelliteDistrictStyle: L.PathOptions = { color: '#ffffff', fillColor: 'transparent', weight: 1.5, fillOpacity: 0 };

    const getDynamicStyles = () => {
      const sat = isSatelliteModeRef.current;
      return {
        hover: sat ? { color: '#3b82f6', fillColor: 'transparent', weight: 2, fillOpacity: 0 } : { color: '#0f172a', fillColor: '#93c5fd', weight: 2, fillOpacity: 0.35 },
        selected: sat ? { color: '#ef4444', fillColor: 'transparent', weight: 2.5, fillOpacity: 0 } : { color: '#dc2626', fillColor: '#fca5a5', weight: 3, fillOpacity: 0.22 },
        districtBase: sat ? satelliteDistrictStyle : standardDistrictStyle,
        nestedBase: sat ? { color: '#ffffff', fillColor: 'transparent', weight: 1.2, fillOpacity: 0 } : { color: '#0f172a', fillColor: '#94a3b8', weight: 1, fillOpacity: 0.55 },
        wardBase: sat ? { color: '#ffffff', fillColor: 'transparent', weight: 1, fillOpacity: 0 } : { color: '#0f172a', fillColor: '#cbd5e1', weight: 1, fillOpacity: 0.45 },
      };
    };

    const doSync = (zoom: number) =>
      syncVisibility(
        zoom, mapRef.current!,
        provinceTooltipLayers,
        districtTooltipLayersRef, localBodyTooltipLayersRef,
        provinceLayerRef, districtLayerRef, localBodyLayerRef,
        () => { selectedLayerRef.current = null; },
      );

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
        scrollWheelZoom: true, dragging: true, doubleClickZoom: true,
        center: HOME_CENTER, zoom: HOME_ZOOM, zoomControl: true, attributionControl: true,
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

      createResetControl(() => {
        provinceLayerRef.current?.remove();
        districtLayerRef.current?.remove();
        localBodyLayerRef.current?.remove();
        provinceLayerRef.current = null;
        districtLayerRef.current = null;
        localBodyLayerRef.current = null;
        selectedLayerRef.current = null;
        districtTooltipLayersRef.current = [];
        localBodyTooltipLayersRef.current = [];
        map.flyTo(HOME_CENTER, HOME_ZOOM, { animate: true, duration: 0.8 });
        doSync(HOME_ZOOM);
        toast.success('Map reset to Nepal overview');
      }).addTo(map);

      map.on('baselayerchange', (e: L.LayersControlEvent) => {
        isSatelliteModeRef.current = e.name.toLowerCase().includes('satellite');
        if (baseProvinceGeoJSON) {
          baseProvinceGeoJSON.eachLayer((layer) => {
            const path = layer as L.Path;
            const feature = (path as any).feature as GeoJSON.Feature;
            path.setStyle(getProvinceBaseStyle(feature, isSatelliteModeRef.current));
          });
        }
        const s = getDynamicStyles();
        if (provinceLayerRef.current) provinceLayerRef.current.setStyle(s.districtBase);
        if (districtLayerRef.current) districtLayerRef.current.setStyle(s.nestedBase);
        if (localBodyLayerRef.current) localBodyLayerRef.current.setStyle(s.wardBase);
      });

      map.on('zoomend', () => doSync(map.getZoom()));

      baseProvinceGeoJSON = L.geoJSON(raw as GeoJSON.GeoJsonObject, {
        style: (feat) => getProvinceBaseStyle(feat as GeoJSON.Feature, isSatelliteModeRef.current),
        onEachFeature(feature: GeoJSON.Feature, layer) {
          const path = layer as L.Path;
          const name = (feature.properties as { name?: string })?.name ?? '';
          path.bindTooltip(name, { permanent: true, direction: 'center', className: 'map-label' });
          provinceTooltipLayers.push(layer);

          path.on({
            mouseover: () => path.setStyle(getProvinceHoverStyle(feature, isSatelliteModeRef.current)),
            mouseout: () => path.setStyle(getProvinceBaseStyle(feature, isSatelliteModeRef.current)),
            click: async () => {
              const provinceName = (feature.properties as { name_en?: string })?.name_en;
              if (!provinceName) { toast.message('No English province id in data.'); return; }
              hideTooltips(provinceTooltipLayers);
              const provinceData = await fetchBundledGeoJson(`provinces/${provinceName}.geojson`);
              if (cancelled) return;
              if (!provinceData) { toast.error(`Missing asset: provinces/${provinceName}.geojson`); return; }

              provinceLayerRef.current?.remove();
              districtLayerRef.current?.remove();
              localBodyLayerRef.current?.remove();
              provinceLayerRef.current = null;
              districtLayerRef.current = null;
              localBodyLayerRef.current = null;
              districtTooltipLayersRef.current = [];
              localBodyTooltipLayersRef.current = [];

              const s = getDynamicStyles();
              provinceLayerRef.current = L.geoJSON(provinceData as GeoJSON.GeoJsonObject, {
                style: s.districtBase,
                onEachFeature(dFeature: GeoJSON.Feature, dLayer) {
                  const dPath = dLayer as L.Path;
                  const dName = (dFeature.properties as { name?: string })?.name ?? '';
                  dPath.bindTooltip(dName, { permanent: true, direction: 'center', className: 'map-label' });
                  districtTooltipLayersRef.current.push(dLayer);
                  dPath.on({
                    mouseover: () => dPath.setStyle(getDynamicStyles().hover),
                    mouseout: () => dPath.setStyle(getDynamicStyles().districtBase),
                    click: () => { hideTooltips(districtTooltipLayersRef.current); void loadDistrict(dFeature); },
                  });
                },
              });

              map.fitBounds(provinceLayerRef.current.getBounds(), { padding: [20, 20] });
              doSync(map.getZoom());
            },
          });
        },
      }).addTo(map);

      doSync(map.getZoom());

      async function loadDistrict(dFeature: GeoJSON.Feature) {
        const candidates = districtGeoPaths(dFeature);
        let districtData: unknown | null = null;
        for (const c of candidates) { districtData = await fetchBundledGeoJson(c); if (districtData) break; }
        if (cancelled) return;
        if (!districtData) { toast.error(`No district GeoJSON for: ${candidates.join(' / ')}`); return; }

        districtLayerRef.current?.remove();
        localBodyLayerRef.current?.remove();
        districtLayerRef.current = null;
        localBodyLayerRef.current = null;
        localBodyTooltipLayersRef.current = [];

        const s = getDynamicStyles();
        districtLayerRef.current = L.geoJSON(districtData as GeoJSON.GeoJsonObject, {
          style: s.nestedBase,
          onEachFeature(lFeature: GeoJSON.Feature, lLayer) {
            const lPath = lLayer as L.Path;
            const lbName =
              (lFeature.properties as { name?: string })?.name ??
              (lFeature.properties as { name_en?: string })?.name_en ?? '';
            lPath.bindTooltip(lbName, { permanent: true, direction: 'center', className: 'map-label' });
            localBodyTooltipLayersRef.current.push(lLayer);
            lPath.on({
              mouseover: () => lPath.setStyle(getDynamicStyles().hover),
              mouseout: () => { if (selectedLayerRef.current !== lPath) districtLayerRef.current?.resetStyle(lPath); },
              click: () => {
                if (selectedLayerRef.current) districtLayerRef.current?.resetStyle(selectedLayerRef.current);
                selectedLayerRef.current = lPath;
                lPath.setStyle(getDynamicStyles().selected);
                void loadLocalBody(lFeature);
              },
            });
          },
        });

        map.fitBounds(districtLayerRef.current.getBounds(), { padding: [20, 20] });
        doSync(map.getZoom());
      }

      async function loadLocalBody(lFeature: GeoJSON.Feature) {
        const p = lFeature.properties as { name?: string; name_en?: string } | undefined;
        const lbName = (p?.name ?? p?.name_en ?? '').trim();
        if (!lbName) return;

        const localData = await fetchBundledGeoJson(`localbody/${lbName}.geojson`);
        if (cancelled) return;
        if (!localData) { toast.message('Ward-level GeoJSON not bundled; selection highlighted only.'); return; }

        localBodyLayerRef.current?.remove();
        localBodyLayerRef.current = null;

        const s = getDynamicStyles();
        localBodyLayerRef.current = L.geoJSON(localData as GeoJSON.GeoJsonObject, {
          style: s.wardBase,
          onEachFeature(f: GeoJSON.Feature, l) {
            const path = l as L.Path;
            const nm = (f.properties as { name?: string })?.name ?? '';
            path.bindTooltip(nm, { permanent: true, direction: 'center', className: 'map-label' });
            path.on({
              mouseover: () => path.setStyle(getDynamicStyles().hover),
              mouseout: () => { if (selectedLayerRef.current !== path) localBodyLayerRef.current?.resetStyle(path); },
              click: () => {
                if (selectedLayerRef.current) localBodyLayerRef.current?.resetStyle(selectedLayerRef.current);
                selectedLayerRef.current = path;
                path.setStyle(getDynamicStyles().selected);
              },
            });
          },
        });

        map.fitBounds(localBodyLayerRef.current.getBounds(), { padding: [20, 20] });
        doSync(map.getZoom());
      }

      map.invalidateSize();

      if (pendingPropertiesRef.current.length) {
        addPropertyMarkers(pendingPropertiesRef.current, map, layersCtrl, addedOverlaysRef.current);
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
    <div className={cn('project-map flex h-full min-h-[420px] w-full overflow-hidden rounded-xl border border-border-main bg-white shadow-sm', className)}>
      <style>{`
        @keyframes pulse-ring {
          0%   { opacity:0.7; transform:translate(-50%,-50%) scale(0.85); }
          70%  { opacity:0;   transform:translate(-50%,-50%) scale(1.6); }
          100% { opacity:0;   transform:translate(-50%,-50%) scale(1.6); }
        }
        @keyframes pulse-ring-sq {
          0%   { opacity:0.7; transform:translate(-50%,-50%) scale(0.85); }
          70%  { opacity:0;   transform:translate(-50%,-50%) scale(1.5); }
          100% { opacity:0;   transform:translate(-50%,-50%) scale(1.5); }
        }
      `}</style>
      <div ref={mapElRef} className="relative z-0 min-h-0 min-w-0 flex-1" role="application" aria-label="Nepal map" />
    </div>
  );
};