import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import './projectmap.css';
import { useFetchAll } from '@/hooks/useFetchAll';
import type { PropertyDetail } from '@/type/property';

/** Vite resolves bundled asset URLs for every GeoJSON under src/assets/map */
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

const pointIcon = L.divIcon({
  className: 'project-map-pin',
  html: '<span class="block h-3 w-3 rounded-full border-2 border-white bg-red-600 shadow-md ring-1 ring-black/15"></span>',
  iconSize: [12, 12],
  iconAnchor: [6, 6],
});

async function fetchBundledGeoJson(relPath: string): Promise<unknown | null> {
  let url = GEO_ASSET_URLS[relPath];
  if (!url) {
    const hit = Object.keys(GEO_ASSET_URLS).find((k) => k.toLowerCase() === relPath.toLowerCase());
    if (hit) url = GEO_ASSET_URLS[hit];
  }
  if (!url) return null;
  const res = await fetch(url);
  if (!res.ok) return null;
  return res.json();
}

function groupBy<T>(xs: T[], key: keyof T): Record<string, T[]> {
  return xs.reduce<Record<string, T[]>>((rv, x) => {
    const k = String(x[key]);
    (rv[k] = rv[k] || []).push(x);
    return rv;
  }, {});
}

/** Distinct pastel fills for province polygons (cycled by hashed name) */
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
  const key = (p?.name_en?.trim() || p?.name?.trim() || '') as string;
  const idx = key ? hashString(key) % PROVINCE_FILL_PALETTE.length : 0;
  return {
    color: '#475569',
    fillColor: PROVINCE_FILL_PALETTE[idx],
    weight: 1,
    fillOpacity: 0.45,
  };
}

function getProvinceHoverStyle(feature: GeoJSON.Feature): L.PathOptions {
  const base = getProvinceBaseStyle(feature);
  return {
    ...base,
    color: '#0f172a',
    weight: 2,
    fillOpacity: Math.min(0.78, (base.fillOpacity ?? 0.45) + 0.22),
  };
}

const hoverStyle: L.PathOptions = {
  color: '#0f172a',
  fillColor: '#93c5fd',
  weight: 2,
  fillOpacity: 0.35,
};

const selectedStyle: L.PathOptions = {
  color: '#dc2626',
  fillColor: '#fca5a5',
  weight: 3,
  fillOpacity: 0.22,
};

function parseLatLng(gps: string): [number, number] | null {
  try {
    const arr = JSON.parse(gps) as number[];
    if (Array.isArray(arr) && arr.length >= 2 && Number.isFinite(arr[0]) && Number.isFinite(arr[1])) {
      return [arr[0], arr[1]];
    }
  } catch {
    /* ignore */
  }
  return null;
}

function hideTooltips(layers: L.Layer[]) {
  layers.forEach((l) => {
    if ('closeTooltip' in l && typeof (l as L.Path).closeTooltip === 'function') {
      (l as L.Path).closeTooltip();
    }
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

// Normalized map item type used internally
interface MapItem {
  type: string;
  name: string;
  gps: string;
}

export const ProjectMap: React.FC<{ className?: string }> = ({ className }) => {
  const { items: propertyResponse } = useFetchAll<PropertyDetail>(
    "/api/property",
    ["property"]
  );

  // ✅ Use a ref to hold latest property data so useEffect can access it
  //    without needing to re-run the entire map setup on every fetch update
  const propertyDataRef = useRef<MapItem[]>([]);
  const layersCtrlRef = useRef<L.Control.Layers | null>(null);
  const addedOverlaysRef = useRef<Set<string>>(new Set());

  const mapElRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  // ✅ Update ref when property data arrives and add overlays to existing map
  useEffect(() => {
    const propertyData: PropertyDetail[] = (propertyResponse as any)?.data ?? [];
    if (!propertyData.length) return;

    const map = mapRef.current;
    const layersCtrl = layersCtrlRef.current;
    if (!map || !layersCtrl) return;

    const mapped: MapItem[] = propertyData
      .filter((item) => item.latitude != null && item.longitude != null)
      .map((item) => ({
        type: String(item.propertyTypeId)  ?? "Property",
        name: item.name ?? "Unknown",
        gps: JSON.stringify([item.latitude, item.longitude]),
      }));

    propertyDataRef.current = mapped;

    const grouped = groupBy(mapped, "type");

    Object.keys(grouped).forEach((typeKey) => {
      // Avoid adding duplicate overlays if data re-fetches
      if (addedOverlaysRef.current.has(typeKey)) return;
      addedOverlaysRef.current.add(typeKey);

      const markers = grouped[typeKey]
        .map((x): L.Layer | null => {
          const ll = parseLatLng(x.gps);
          if (!ll) return null;
          const gmaps = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${ll[0]},${ll[1]}`)}`;
          return L.marker(ll, { icon: pointIcon }).bindPopup(
            `<div class="text-sm">
              <strong class="text-red-700">${x.name}</strong>
              <div class="mt-1 text-xs">${x.type}</div>
              <div class="mt-2">
                <a class="text-blue-600 underline" target="_blank" rel="noreferrer" href="${gmaps}">
                  Open in Google Maps
                </a>
              </div>
            </div>`
          );
        })
        .filter((m): m is L.Layer => m !== null);

      if (markers.length > 0) {
        const layerGroup = L.layerGroup(markers);
        layersCtrl.addOverlay(layerGroup, `${typeKey} (${markers.length})`);
      }
    });
  }, [propertyResponse]);

  // ✅ Map initialisation — runs once only
  useEffect(() => {
    const el = mapElRef.current;
    if (!el) return;

    let cancelled = false;
    const provinceTooltipLayers: L.Layer[] = [];
    let districtTooltipLayers: L.Layer[] = [];
    let localBodyTooltipLayers: L.Layer[] = [];
    let provinceLayer: L.GeoJSON | null = null;
    let districtLayer: L.GeoJSON | null = null;
    let localBodyLayer: L.GeoJSON | null = null;
    let selectedLayer: L.Path | null = null;

    const districtRestyle: L.PathOptions = {
      color: '#334155',
      fillColor: '#cbd5e1',
      weight: 1,
      fillOpacity: 0.65,
    };

    const run = async () => {
      const raw = await fetchBundledGeoJson('all_provinces.geojson');
      if (cancelled || !raw) {
        if (!cancelled) toast.error('Could not load province boundaries from app assets.');
        return;
      }

      const osmLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 20,
        attribution: '&copy; OpenStreetMap &copy; CARTO',
      });

      const esriImagery = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        { maxZoom: 19, attribution: 'Tiles &copy; Esri' },
      );

      const map = L.map(el, {
        scrollWheelZoom: true,
        dragging: true,
        doubleClickZoom: false,
        center: [28.3949, 84.124],
        zoom: 7,
        zoomControl: true,
        attributionControl: true,
      });

      mapRef.current = map;
      osmLayer.addTo(map);

      const baseLayers = { 'Carto light': osmLayer, 'Satellite (Esri)': esriImagery };
      const layersCtrl = L.control.layers(baseLayers, undefined, { position: 'topright', collapsed: false });
      layersCtrl.addTo(map);
      layersCtrlRef.current = layersCtrl; // ✅ store for use in property data effect

      L.geoJSON(raw as GeoJSON.GeoJsonObject, {
        style: (feat) => getProvinceBaseStyle(feat as GeoJSON.Feature),
        onEachFeature(feature: GeoJSON.Feature, layer) {
          const path = layer as L.Path;
          const name = (feature.properties as { name?: string })?.name ?? '';
          path.bindTooltip(name, {
            permanent: true,
            direction: 'center',
            className: 'map-label',
          });
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
              const rel = `provinces/${provinceName}.geojson`;
              const provinceData = await fetchBundledGeoJson(rel);
              if (cancelled) return;
              if (!provinceData) {
                toast.error(`Missing asset: ${rel}`);
                return;
              }

              if (provinceLayer) map.removeLayer(provinceLayer);
              if (districtLayer) map.removeLayer(districtLayer);
              if (localBodyLayer) map.removeLayer(localBodyLayer);
              districtTooltipLayers = [];
              localBodyTooltipLayers = [];

              provinceLayer = L.geoJSON(provinceData as GeoJSON.GeoJsonObject, {
                style: {
                  color: '#475569',
                  fillColor: '#cbd5e1',
                  weight: 1,
                  fillOpacity: 0.55,
                },
                onEachFeature(dFeature: GeoJSON.Feature, dLayer) {
                  const dPath = dLayer as L.Path;
                  const dName = (dFeature.properties as { name?: string })?.name ?? '';
                  dPath.bindTooltip(dName, {
                    permanent: true,
                    direction: 'center',
                    className: 'map-label',
                  });
                  districtTooltipLayers.push(dLayer);

                  dPath.on({
                    mouseover: () => dPath.setStyle(hoverStyle),
                    mouseout: () => dPath.setStyle(districtRestyle),
                    click: () => {
                      hideTooltips(districtTooltipLayers);
                      void loadDistrict(dFeature);
                    },
                  });
                },
              }).addTo(map);

              map.fitBounds(provinceLayer.getBounds(), { padding: [20, 20] });
            },
          });
        },
      }).addTo(map);

      async function loadDistrict(dFeature: GeoJSON.Feature) {
        const candidates = districtGeoPaths(dFeature);
        let districtData: unknown | null = null;
        for (const c of candidates) {
          districtData = await fetchBundledGeoJson(c);
          if (districtData) break;
        }
        if (cancelled) return;
        if (!districtData) {
          toast.error(
            candidates.length
              ? `No district GeoJSON in assets for: ${candidates.join(' / ')}`
              : 'No district name on feature.',
          );
          return;
        }

        if (districtLayer) map.removeLayer(districtLayer);
        if (localBodyLayer) map.removeLayer(localBodyLayer);
        localBodyTooltipLayers = [];

        districtLayer = L.geoJSON(districtData as GeoJSON.GeoJsonObject, {
          style: {
            color: '#0f172a',
            fillColor: '#94a3b8',
            weight: 1,
            fillOpacity: 0.55,
          },
          onEachFeature(lFeature: GeoJSON.Feature, lLayer) {
            const lPath = lLayer as L.Path;
            const lbName =
              (lFeature.properties as { name?: string; name_en?: string })?.name ??
              (lFeature.properties as { name_en?: string })?.name_en ??
              '';
            lPath.bindTooltip(String(lbName), {
              permanent: true,
              direction: 'center',
              className: 'map-label',
            });
            localBodyTooltipLayers.push(lLayer);

            lPath.on({
              mouseover: () => lPath.setStyle(hoverStyle),
              mouseout: () => {
                if (selectedLayer !== lPath && districtLayer) districtLayer.resetStyle(lPath);
              },
              click: () => {
                if (selectedLayer && districtLayer) districtLayer.resetStyle(selectedLayer);
                selectedLayer = lPath;
                lPath.setStyle(selectedStyle);
                void loadLocalBody(lFeature);
              },
            });
          },
        }).addTo(map);

        map.fitBounds(districtLayer.getBounds(), { padding: [20, 20] });
      }

      async function loadLocalBody(lFeature: GeoJSON.Feature) {
        const p = lFeature.properties as { name?: string; name_en?: string } | undefined;
        const lbName = (p?.name ?? p?.name_en ?? '').trim();
        if (!lbName) return;

        const rel = `localbody/${lbName}.geojson`;
        const localData = await fetchBundledGeoJson(rel);
        if (cancelled) return;
        if (!localData) {
          toast.message('Ward-level GeoJSON is not bundled in assets; selection is highlighted only.');
          return;
        }

        if (localBodyLayer) map.removeLayer(localBodyLayer);

        localBodyLayer = L.geoJSON(localData as GeoJSON.GeoJsonObject, {
          style: {
            color: '#0f172a',
            fillColor: '#cbd5e1',
            weight: 1,
            fillOpacity: 0.45,
          },
          onEachFeature(f: GeoJSON.Feature, l) {
            const path = l as L.Path;
            const nm = (f.properties as { name?: string })?.name ?? '';
            path.bindTooltip(String(nm), {
              permanent: true,
              direction: 'center',
              className: 'map-label',
            });
            path.on({
              mouseover: () => path.setStyle(hoverStyle),
              mouseout: () => {
                if (selectedLayer !== path && localBodyLayer) localBodyLayer.resetStyle(path);
              },
              click: () => {
                if (selectedLayer && localBodyLayer) localBodyLayer.resetStyle(selectedLayer);
                selectedLayer = path;
                path.setStyle(selectedStyle);
              },
            });
          },
        }).addTo(map);

        map.fitBounds(localBodyLayer.getBounds(), { padding: [20, 20] });
      }

      map.invalidateSize();
    };

    void run();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      layersCtrlRef.current = null;
      addedOverlaysRef.current.clear();
    };
  }, []); // ✅ runs once only — map setup is independent of data

  return (
    <div
      className={cn(
        'project-map flex h-full min-h-[420px] w-full overflow-hidden rounded-xl border border-border-main bg-white shadow-sm',
        className,
      )}
    >
      <div ref={mapElRef} className="relative z-0 min-h-0 min-w-0 flex-1" role="application" aria-label="Nepal map" />
    </div>
  );
};