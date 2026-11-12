import { useEffect, useState } from 'react';

export type DetectedPlatform = 'windows' | 'linux' | 'android' | 'ios' | 'macos' | 'other';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [platform, setPlatform] = useState<DetectedPlatform>('windows');

  useEffect(() => {
    // Detect standalone mode (already installed on Windows, Linux, or Android)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsInstalled(isStandalone);

    // Detect user OS
    const ua = window.navigator.userAgent.toLowerCase();
    if (/android/.test(ua)) {
      setPlatform('android');
    } else if (/windows|win32|win64/.test(ua)) {
      setPlatform('windows');
    } else if (/linux/.test(ua) && !/android/.test(ua)) {
      setPlatform('linux');
    } else if (/iphone|ipad|ipod/.test(ua)) {
      setPlatform('ios');
    } else if (/macintosh|mac os x/.test(ua)) {
      setPlatform('macos');
    } else {
      setPlatform('other');
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = async (): Promise<boolean> => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setDeferredPrompt(null);
      return true;
    }
    return false;
  };

  return {
    isInstallable: !!deferredPrompt,
    isInstalled,
    platform,
    install
  };
}
