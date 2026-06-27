import { useEffect, useState } from "react";

const LEGACY_STORAGE_PREFIX = ["hay", "yak-"].join("");

function legacyStorageKey(key) {
  return key.startsWith("afiacare-") ? key.replace("afiacare-", LEGACY_STORAGE_PREFIX) : null;
}

export function readLocalStorage(key, initialValue = null) {
  try {
    const stored = window.localStorage.getItem(key);
    if (stored !== null) return JSON.parse(stored);

    const legacyKey = legacyStorageKey(key);
    if (!legacyKey) return initialValue;

    const legacyStored = window.localStorage.getItem(legacyKey);
    return legacyStored !== null ? JSON.parse(legacyStored) : initialValue;
  } catch {
    return initialValue;
  }
}

export function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => readLocalStorage(key, initialValue));

  // Keep user progress on the device without needing a backend.
  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Private browsing or blocked storage should not break the demo.
    }
  }, [key, value]);

  return [value, setValue];
}
