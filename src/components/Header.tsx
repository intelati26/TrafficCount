import React, { useState } from 'react';
import { 
  Compass, 
  FileText, 
  Table, 
  Activity, 
  TrendingUp, 
  Database, 
  DownloadCloud, 
  HelpCircle, 
  ExternalLink, 
  HardDrive, 
  Monitor,
  Smartphone,
  Terminal,
  Download,
  Menu,
  X,
  MapPin
} from 'lucide-react';
import { DatabaseStats } from '../services/db';
import { StateConfig } from '../types/traffic';
import { usePWAInstall } from '../hooks/usePWAInstall';

export type ActiveView = 'map' | 'documents' | 'database_grid' | 'telemetry' | 'trends' | 'db_manager' | 'data_packs';

interface HeaderProps {
  activeView: ActiveView;
  onViewChange: (view: ActiveView) => void;
  onOpenBatchArchiver: () => void;
  onOpenInstallModal: () => void;
  onOpenStateSelector: () => void;
  activeState: StateConfig;
  dbStats: DatabaseStats | null;
}

export const Header: React.FC<HeaderProps> = ({
  activeView,
  onViewChange,
  onOpenBatchArchiver,
  onOpenInstallModal,
  onOpenStateSelector,
  activeState,
  dbStats
}) => {
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);
  const { isInstallable, isInstalled, platform } = usePWAInstall();

  const navItems: { id: ActiveView; label: string; icon: React.ReactNode }[] = [
    { id: 'map', label: 'GIS & Flow Map', icon: <Compass className="w-3.5 h-3.5" /> },
    { id: 'documents', label: 'Maps & PDF Archive', icon: <FileText className="w-3.5 h-3.5" /> },
    { id: 'database_grid', label: 'AADT Query Grid', icon: <Table className="w-3.5 h-3.5" /> },
    { id: 'telemetry', label: 'ATR Telemetry', icon: <Activity className="w-3.5 h-3.5" /> },
    { id: 'trends', label: 'Corridor Growth', icon: <TrendingUp className="w-3.5 h-3.5" /> },
    { id: 'data_packs', label: 'Data Packs', icon: <DownloadCloud className="w-3.5 h-3.5" /> },
    { id: 'db_manager', label: 'Database Vault', icon: <Database className="w-3.5 h-3.5" /> }
  ];

  return (
    <>
      <header className="bg-slate-950 border-b border-slate-800 flex-shrink-0 select-none">
        {/* Top Desktop Title Bar */}
        <div className="px-3 sm:px-4 py-2 border-b border-slate-850 flex items-center justify-between text-xs">
          {/* Left: Highway badge & App title */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={onOpenStateSelector}
              className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-700 hover:bg-emerald-600 text-white font-mono font-bold text-xs shadow-sm transition"
              title="Click to switch State DOT"
            >
              <span>{activeState.code}</span>
              <span className="text-[10px] opacity-80">▼</span>
            </button>

            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-100 text-xs tracking-tight">
                  {activeState.agencyAcronym} Traffic Volume Archive Workstation
                </span>
                <span className="hidden md:inline text-[10px] text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                  {activeState.name}
                </span>
              </div>
              <span className="text-[10px] text-slate-400 block font-normal leading-none mt-0.5 hidden sm:block">
                {activeState.portalName}
              </span>
            </div>
          </div>

          {/* Right: Actions, Platform Install, Database Pill */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Install on Windows / Linux / Android button */}
            <button
              onClick={onOpenInstallModal}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded text-[11px] font-medium transition"
              title="Use as native desktop or mobile app on Windows, Linux, and Android"
            >
              {platform === 'android' ? (
                <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
              ) : platform === 'linux' ? (
                <Terminal className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Monitor className="w-3.5 h-3.5 text-sky-400" />
              )}
              <span className="hidden sm:inline">Install App</span>
              <span className="sm:hidden">Install</span>
            </button>

            {/* Database status pill */}
            <div 
              onClick={() => onViewChange('db_manager')}
              className="hidden md:flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[11px] text-slate-300 cursor-pointer hover:border-slate-700 transition"
              title="Click to open local database vault"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="font-mono text-slate-200 font-semibold">
                DB ({dbStats?.totalArchives || 0})
              </span>
            </div>

            {/* Batch Archiver Tool Button */}
            <button
              onClick={onOpenBatchArchiver}
              className="flex items-center gap-1 px-2.5 py-1 bg-emerald-950 hover:bg-emerald-900 border border-emerald-700 text-emerald-300 rounded text-[11px] font-medium transition"
            >
              <DownloadCloud className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Batch Archiver</span>
            </button>

            {/* Help Button */}
            <button
              onClick={() => setShowHelpModal(true)}
              className="p-1 text-slate-400 hover:text-slate-200 rounded"
              title="Application Guide"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation Mode Bar */}
        <div className="px-2 sm:px-3 py-1 flex items-center gap-1 overflow-x-auto bg-slate-900/60 no-scrollbar">
          {navItems.map((item) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition whitespace-nowrap ${
                  isActive
                    ? 'bg-slate-800 text-emerald-400 shadow-sm border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* Guide Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-xl w-full shadow-2xl overflow-hidden text-xs">
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <span className="font-bold text-sm text-slate-100 flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-emerald-400" />
                Cross-Platform DOT Traffic Archive System
              </span>
              <button onClick={() => setShowHelpModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-slate-300 leading-relaxed max-h-[70vh] overflow-y-auto">
              <div>
                <h4 className="font-bold text-slate-100 mb-1">Multi-State DOT Architecture</h4>
                <p>
                  Supports Missouri (MoDOT) and surrounding states: Illinois (IDOT), Kansas (KDOT), Iowa (Iowa DOT), Arkansas (ARDOT), Tennessee (TDOT), Kentucky (KYTC), Nebraska (NDOT), and Oklahoma (ODOT). You can also register any custom state DOT directly from the State Registry modal.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-slate-100 mb-1">Natural Segment Downloads</h4>
                <p>
                  Selecting a road segment allows you to automatically chain surrounding and connected segments along the continuous travelway. You can calculate weighted AADT, total daily vehicle miles traveled (VMT), and export the linked corridor package as GeoJSON, CSV, or save it to your local offline vault.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-slate-100 mb-1">Cross-Platform Support (Windows / Linux / Android)</h4>
                <p>
                  Built with HTML5 PWA compliance and an embedded IndexedDB database engine. It can be installed directly as a standalone native-feel app on Windows 10/11, Linux desktop environments (GNOME/KDE), and Android smartphones/tablets with full offline caching.
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-950 border-t border-slate-800 text-right">
              <button
                onClick={() => setShowHelpModal(false)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
