"use client";

import { createContext, useCallback, useContext, useState, useSyncExternalStore } from "react";
import { checkPrivacyPin } from "@/app/pin-actions";

const STORAGE_KEY = "fam-asset-privacy-unlocked";

type Listener = () => void;
const listeners = new Set<Listener>();

function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify() {
  for (const listener of listeners) listener();
}

function getSnapshot() {
  return sessionStorage.getItem(STORAGE_KEY) === "1";
}

function getServerSnapshot() {
  return false;
}

interface PrivacyGateContextValue {
  pinRequired: boolean;
  unlocked: boolean;
  pending: boolean;
  error: string | null;
  unlock: (pin: string) => Promise<boolean>;
  lock: () => void;
}

const PrivacyGateContext = createContext<PrivacyGateContextValue | null>(null);

export function PrivacyGateProvider({
  pinRequired,
  children,
}: {
  pinRequired: boolean;
  children: React.ReactNode;
}) {
  const storedUnlocked = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const unlocked = pinRequired ? storedUnlocked : true;
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unlock = useCallback(async (pin: string) => {
    setPending(true);
    setError(null);
    try {
      const ok = await checkPrivacyPin(pin);
      if (ok) {
        sessionStorage.setItem(STORAGE_KEY, "1");
        notify();
      } else {
        setError("PIN이 올바르지 않습니다.");
      }
      return ok;
    } finally {
      setPending(false);
    }
  }, []);

  const lock = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY);
    notify();
    setError(null);
  }, []);

  return (
    <PrivacyGateContext.Provider value={{ pinRequired, unlocked, pending, error, unlock, lock }}>
      {children}
    </PrivacyGateContext.Provider>
  );
}

export function usePrivacyGate() {
  const ctx = useContext(PrivacyGateContext);
  if (!ctx) throw new Error("usePrivacyGate must be used within PrivacyGateProvider");
  return ctx;
}
