import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Layers, 
  Activity, 
  Compass, 
  Route, 
  Search, 
  Eye, 
  EyeOff, 
  ChevronDown, 
  ChevronUp, 
  Waves,
  Map as MapIcon,
  Filter,
  Check
} from 'lucide-react';
import { TrafficSegment, ContinuousCountStation, StateConfig } from '../types/traffic';
import { DETAILED_STATE_BOUNDARIES, MAJOR_WATERWAYS } from '../data/geographicBoundaries';

export interface MapViewport { bbox: [number, number, number, number]; zoom: number; historical?: boolean } // [minLng, minLat, maxLng, maxLat]

interface GisMapViewerProps {
  /** Called (debounced) when pan/zoom changes, so the host can load only the visible segments. */
  onViewportChange?: (v: MapViewport) => void;
  stateConfig: StateConfig;
  segments: TrafficSegment[];
  stations: ContinuousCountStation[];
  selectedSegments: TrafficSegment[];
  selectedStation: ContinuousCountStation | null;
  onSelectSegment: (segment: TrafficSegment, isMultiSelect?: boolean) => void;
  onSelectStation: (station: ContinuousCountStation) => void;
  onClearSelection: () => void;
  onOpenStateSelector: () => void;
  onSelectState?: (stateCode: string) => void;
}

export const GisMapViewer: React.FC<GisMapViewerProps> = ({
  stateConfig,
  segments,
  onViewportChange,
  stations,
  selectedSegments,
  selectedStation,
  onSelectSegment,
  onSelectStation,
  onClearSelection,
  onOpenStateSelector,
  onSelectState
}) => {
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  // pan/zoom are applied straight to the SVG element while dragging (no React re-render of tens of thousands of segments per mouse move)
  const svgRef = useRef<SVGSVGElement>(null);
  const panRef = useRef({ x: 0, y: 0 });
  const zoomRef = useRef(1);
  const dragRef = useRef<{ sx: number; sy: number } | null>(null);
  const pinchRef = useRef<{ d: number; z: number } | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Layer toggles & simplified filters
  const [districtFilter, setDistrictFilter] = useState<string>('all');
  const [routeTypeFilter, setRouteTypeFilter] = useState<'all' | 'interstate' | 'us_routes'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [mapStyle, setMapStyle] = useState<'bandwidth' | 'clean'>('bandwidth');

  // Map Feature Visibility
  const [showStations, setShowStations] = useState<boolean>(true);
  const [showRivers, setShowRivers] = useState<boolean>(true);
  const [showNeighbors, setShowNeighbors] = useState<boolean>(true);
  const [showCities, setShowCities] = useState<boolean>(true);
  const [showShields, setShowShields] = useState<boolean>(true);
  // by default the map draws the current network; older-era segments overlap it, so they are an opt-in layer
  const [showHistorical, setShowHistorical] = useState<boolean>(false);
  const [multiSelectMode, setMultiSelectMode] = useState<boolean>(false);
  // the legend covers a third of a phone screen: start collapsed on narrow screens
  const [isLegendExpanded, setIsLegendExpanded] = useState<boolean>(() => typeof window === 'undefined' || window.innerWidth >= 768);
  const [isLayerMenuOpen, setIsLayerMenuOpen] = useState<boolean>(false);

  const [hoveredItem, setHoveredItem] = useState<{
    type: 'segment' | 'station' | 'neighbor';
    data: any;
    x: number;
    y: number;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // SVG canvas dimensions
  const width = 1000;
  const height = 750;

  // Projection with comfortable 10% geographic context padding
  const project = (lng: number, lat: number): [number, number] => {
    const { minLng, maxLng, minLat, maxLat } = stateConfig.bounds;
    const lngSpan = maxLng - minLng;
    const latSpan = maxLat - minLat;
    const padLng = lngSpan * 0.08;
    const padLat = latSpan * 0.08;
    const effectiveMinLng = minLng - padLng;
    const effectiveMaxLng = maxLng + padLng;
    const effectiveMinLat = minLat - padLat;
    const effectiveMaxLat = maxLat + padLat;

    const x = ((lng - effectiveMinLng) / (effectiveMaxLng - effectiveMinLng)) * (width - 100) + 50;
    const y = ((effectiveMaxLat - lat) / (effectiveMaxLat - effectiveMinLat)) * (height - 100) + 50;
    return [x, y];
  };

  // Report the visible geographic window (inverse of project() and the CSS pan/zoom transform)
  useEffect(() => {
    if (!onViewportChange) return;
    const t = setTimeout(() => {
      const el = containerRef.current;
      if (!el) return;
      const { width: cw, height: ch } = el.getBoundingClientRect();
      if (!cw || !ch) return;
      const k = Math.min(cw / width, ch / height); // svg uses preserveAspectRatio meet, centred
      const toSvg = (px: number, py: number): [number, number] => [
        (px - pan.x - cw / 2) / zoom / k + width / 2,
        (py - pan.y - ch / 2) / zoom / k + height / 2
      ];
      const { minLng, maxLng, minLat, maxLat } = stateConfig.bounds;
      const padLng = (maxLng - minLng) * 0.08, padLat = (maxLat - minLat) * 0.08;
      const eMinLng = minLng - padLng, eMaxLng = maxLng + padLng, eMinLat = minLat - padLat, eMaxLat = maxLat + padLat;
      const unproject = (x: number, y: number): [number, number] => [
        eMinLng + ((x - 50) / (width - 100)) * (eMaxLng - eMinLng),
        eMaxLat - ((y - 50) / (height - 100)) * (eMaxLat - eMinLat)
      ];
      const [x0, y0] = toSvg(0, 0), [x1, y1] = toSvg(cw, ch);
      const a = unproject(x0, y0), b = unproject(x1, y1);
      const padX = Math.abs(b[0] - a[0]) * 0.1, padY = Math.abs(a[1] - b[1]) * 0.1; // small margin so edges don't pop in
      onViewportChange({
        bbox: [Math.min(a[0], b[0]) - padX, Math.min(a[1], b[1]) - padY, Math.max(a[0], b[0]) + padX, Math.max(a[1], b[1]) + padY],
        zoom, historical: showHistorical
      });
    }, 250);
    return () => clearTimeout(t);
  }, [zoom, pan.x, pan.y, stateConfig.code, onViewportChange, showHistorical]);

  // Filter segments for active state
  const stateSegments = useMemo(() => {
    return segments.filter((s) => s.stateCode === stateConfig.code || !s.stateCode);
  }, [segments, stateConfig.code]);

  const filteredSegments = useMemo(() => {
    return stateSegments.filter((seg) => {
      if (districtFilter !== 'all' && seg.districtId !== districtFilter) return false;
      if (routeTypeFilter === 'interstate' && seg.routeType !== 'Interstate') return false;
      if (routeTypeFilter === 'us_routes' && seg.routeType !== 'US Highway') return false;
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const matchesRoute = seg.route.toLowerCase().includes(query);
        const matchesDesc = seg.description.toLowerCase().includes(query);
        const matchesCounty = seg.county.toLowerCase().includes(query);
        if (!matchesRoute && !matchesDesc && !matchesCounty) return false;
      }
      return true;
    });
  }, [stateSegments, districtFilter, routeTypeFilter, searchQuery]);

  // Filter stations for active state
  const stateStations = useMemo(() => {
    return stations.filter((s) => s.stateCode === stateConfig.code || !s.stateCode);
  }, [stations, stateConfig.code]);

  const filteredStations = useMemo(() => {
    if (!showStations) return [];
    return stateStations.filter((sta) => {
      if (districtFilter !== 'all' && sta.districtId !== districtFilter) return false;
      return true;
    });
  }, [stateStations, showStations, districtFilter]);

  // Detailed Active State Boundary
  const activeStateBoundaryPath = useMemo(() => {
    const border = DETAILED_STATE_BOUNDARIES[stateConfig.code]?.polygon || stateConfig.borderPoints;
    if (!border || border.length === 0) return '';
    return border
      .map((pt, i) => {
        const [x, y] = project(pt[0], pt[1]);
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ') + ' Z';
  }, [stateConfig]);

  // Neighboring States
  const neighborStates = useMemo(() => {
    if (!showNeighbors) return [];
    const neighborCodes = DETAILED_STATE_BOUNDARIES[stateConfig.code]?.adjacentStateCodes || [];
    return neighborCodes
      .map((code) => {
        const boundary = DETAILED_STATE_BOUNDARIES[code];
        if (!boundary) return null;
        const path = boundary.polygon
          .map((pt, i) => {
            const [x, y] = project(pt[0], pt[1]);
            return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
          })
          .join(' ') + ' Z';
        const [lx, ly] = project(boundary.labelPoint[0], boundary.labelPoint[1]);
        return {
          code: boundary.code,
          name: boundary.name,
          path,
          labelX: lx,
          labelY: ly
        };
      })
      .filter(Boolean) as { code: string; name: string; path: string; labelX: number; labelY: number }[];
  }, [stateConfig, showNeighbors]);

  // Strategic Waterways within / near state boundary
  const visibleRivers = useMemo(() => {
    if (!showRivers) return [];
    const { minLng, maxLng, minLat, maxLat } = stateConfig.bounds;
    const padLng = (maxLng - minLng) * 0.25;
    const padLat = (maxLat - minLat) * 0.25;

    return MAJOR_WATERWAYS.map((river) => {
      // Filter points reasonably near the viewport
      const validPoints = river.path.filter(
        ([lng, lat]) => 
          lng >= minLng - padLng && 
          lng <= maxLng + padLng && 
          lat >= minLat - padLat && 
          lat <= maxLat + padLat
      );

      if (validPoints.length < 2) return null;

      const pathString = validPoints
        .map((pt, i) => {
          const [rx, ry] = project(pt[0], pt[1]);
          return `${i === 0 ? 'M' : 'L'} ${rx.toFixed(1)} ${ry.toFixed(1)}`;
        })
        .join(' ');

      const midPt = validPoints[Math.floor(validPoints.length / 2)];
      const [mx, my] = project(midPt[0], midPt[1]);

      return {
        id: river.id,
        name: river.name,
        path: pathString,
        midX: mx,
        midY: my
      };
    }).filter(Boolean) as { id: string; name: string; path: string; midX: number; midY: number }[];
  }, [stateConfig, showRivers]);

  // Pan handlers
  const applyTransform = () => { if (svgRef.current) svgRef.current.style.transform = `translate(${panRef.current.x}px, ${panRef.current.y}px) scale(${zoomRef.current})`; };
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    dragRef.current = { sx: e.clientX - panRef.current.x, sy: e.clientY - panRef.current.y };
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragRef.current) return;
    panRef.current = { x: e.clientX - dragRef.current.sx, y: e.clientY - dragRef.current.sy };
    applyTransform();
  };

  const handleMouseUp = () => {
    if (!dragRef.current) return;
    dragRef.current = null;
    setPan({ ...panRef.current }); // commit once, so the visible-area query and saved state see the final position
    setIsDragging(false);
  };

  // Touch: one finger pans, two fingers pinch-zoom (phones / the Android app)
  const touchDist = (t: React.TouchList) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) { dragRef.current = { sx: e.touches[0].clientX - panRef.current.x, sy: e.touches[0].clientY - panRef.current.y }; setIsDragging(true); }
    else if (e.touches.length === 2) { dragRef.current = null; pinchRef.current = { d: touchDist(e.touches), z: zoomRef.current }; }
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchRef.current) {
      zoomRef.current = Math.min(Math.max(pinchRef.current.z * (touchDist(e.touches) / pinchRef.current.d), 0.7), 4.5);
      applyTransform();
    } else if (e.touches.length === 1 && dragRef.current) {
      panRef.current = { x: e.touches[0].clientX - dragRef.current.sx, y: e.touches[0].clientY - dragRef.current.sy };
      applyTransform();
    }
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length > 0) return;
    if (pinchRef.current) { pinchRef.current = null; setZoom(zoomRef.current); }
    if (dragRef.current) { dragRef.current = null; setIsDragging(false); }
    setPan({ ...panRef.current });
  };

  // wheel must be a non-passive native listener, otherwise preventDefault throws a console error on every tick
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoomRef.current = Math.min(Math.max(zoomRef.current * (e.deltaY < 0 ? 1.15 : 0.87), 0.7), 4.5);
      applyTransform();
      setZoom(zoomRef.current);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const resetView = () => {
    setZoom(1);
    zoomRef.current = 1; panRef.current = { x: 0, y: 0 };
    setPan({ x: 0, y: 0 });
    setDistrictFilter('all');
    setRouteTypeFilter('all');
    setSearchQuery('');
    onClearSelection();
  };

  // Simplified Traffic Color Scheme (Clean DOT cartographic palette)
  const getTrafficColor = (aadt: number) => {
    if (mapStyle === 'clean') return '#60a5fa'; // Minimalist uniform corridor
    if (aadt >= 120000) return '#dc2626'; // High Volume (Red)
    if (aadt >= 70000) return '#ea580c';  // Heavy (Orange)
    if (aadt >= 35000) return '#d97706';  // Moderate (Amber)
    if (aadt >= 15000) return '#10b981';  // Light-Moderate (Emerald)
    return '#3b82f6';                     // Low Volume (Blue)
  };

  const getTrafficStrokeWidth = (aadt: number) => {
    if (mapStyle === 'clean') return 2.8;
    if (aadt >= 120000) return 5.8;
    if (aadt >= 70000) return 4.6;
    if (aadt >= 35000) return 3.4;
    if (aadt >= 15000) return 2.4;
    return 1.8;
  };

  const selectedIds = useMemo(() => {
    return new Set(selectedSegments.map((s) => s.id));
  }, [selectedSegments]);

  // The segment layer is built once and reused while panning, zooming or hovering: it can hold 10,000+ segments.
  // Route shields only appear zoomed in (a shield on every Interstate segment made the whole state unreadable and unpannable).
  const shieldsOn = showShields && zoom >= 2.2;
  const dense = filteredSegments.length > 4000;
  const zoomBucket = Math.max(0.5, Math.round(zoom * 2) / 2);
  const segmentLayer = useMemo(() => {
  // one shield per route per screen cell, so a long highway shows a few badges instead of one per segment
  const taken = new Set<string>(); const cell = 130 / zoomBucket;
  const takeShield = (route: string, x: number, y: number) => { const k = `${route}|${Math.floor(x / cell)}|${Math.floor(y / cell)}`; if (taken.has(k)) return false; taken.add(k); return true; };
  return (
  <g className="traffic-segments">
    {filteredSegments.map((seg) => {
      const isSelected = selectedIds.has(seg.id);
      const pathString = seg.coordinates
        .map((pt, i) => {
          const [px, py] = project(pt[0], pt[1]);
          return `${i === 0 ? 'M' : 'L'} ${px.toFixed(1)} ${py.toFixed(1)}`;
        })
        .join(' ');

      const strokeColor = isSelected ? '#38bdf8' : getTrafficColor(seg.aadtCurrent);
      const strokeWidth = isSelected 
        ? getTrafficStrokeWidth(seg.aadtCurrent) + 2.8 
        : getTrafficStrokeWidth(seg.aadtCurrent);

      // Center point for route shield
      const [shieldX, shieldY] = project(seg.centerPoint[0], seg.centerPoint[1]);

      return (
        <g 
          key={seg.id}
          className="cursor-pointer transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            const isMulti = e.shiftKey || multiSelectMode;
            onSelectSegment(seg, isMulti);
          }}
          onMouseEnter={(e) => {
            const rect = containerRef.current?.getBoundingClientRect();
            if (rect) {
              setHoveredItem({
                type: 'segment',
                data: seg,
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
              });
            }
          }}
          onMouseLeave={() => setHoveredItem(null)}
        >
          {/* Invisible wide hit target for effortless clicks */}
          <path
            d={pathString}
            fill="none"
            stroke="transparent"
            strokeWidth={Math.max(strokeWidth + 14, 18)}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Halo when selected */}
          {isSelected && (
            <path
              d={pathString}
              fill="none"
              stroke="#38bdf8"
              strokeWidth={strokeWidth + 4}
              strokeOpacity="0.45"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#corridorGlow)"
            />
          )}

          {/* Crisp Highway Bandwidth Line */}
          <path
            d={pathString}
            fill="none"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeOpacity={isSelected ? 1 : 0.9}
          />

          {/* Highway Route Shield on Key Segments */}
          {shieldsOn && (seg.route.startsWith('I-') || seg.route.startsWith('US-')) && takeShield(seg.route, shieldX, shieldY) && (
            <g transform={`translate(${shieldX}, ${shieldY})`} className="pointer-events-none">
              {seg.route.startsWith('I-') ? (
                // Interstate Shield Badge
                <g transform="translate(-11, -8)">
                  <rect width="22" height="15" rx="3" fill="#1e3a8a" stroke="#ffffff" strokeWidth="0.8" />
                  <path d="M 0 0 L 22 0 L 22 4 L 0 4 Z" fill="#dc2626" rx="3" />
                  <text 
                    x="11" 
                    y="12" 
                    fill="#ffffff" 
                    fontSize="8" 
                    fontWeight="800" 
                    textAnchor="middle"
                    fontFamily="monospace"
                  >
                    {seg.route.replace('I-', '')}
                  </text>
                </g>
              ) : (
                // US Route Shield Badge
                <g transform="translate(-11, -8)">
                  <rect width="22" height="15" rx="3" fill="#ffffff" stroke="#1e293b" strokeWidth="0.8" />
                  <text 
                    x="11" 
                    y="11.5" 
                    fill="#0f172a" 
                    fontSize="8" 
                    fontWeight="800" 
                    textAnchor="middle"
                    fontFamily="monospace"
                  >
                    {seg.route.replace('US-', '')}
                  </text>
                </g>
              )}
            </g>
          )}
        </g>
      );
    })}
  </g>
  );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredSegments, selectedIds, mapStyle, shieldsOn, zoomBucket, dense, multiSelectMode, onSelectSegment, stateConfig]);

  return (
    <div className="flex flex-col h-full bg-[#070b14] text-slate-100 overflow-hidden select-none font-sans">
      {/* Streamlined Top Cartographic Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 px-3.5 py-2 bg-[#0c1220] border-b border-slate-800 text-xs shadow-sm z-20">
        {/* Left: State Switcher Badge */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenStateSelector}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 text-slate-100 rounded-md font-semibold transition shadow-sm group"
            title="Switch active State DOT"
          >
            <div className="w-5 h-5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center text-[10px] font-bold">
              {stateConfig.code}
            </div>
            <div className="text-left">
              <div className="text-[12px] leading-none text-slate-100 font-bold">{stateConfig.name}</div>
              <div className="text-[9px] text-slate-400 font-normal">{stateConfig.agencyAcronym} Portal</div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-200 transition-transform" />
          </button>

          <div className="h-5 w-px bg-slate-800 hidden sm:block" />

          {/* Quick Route Search */}
          <div className="relative hidden md:flex items-center">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search route (e.g. I-70)..."
              className="bg-slate-900 border border-slate-700/80 rounded-md pl-8 pr-2.5 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 w-44 transition"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2 text-slate-500 hover:text-slate-300 text-xs"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* Center: Simplified Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Corridor Category Chips */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-md p-0.5">
            <button
              onClick={() => setRouteTypeFilter('all')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
                routeTypeFilter === 'all' 
                  ? 'bg-slate-700 text-white shadow-xs' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All Routes
            </button>
            <button
              onClick={() => setRouteTypeFilter('interstate')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
                routeTypeFilter === 'interstate' 
                  ? 'bg-slate-700 text-white shadow-xs' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Interstates
            </button>
            <button
              onClick={() => setRouteTypeFilter('us_routes')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
                routeTypeFilter === 'us_routes' 
                  ? 'bg-slate-700 text-white shadow-xs' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              US Routes
            </button>
          </div>

          {/* District Filter Dropdown */}
          <select
            value={districtFilter}
            onChange={(e) => setDistrictFilter(e.target.value)}
            className="bg-slate-900 border border-slate-700/80 rounded-md px-2 py-1 text-slate-300 text-xs focus:outline-none focus:border-sky-500"
          >
            <option value="all">All Districts</option>
            {stateConfig.districts.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>

          {/* Multi-Select Corridor Mode Toggle */}
          <button
            onClick={() => setMultiSelectMode(!multiSelectMode)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs transition ${
              multiSelectMode 
                ? 'bg-sky-950/80 border-sky-600 text-sky-300 font-semibold' 
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle multi-segment corridor chain selection"
          >
            <Route className="w-3.5 h-3.5" />
            <span>{multiSelectMode ? 'Multi-Select: ON' : 'Corridor Select'}</span>
          </button>
        </div>

        {/* Right: Map Style & Layer Options */}
        <div className="flex items-center gap-1.5">
          {/* Map Style Toggle */}
          <button
            onClick={() => setMapStyle(mapStyle === 'bandwidth' ? 'clean' : 'bandwidth')}
            className="flex items-center gap-1 px-2 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-md text-[11px] text-slate-300 transition"
            title="Toggle between AADT Volume Bandwidth and Clean Corridor view"
          >
            <MapIcon className="w-3 h-3 text-slate-400" />
            <span>{mapStyle === 'bandwidth' ? 'Style: Bandwidth' : 'Style: Clean'}</span>
          </button>

          {/* Layers Dropdown Menu */}
          <div className="relative">
            <button
              onClick={() => setIsLayerMenuOpen(!isLayerMenuOpen)}
              className={`p-1.5 rounded-md border transition ${
                isLayerMenuOpen ? 'bg-slate-700 text-white border-slate-600' : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
              }`}
              title="Toggle Map Layers"
            >
              <Layers className="w-3.5 h-3.5" />
            </button>

            {isLayerMenuOpen && (
              <div className="absolute right-0 mt-1 w-48 bg-slate-900 border border-slate-700 rounded-lg shadow-xl p-2 z-50 text-xs space-y-1">
                <div className="font-semibold text-slate-300 px-2 py-1 border-b border-slate-800 text-[10px] uppercase tracking-wider">
                  Map Layers
                </div>
                <label className="flex items-center justify-between px-2 py-1 rounded hover:bg-slate-800 cursor-pointer">
                  <span className="text-slate-300 flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-emerald-400" />
                    ATR Stations
                  </span>
                  <input
                    type="checkbox"
                    checked={showStations}
                    onChange={(e) => setShowStations(e.target.checked)}
                    className="rounded bg-slate-800 border-slate-700 text-sky-500 focus:ring-0"
                  />
                </label>
                <label className="flex items-center justify-between px-2 py-1 rounded hover:bg-slate-800 cursor-pointer">
                  <span className="text-slate-300 flex items-center gap-1.5">
                    <Waves className="w-3.5 h-3.5 text-sky-400" />
                    Major Rivers
                  </span>
                  <input
                    type="checkbox"
                    checked={showRivers}
                    onChange={(e) => setShowRivers(e.target.checked)}
                    className="rounded bg-slate-800 border-slate-700 text-sky-500 focus:ring-0"
                  />
                </label>
                <label className="flex items-center justify-between px-2 py-1 rounded hover:bg-slate-800 cursor-pointer">
                  <span className="text-slate-300 flex items-center gap-1.5">
                    <Compass className="w-3.5 h-3.5 text-amber-400" />
                    Neighbor States
                  </span>
                  <input
                    type="checkbox"
                    checked={showNeighbors}
                    onChange={(e) => setShowNeighbors(e.target.checked)}
                    className="rounded bg-slate-800 border-slate-700 text-sky-500 focus:ring-0"
                  />
                </label>
                <label className="flex items-center justify-between px-2 py-1 rounded hover:bg-slate-800 cursor-pointer">
                  <span className="text-slate-300 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-slate-300 inline-block ml-0.5 mr-1" />
                    Cities & Capitals
                  </span>
                  <input
                    type="checkbox"
                    checked={showCities}
                    onChange={(e) => setShowCities(e.target.checked)}
                    className="rounded bg-slate-800 border-slate-700 text-sky-500 focus:ring-0"
                  />
                </label>
                <label className="flex items-center justify-between px-2 py-1 rounded hover:bg-slate-800 cursor-pointer">
                  <span className="text-slate-300 flex items-center gap-1.5">
                    <span className="w-3.5 h-2.5 rounded bg-blue-600 inline-block text-[8px] text-center text-white leading-none">I</span>
                    Route Shields
                  </span>
                  <input
                    type="checkbox"
                    checked={showShields}
                    onChange={(e) => setShowShields(e.target.checked)}
                    className="rounded bg-slate-800 border-slate-700 text-sky-500 focus:ring-0"
                  />
                </label>
                <label className="flex items-center justify-between px-2 py-1 rounded hover:bg-slate-800 cursor-pointer" title="Also draw segments whose newest count is from an earlier year (older road segmentation; overlaps the current network)">
                  <span className="text-slate-300">Counted only in earlier years</span>
                  <input
                    type="checkbox"
                    checked={showHistorical}
                    onChange={(e) => setShowHistorical(e.target.checked)}
                    className="rounded bg-slate-800 border-slate-700 text-sky-500 focus:ring-0"
                  />
                </label>
              </div>
            )}
          </div>

          {/* Reset View */}
          <button
            onClick={resetView}
            className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-md border border-slate-800 transition"
            title="Reset to Statewide bounds"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Interactive Map Viewport */}
      <div 
        ref={containerRef}
        className="relative flex-1 bg-[#070b14] overflow-hidden cursor-grab active:cursor-grabbing select-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ touchAction: 'none' }}
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center center',
            transition: isDragging ? 'none' : 'transform 0.1s ease-out',
            willChange: 'transform'
          }}
        >
          <defs>
            {/* Soft, modern state fill */}
            <linearGradient id="activeStateFill" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#141e33" />
            </linearGradient>

            {/* Subtle glow for selected corridor */}
            <filter id="corridorGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* 1. Surrounding Neighboring States (Geographic grounding) */}
          {showNeighbors && (
            <g className="neighbor-states">
              {neighborStates.map((nb) => (
                <g 
                  key={nb.code}
                  className="cursor-pointer group"
                  onClick={() => onSelectState && onSelectState(nb.code)}
                  onMouseEnter={(e) => {
                    const rect = containerRef.current?.getBoundingClientRect();
                    if (rect) {
                      setHoveredItem({
                        type: 'neighbor',
                        data: nb,
                        x: e.clientX - rect.left,
                        y: e.clientY - rect.top
                      });
                    }
                  }}
                  onMouseLeave={() => setHoveredItem(null)}
                >
                  <path
                    d={nb.path}
                    fill="#0a0f1d"
                    stroke="#1e293b"
                    strokeWidth="1.2"
                    strokeLinejoin="round"
                    className="transition-colors hover:fill-[#111a2e]"
                  />
                  {/* Subtle neighbor state code label */}
                  <text
                    x={nb.labelX}
                    y={nb.labelY}
                    fill="#475569"
                    fontSize="13"
                    fontWeight="700"
                    textAnchor="middle"
                    dominantBaseline="central"
                    className="pointer-events-none tracking-wider select-none opacity-60"
                  >
                    {nb.code}
                  </text>
                </g>
              ))}
            </g>
          )}

          {/* 2. Detailed Active State Landmass */}
          {activeStateBoundaryPath && (
            <g className="active-state">
              {/* Outer boundary shadow / accent glow */}
              <path
                d={activeStateBoundaryPath}
                fill="none"
                stroke="#0284c7"
                strokeWidth="4"
                strokeOpacity="0.2"
                strokeLinejoin="round"
              />
              {/* Solid state polygon fill */}
              <path
                d={activeStateBoundaryPath}
                fill="url(#activeStateFill)"
                stroke="#38bdf8"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
            </g>
          )}

          {/* 3. Strategic Waterways / River Corridors */}
          {showRivers && (
            <g className="waterways pointer-events-none">
              {visibleRivers.map((riv) => (
                <g key={riv.id}>
                  {/* River line */}
                  <path
                    d={riv.path}
                    fill="none"
                    stroke="#0284c7"
                    strokeWidth="2.2"
                    strokeOpacity="0.35"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {/* Water label */}
                  <text
                    x={riv.midX}
                    y={riv.midY - 6}
                    fill="#0ea5e9"
                    fontSize="9"
                    fontStyle="italic"
                    fontWeight="500"
                    textAnchor="middle"
                    opacity="0.65"
                    className="select-none"
                  >
                    ~ {riv.name} ~
                  </text>
                </g>
              ))}
            </g>
          )}

          {/* 4. Cities & Capitals */}
          {showCities && (
            <g className="cities pointer-events-none">
              {stateConfig.majorCities.map((city) => {
                const [cx, cy] = project(city.coordinates[0], city.coordinates[1]);
                return (
                  <g key={city.name} transform={`translate(${cx}, ${cy})`}>
                    {city.isCapital ? (
                      <>
                        <circle r="5" fill="#f59e0b" fillOpacity="0.25" />
                        <circle r="3" fill="#fbbf24" stroke="#78350f" strokeWidth="1" />
                        <text 
                          x="0" 
                          y="15" 
                          fill="#fde047" 
                          fontSize="9.5" 
                          fontWeight="700" 
                          textAnchor="middle"
                          stroke="#020617"
                          strokeWidth="2.5"
                          paintOrder="stroke"
                        >
                          ★ {city.name}
                        </text>
                      </>
                    ) : (
                      <>
                        <circle r="2.5" fill="#94a3b8" />
                        <text 
                          x="5" 
                          y="3" 
                          fill="#cbd5e1" 
                          fontSize="8.5" 
                          fontWeight="600" 
                          textAnchor="start"
                          stroke="#020617"
                          strokeWidth="2.2"
                          paintOrder="stroke"
                        >
                          {city.name}
                        </text>
                      </>
                    )}
                  </g>
                );
              })}
            </g>
          )}

          {/* 5. Highway Traffic Segments (Simplified & High-Legibility) */}
          {segmentLayer}

          {/* 6. Continuous Count Stations (Sensors) */}
          {filteredStations.map((sta) => {
            const [sx, sy] = project(sta.coordinates[0], sta.coordinates[1]);
            const isSelected = selectedStation?.id === sta.id;

            return (
              <g
                key={sta.id}
                className="cursor-pointer"
                transform={`translate(${sx}, ${sy})`}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectStation(sta);
                }}
                onMouseEnter={(e) => {
                  const rect = containerRef.current?.getBoundingClientRect();
                  if (rect) {
                    setHoveredItem({
                      type: 'station',
                      data: sta,
                      x: e.clientX - rect.left,
                      y: e.clientY - rect.top
                    });
                  }
                }}
                onMouseLeave={() => setHoveredItem(null)}
              >
                {/* Subtle telemetry pulse */}
                <circle r="7" fill="#10b981" fillOpacity="0.2">
                  <animate attributeName="r" values="5;11;5" dur="2.4s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.5;0.1;0.5" dur="2.4s" repeatCount="indefinite" />
                </circle>
                <circle
                  r="5"
                  fill={isSelected ? '#38bdf8' : '#10b981'}
                  stroke="#ffffff"
                  strokeWidth="1.2"
                />
              </g>
            );
          })}
        </svg>

        {/* Floating Zoom & Map Controls (Bottom Right) */}
        <div className="absolute bottom-4 right-4 flex flex-col gap-1.5 z-20">
          <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-lg p-1 shadow-lg flex flex-col gap-1">
            <button
              onClick={() => setZoom((z) => Math.min(z * 1.25, 4.5))}
              className="p-2 hover:bg-slate-800 text-slate-300 hover:text-white rounded transition"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => setZoom((z) => Math.max(z * 0.8, 0.7))}
              className="p-2 hover:bg-slate-800 text-slate-300 hover:text-white rounded transition"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <div className="h-px bg-slate-800 my-0.5" />
            <button
              onClick={resetView}
              className="p-2 hover:bg-slate-800 text-slate-300 hover:text-white rounded transition"
              title="Reset View"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Minimalist Collapsible Cartographic Legend (Bottom Left) */}
        <div className="absolute bottom-4 left-4 z-20">
          <div className="bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-lg shadow-xl text-xs max-w-xs transition-all overflow-hidden">
            {/* Header with collapse button */}
            <div 
              onClick={() => setIsLegendExpanded(!isLegendExpanded)}
              className="flex items-center justify-between px-3 py-2 bg-slate-800/60 cursor-pointer hover:bg-slate-800 transition"
            >
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-200">{stateConfig.agencyAcronym} Traffic Flow</span>
                <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono font-bold">
                  {stateConfig.code}
                </span>
              </div>
              <button className="text-slate-400 hover:text-slate-200">
                {isLegendExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
              </button>
            </div>

            {isLegendExpanded && (
              <div className="p-3 space-y-2 border-t border-slate-800/80">
                <div className="space-y-1.5 text-[11px]">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-1.5 rounded-xs bg-red-600"></span>
                      <span className="text-slate-300">&gt; 120k AADT</span>
                    </div>
                    <span className="text-slate-500 text-[10px]">High Freight</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-1.5 rounded-xs bg-orange-600"></span>
                      <span className="text-slate-300">70k – 120k</span>
                    </div>
                    <span className="text-slate-500 text-[10px]">Primary Artery</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-1.5 rounded-xs bg-amber-600"></span>
                      <span className="text-slate-300">35k – 70k</span>
                    </div>
                    <span className="text-slate-500 text-[10px]">Regional Artery</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-1 rounded-xs bg-emerald-500"></span>
                      <span className="text-slate-300">15k – 35k</span>
                    </div>
                    <span className="text-slate-500 text-[10px]">Moderate Flow</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-0.5 rounded-xs bg-blue-500"></span>
                      <span className="text-slate-300">&lt; 15k AADT</span>
                    </div>
                    <span className="text-slate-500 text-[10px]">Local Highway</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 border border-white" />
                    <span>ATR Station</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-0.5 bg-sky-400" />
                    <span>Waterway</span>
                  </div>
                </div>

                {/* Scale Bar & North Indicator */}
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500">
                  <div className="flex items-center gap-2">
                    <span className="font-mono">0</span>
                    <div className="w-12 h-1 bg-slate-700 relative">
                      <div className="w-6 h-1 bg-slate-400" />
                    </div>
                    <span className="font-mono">50 mi</span>
                  </div>
                  <span className="font-serif font-bold text-slate-400 text-xs">▲ N</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Minimalist Hover Tooltip */}
        {hoveredItem && (
          <div
            className="absolute z-40 pointer-events-none bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-lg p-3 shadow-2xl text-xs max-w-xs transition-opacity"
            style={{
              left: Math.min(hoveredItem.x + 16, (containerRef.current?.clientWidth || 600) - 260),
              top: Math.max(hoveredItem.y - 45, 12)
            }}
          >
            {hoveredItem.type === 'segment' ? (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1">
                  <span className="font-bold text-slate-100 flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded bg-sky-950 border border-sky-800 text-sky-300 font-mono text-[10px]">
                      {hoveredItem.data.route}
                    </span>
                    <span>{hoveredItem.data.county} Co.</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    MP {hoveredItem.data.logmileStart} - {hoveredItem.data.logmileEnd}
                  </span>
                </div>
                <div className="text-slate-300 text-[11px] leading-tight">
                  {hoveredItem.data.description}
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] bg-slate-950/60 p-1.5 rounded">
                  <div>
                    <span className="text-slate-500 block text-[10px]">2024 AADT</span>
                    <span className="font-bold text-emerald-400">
                      {hoveredItem.data.aadtCurrent.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Truck %</span>
                    <span className="font-bold text-amber-400">
                      {hoveredItem.data.commercialPercent}% ({hoveredItem.data.commercialAadt.toLocaleString()})
                    </span>
                  </div>
                </div>
                <div className="text-[10px] text-sky-400 pt-0.5 flex items-center justify-between">
                  <span>{multiSelectMode ? 'Click to add to natural corridor chain' : 'Click to inspect corridor'}</span>
                  <span className="font-mono text-slate-500">{hoveredItem.data.lanes} lanes · {hoveredItem.data.speedLimit} mph</span>
                </div>
              </div>
            ) : hoveredItem.type === 'station' ? (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1">
                  <span className="font-bold text-emerald-300">{hoveredItem.data.stationNumber}</span>
                  <span className="text-[10px] bg-emerald-950 border border-emerald-800 text-emerald-400 px-1.5 py-0.5 rounded">
                    ATR Sensor
                  </span>
                </div>
                <div className="text-slate-300 text-[11px]">
                  {hoveredItem.data.locationDescription}
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] bg-slate-950/60 p-1.5 rounded">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Station AADT</span>
                    <span className="font-bold text-slate-100">
                      {hoveredItem.data.annualAverageDailyTraffic.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Peak Hour Flow</span>
                    <span className="font-bold text-slate-100">
                      {hoveredItem.data.peakHourVolume.toLocaleString()} vph
                    </span>
                  </div>
                </div>
                <div className="text-[10px] text-emerald-400 pt-0.5">
                  Click to open continuous telemetry hourly curves
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="font-bold text-slate-200">
                  {hoveredItem.data.name} ({hoveredItem.data.code})
                </div>
                <div className="text-[11px] text-slate-400">
                  Neighboring State DOT · Click to switch active view
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
