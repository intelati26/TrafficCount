import React, { useState } from 'react';
import { 
  X, 
  Download, 
  Monitor, 
  Smartphone, 
  Terminal, 
  CheckCircle2, 
  ExternalLink,
  Laptop
} from 'lucide-react';
import { usePWAInstall, DetectedPlatform } from '../hooks/usePWAInstall';

interface InstallPlatformModalProps {
  onClose: () => void;
}

export const InstallPlatformModal: React.FC<InstallPlatformModalProps> = ({ onClose }) => {
  const { isInstallable, isInstalled, platform, install } = usePWAInstall();
  const [selectedTab, setSelectedTab] = useState<'windows' | 'linux' | 'android'>(
    platform === 'android' ? 'android' : (platform === 'linux' ? 'linux' : 'windows')
  );

  const handleInstallClick = async () => {
    if (isInstallable) {
      await install();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Download className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="font-bold text-slate-100 text-sm">
                Install on Windows, Linux, or Android
              </h3>
              <p className="text-[11px] text-slate-400">
                Run natively with zero browser chrome, offline caching, and desktop/home screen shortcuts
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Platform Selector Tabs */}
        <div className="flex items-center border-b border-slate-800 bg-slate-950/70 p-1">
          <button
            onClick={() => setSelectedTab('windows')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition ${
              selectedTab === 'windows'
                ? 'bg-slate-800 text-emerald-400 shadow-sm border border-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>Windows</span>
          </button>

          <button
            onClick={() => setSelectedTab('linux')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition ${
              selectedTab === 'linux'
                ? 'bg-slate-800 text-emerald-400 shadow-sm border border-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Linux</span>
          </button>

          <button
            onClick={() => setSelectedTab('android')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition ${
              selectedTab === 'android'
                ? 'bg-slate-800 text-emerald-400 shadow-sm border border-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Android</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Quick Status Pill */}
          {isInstalled ? (
            <div className="p-3 bg-emerald-950/80 border border-emerald-800 rounded-lg text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>Application is already installed and running in standalone native mode!</span>
            </div>
          ) : isInstallable ? (
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-between gap-3">
              <div>
                <span className="font-bold text-slate-200 block">Browser Install Ready</span>
                <span className="text-[11px] text-slate-400">Click to install directly on this device</span>
              </div>
              <button
                onClick={handleInstallClick}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded text-xs transition shadow-sm flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Install Now</span>
              </button>
            </div>
          ) : null}

          {/* Windows Instructions */}
          {selectedTab === 'windows' && (
            <div className="space-y-3">
              <h4 className="font-bold text-slate-200 flex items-center gap-2">
                <Monitor className="w-4 h-4 text-sky-400" />
                Windows 10 / 11 Desktop Installation
              </h4>
              <ol className="list-decimal list-inside space-y-2 text-slate-300 leading-relaxed">
                <li>
                  In <strong>Microsoft Edge</strong> or <strong>Google Chrome</strong>, look for the <strong>Install App icon (⊕ or 💻)</strong> on the right side of the address bar.
                </li>
                <li>
                  Click <strong>"Install DOT Traffic Volume Archive Workstation"</strong>.
                </li>
                <li>
                  Check <em>"Create Desktop shortcut"</em> and <em>"Pin to Taskbar / Start Menu"</em>.
                </li>
                <li>
                  The application opens in its own window with dedicated memory and full offline storage support.
                </li>
              </ol>
            </div>
          )}

          {/* Linux Instructions */}
          {selectedTab === 'linux' && (
            <div className="space-y-3">
              <h4 className="font-bold text-slate-200 flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-400" />
                Linux (Ubuntu, Debian, Fedora, Arch) Installation
              </h4>
              <ol className="list-decimal list-inside space-y-2 text-slate-300 leading-relaxed">
                <li>
                  Open the application in <strong>Chrome</strong>, <strong>Chromium</strong>, or <strong>Brave</strong>.
                </li>
                <li>
                  Click the <strong>Menu (⋮)</strong> in the top right &gt; <strong>Cast, save, and share</strong> &gt; <strong>"Install page as app..."</strong>
                </li>
                <li>
                  Click <strong>"Install"</strong>. Your desktop environment (GNOME, KDE Plasma, XFCE) automatically registers a <code>.desktop</code> entry in your application launcher.
                </li>
                <li>
                  Launch directly from your Linux application menu or terminal like any native software.
                </li>
              </ol>
            </div>
          )}

          {/* Android Instructions */}
          {selectedTab === 'android' && (
            <div className="space-y-3">
              <h4 className="font-bold text-slate-200 flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-emerald-400" />
                Android Mobile &amp; Tablet Installation
              </h4>
              <ol className="list-decimal list-inside space-y-2 text-slate-300 leading-relaxed">
                <li>
                  Open this link in <strong>Google Chrome</strong> or <strong>Samsung Internet</strong> on your Android device.
                </li>
                <li>
                  Tap the <strong>Menu icon (⋮)</strong> in the upper right corner.
                </li>
                <li>
                  Select <strong>"Add to Home screen"</strong> or <strong>"Install App"</strong>.
                </li>
                <li>
                  A high-resolution launcher icon will be placed on your home screen and in your Android app drawer.
                </li>
                <li>
                  Opens fullscreen in standalone mode with bottom navigation, touch zoom gestures, and offline database vault access.
                </li>
              </ol>
            </div>
          )}

          {/* Offline & Persistence Guarantee */}
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-1">
            <span className="font-bold text-slate-300 block">Offline Data Guarantee</span>
            <p className="text-[11px] text-slate-400 leading-normal">
              On all three platforms, the embedded IndexedDB database and service worker store your cached maps, segments, and archived dossiers locally on your device disk. No cloud connection is required once loaded.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-medium text-xs transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
