"use client";

import { useEffect, useState } from "react";

// Đăng ký service worker + hiện nút "Cài ứng dụng" khi trình duyệt cho phép (Android/Chrome, desktop).
// iPhone (Safari) không hỗ trợ nút này — người dùng cài qua nút Chia sẻ → "Thêm vào MH chính".
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export default function PwaSetup() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setDeferred(null);
      setDone(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!deferred || done) return null;

  return (
    <button
      onClick={async () => {
        await deferred.prompt();
        try {
          await deferred.userChoice;
        } finally {
          setDeferred(null);
        }
      }}
      className="no-print fixed bottom-4 right-4 z-50 inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg hover:bg-emerald-700"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
        <path d="M12 3a1 1 0 0 1 1 1v9.59l2.3-2.3a1 1 0 0 1 1.4 1.42l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 1.4-1.42l2.3 2.3V4a1 1 0 0 1 1-1Zm-7 15a1 1 0 0 1 1 1h12a1 1 0 1 1 0 2H6a2 2 0 0 1-2-2 1 1 0 0 1 1-1Z" />
      </svg>
      Cài ứng dụng
    </button>
  );
}
