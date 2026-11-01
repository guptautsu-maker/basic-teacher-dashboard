import React, { useState } from 'react';
import { usePWAInstall } from '../utils/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'compact' | 'button';
  onToast?: (msg: string) => void;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'button',
  onToast,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);

  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      const accepted = await install();
      if (accepted && onToast) {
        onToast('📲 Teacher Hub WebApp सफलतापूर्वक इंस्टॉल हो गया!');
      }
      return;
    }
    setShowGuideModal(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleInstallClick}
        data-testid="pwa-install-btn"
        aria-label="Install Teacher Hub WebApp (PWA)"
        className={
          variant === 'compact'
            ? 'py-1.5 px-2.5 rounded-lg border border-[#D3DDD6] dark:border-[#2B3C34] bg-[#F8FAF9] dark:bg-[#1E2E26] hover:bg-[#E6EDE8] dark:hover:bg-[#2B3C34] text-[#0D5B49] dark:text-[#3FBF9B] font-semibold text-xs transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 min-h-[36px]'
            : 'py-2 px-3 rounded-lg border border-[#D3DDD6] dark:border-[#2B3C34] bg-[#F8FAF9] dark:bg-[#1E2E26] hover:bg-[#E6EDE8] dark:hover:bg-[#2B3C34] text-[#0D5B49] dark:text-[#3FBF9B] font-semibold text-xs sm:text-sm transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 min-h-[40px]'
        }
      >
        <svg
          className="w-3.5 h-3.5 shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
          />
        </svg>
        <span>{isIOS ? 'iOS ऐप इंस्टॉल' : '📲 ऐप इंस्टॉल (WebApp)'}</span>
      </button>

      {showGuideModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-guide-modal-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-[#D3DDD6] dark:border-[#2B3C34] bg-white dark:bg-[#16231D] p-5 shadow-xl space-y-4">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#D3DDD6] dark:border-[#2B3C34]">
              <div>
                <h3
                  id="pwa-guide-modal-title"
                  className="text-base sm:text-lg font-bold text-[#13231C] dark:text-[#E7F0EA] m-0"
                >
                  📲 Teacher Hub WebApp इंस्टॉल करें (PWA)
                </h3>
                <p className="text-xs text-[#52645B] dark:text-[#9DB0A5] mt-0.5">
                  बिना इंटरनेट (Offline Mode) और फुल-स्क्रीन मोबाइल ऐप अनुभव
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="w-8 h-8 rounded-lg border border-[#D3DDD6] dark:border-[#2B3C34] text-[#52645B] dark:text-[#9DB0A5] hover:text-[#13231C] dark:hover:text-white flex items-center justify-center text-sm"
                aria-label="Close install guide"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs sm:text-sm text-[#13231C] dark:text-[#E7F0EA]">
              <div className="p-3 rounded-xl bg-[#F8FAF9] dark:bg-[#1E2E26] border border-[#D3DDD6] dark:border-[#2B3C34] space-y-1">
                <div className="font-bold text-[#0D5B49] dark:text-[#3FBF9B]">
                  1. Android फ़ोन (Chrome / Edge):
                </div>
                <p className="text-xs text-[#52645B] dark:text-[#9DB0A5]">
                  ब्राउज़र के ऊपर दाईं ओर <strong>⋮ (मेनू)</strong> पर टैप करें और{' '}
                  <strong>&ldquo;Install app&rdquo;</strong> या{' '}
                  <strong>&ldquo;Add to Home screen&rdquo;</strong> चुनें।
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[#F8FAF9] dark:bg-[#1E2E26] border border-[#D3DDD6] dark:border-[#2B3C34] space-y-1">
                <div className="font-bold text-[#0D5B49] dark:text-[#3FBF9B]">
                  2. लैपटॉप / कंप्यूटर (Chrome / Edge):
                </div>
                <p className="text-xs text-[#52645B] dark:text-[#9DB0A5]">
                  एड्रेस बार (URL पट्टी) के दाईं ओर दिखने वाले{' '}
                  <strong>Install (⊕ / कंप्यूटर आइकन)</strong> पर क्लिक करें।
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[#F8FAF9] dark:bg-[#1E2E26] border border-[#D3DDD6] dark:border-[#2B3C34] space-y-1">
                <div className="font-bold text-[#0D5B49] dark:text-[#3FBF9B]">
                  3. iPhone / iPad (Safari):
                </div>
                <p className="text-xs text-[#52645B] dark:text-[#9DB0A5]">
                  Safari टूलबार में <strong>Share (⬆️)</strong> बटन दबाएँ और नीचे स्क्रॉल करके{' '}
                  <strong>&ldquo;Add to Home Screen&rdquo;</strong> पर टैप करें।
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[#D3DDD6] dark:border-[#2B3C34]">
              <span className="text-[11px] font-mono text-[#52645B] dark:text-[#9DB0A5]">
                Manifest: /manifest.webmanifest · Offline Ready
              </span>
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="py-2 px-4 rounded-lg bg-[#0D5B49] hover:bg-[#094537] text-white font-semibold text-xs transition-colors"
              >
                ठीक है (Got it)
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export const OfflineIndicator: React.FC = () => {
  const { isOnline } = usePWAInstall();

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-lg bg-amber-600 px-3.5 py-2 text-xs font-semibold text-white shadow-lg"
    >
      <span>⚡ ऑफ़लाइन मोड सक्रिय (Offline WebApp Mode) — आपका लोकल डेटा सुरक्षित है</span>
    </div>
  );
};
