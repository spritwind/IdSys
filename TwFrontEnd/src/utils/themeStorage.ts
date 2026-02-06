/**
 * Theme Storage Utility
 * UC Capital Identity Admin
 *
 * IndexedDB-based theme persistence with localStorage sync cache for FOUC prevention.
 */

type Theme = 'dark' | 'light';

const DB_NAME = 'uc-admin-preferences';
const DB_VERSION = 1;
const STORE_NAME = 'settings';
const THEME_KEY = 'theme';
export const LS_THEME_KEY = 'uc-admin-theme';

function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

export async function getThemePreference(): Promise<Theme> {
    try {
        const db = await openDB();
        return new Promise((resolve) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const req = store.get(THEME_KEY);
            req.onsuccess = () => {
                const val = req.result as Theme | undefined;
                resolve(val === 'light' ? 'light' : 'dark');
            };
            req.onerror = () => resolve('dark');
        });
    } catch {
        return 'dark';
    }
}

export async function setThemePreference(theme: Theme): Promise<void> {
    localStorage.setItem(LS_THEME_KEY, theme);
    try {
        const db = await openDB();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put(theme, THEME_KEY);
    } catch {
        // localStorage is the fallback
    }
}
