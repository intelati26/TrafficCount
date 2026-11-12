import React, { useState } from 'react';
import { 
  X, 
  Map, 
  Check, 
  PlusCircle, 
  ExternalLink, 
  Layers, 
  Compass, 
  Sparkles,
  Building2
} from 'lucide-react';
import { StateConfig } from '../types/traffic';
import { STATE_CONFIGS } from '../data/stateRegistry';

interface StateSelectorModalProps {
  activeStateCode: string;
  onSelectState: (stateCode: string) => void;
  onAddCustomState: (newConfig: StateConfig) => void;
  availableStates: Record<string, StateConfig>;
  onClose: () => void;
}

export const StateSelectorModal: React.FC<StateSelectorModalProps> = ({
  activeStateCode,
  onSelectState,
  onAddCustomState,
  availableStates,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'browse' | 'add'>('browse');

  // New State Form
  const [newCode, setNewCode] = useState<string>('');
  const [newName, setNewName] = useState<string>('');
  const [newAgency, setNewAgency] = useState<string>('');
  const [newAcronym, setNewAcronym] = useState<string>('');
  const [newUrl, setNewUrl] = useState<string>('');
  const [newPortalName, setNewPortalName] = useState<string>('');
  const [minLng, setMinLng] = useState<number>(-100.0);
  const [maxLng, setMaxLng] = useState<number>(-90.0);
  const [minLat, setMinLat] = useState<number>(30.0);
  const [maxLat, setMaxLat] = useState<number>(36.0);

  const handleRegisterState = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode || !newName || !newAgency) return;

    const code = newCode.trim().toUpperCase();
    const customConfig: StateConfig = {
      code,
      name: newName.trim(),
      agencyName: newAgency.trim(),
      agencyAcronym: newAcronym.trim() || `${code}DOT`,
      websiteUrl: newUrl.trim() || `https://dot.${newName.toLowerCase().replace(/\s+/g, '')}.gov`,
      portalName: newPortalName.trim() || `${newAgency} Open Data Traffic Portal`,
      bounds: {
        minLng: Number(minLng),
        maxLng: Number(maxLng),
        minLat: Number(minLat),
        maxLat: Number(maxLat)
      },
      borderPoints: [
        [Number(minLng), Number(maxLat)],
        [Number(maxLng), Number(maxLat)],
        [Number(maxLng), Number(minLat)],
        [Number(minLng), Number(minLat)],
        [Number(minLng), Number(maxLat)]
      ],
      districts: [
        {
          id: `${code.toLowerCase()}-d1`,
          name: 'Headquarters & Metro District',
          code: 'D1',
          areaName: 'Primary Statewide Region',
          officeCity: 'Capital Office',
          counties: ['Central'],
          highwayMiles: 2500,
          bridgeCount: 1200,
          color: '#10b981'
        }
      ],
      keyCorridors: ['Primary Interstate', 'US Route 1'],
      majorCities: [
        { name: `${newName} Capital`, coordinates: [(Number(minLng) + Number(maxLng)) / 2, (Number(minLat) + Number(maxLat)) / 2], isCapital: true }
      ]
    };

    onAddCustomState(customConfig);
    onSelectState(code);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-3xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="font-bold text-slate-100 text-sm">
                State DOT Traffic Systems &amp; Open Data Registry
              </h3>
              <p className="text-[11px] text-slate-400">
                Select an active State Department of Transportation or register an additional state
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex items-center border-b border-slate-800 bg-slate-950/70 p-1 text-xs">
          <button
            onClick={() => setActiveTab('browse')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              activeTab === 'browse' ? 'bg-slate-800 text-emerald-400 shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Available States ({Object.keys(availableStates).length})
          </button>
          <button
            onClick={() => setActiveTab('add')}
            className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1 ${
              activeTab === 'add' ? 'bg-slate-800 text-emerald-400 shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Register New State DOT</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto flex-1">
          {activeTab === 'browse' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {Object.values(availableStates).map((s) => {
                const isActive = activeStateCode === s.code;
                return (
                  <div
                    key={s.code}
                    onClick={() => {
                      onSelectState(s.code);
                      onClose();
                    }}
                    className={`p-3.5 rounded-xl border cursor-pointer transition text-xs space-y-2 relative ${
                      isActive 
                        ? 'bg-slate-800/95 border-emerald-500 shadow-lg ring-1 ring-emerald-500/50' 
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                    }`}
                  >
                    {isActive && (
                      <span className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center font-bold">
                        <Check className="w-3.5 h-3.5" />
                      </span>
                    )}

                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-lg bg-emerald-950 border border-emerald-700 text-emerald-400 flex items-center justify-center font-bold font-mono text-xs">
                        {s.code}
                      </span>
                      <div>
                        <span className="font-bold text-slate-100 text-sm block leading-tight">{s.name}</span>
                        <span className="text-[10px] text-slate-400">{s.agencyAcronym}</span>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-400 line-clamp-1 leading-snug">
                      {s.portalName}
                    </div>

                    <div className="pt-1 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500">
                      <span>{s.districts.length} Districts</span>
                      <span className="font-mono text-slate-400">{s.keyCorridors.slice(0, 3).join(', ')}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <form onSubmit={handleRegisterState} className="space-y-4 max-w-xl mx-auto text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">State Postal Code (2 Letters) *</label>
                  <input
                    type="text"
                    required
                    maxLength={2}
                    placeholder="e.g. TX, CA, OH, FL"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-100 font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">State Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Texas"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">DOT Agency Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Texas Department of Transportation"
                    value={newAgency}
                    onChange={(e) => setNewAgency(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Agency Acronym</label>
                  <input
                    type="text"
                    placeholder="e.g. TxDOT"
                    value={newAcronym}
                    onChange={(e) => setNewAcronym(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Official Traffic Maps / Open Data URL</label>
                <input
                  type="url"
                  placeholder="https://www.txdot.gov/data-maps/traffic-counts.html"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-100"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Portal Name</label>
                <input
                  type="text"
                  placeholder="e.g. TxDOT Statewide Traffic Analysis and Reporting System"
                  value={newPortalName}
                  onChange={(e) => setNewPortalName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-100"
                />
              </div>

              <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-2">
                <span className="text-slate-400 font-medium block">Geographic Bounding Box (WGS84 Coordinates)</span>
                <div className="grid grid-cols-4 gap-2 font-mono">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Min Lng</span>
                    <input
                      type="number"
                      step="0.01"
                      value={minLng}
                      onChange={(e) => setMinLng(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-1.5 py-1 text-slate-200"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Max Lng</span>
                    <input
                      type="number"
                      step="0.01"
                      value={maxLng}
                      onChange={(e) => setMaxLng(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-1.5 py-1 text-slate-200"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Min Lat</span>
                    <input
                      type="number"
                      step="0.01"
                      value={minLat}
                      onChange={(e) => setMinLat(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-1.5 py-1 text-slate-200"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Max Lat</span>
                    <input
                      type="number"
                      step="0.01"
                      value={maxLat}
                      onChange={(e) => setMaxLat(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-1.5 py-1 text-slate-200"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('browse')}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded shadow-sm"
                >
                  Save and Switch to State
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
