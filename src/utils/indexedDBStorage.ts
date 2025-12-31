export const indexedDBStorage = {
    getItem: async (name: string): Promise<string | null> => {
        if (typeof window === 'undefined' || !window.indexedDB) return null;
        return new Promise((resolve) => {
            const request = indexedDB.open('asset-cache-db', 1);

            request.onupgradeneeded = (event: any) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('keyval')) {
                    db.createObjectStore('keyval');
                }
            };

            request.onsuccess = (event: any) => {
                const db = event.target.result;
                const tx = db.transaction('keyval', 'readonly');
                const store = tx.objectStore('keyval');
                const getReq = store.get(name);

                getReq.onsuccess = () => resolve(getReq.result || null);
                getReq.onerror = () => resolve(null);
            };

            request.onerror = () => resolve(null);
        });
    },

    setItem: async (name: string, value: string): Promise<void> => {
        if (typeof window === 'undefined' || !window.indexedDB) return;
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('asset-cache-db', 1);

            request.onupgradeneeded = (event: any) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('keyval')) {
                    db.createObjectStore('keyval');
                }
            };

            request.onsuccess = (event: any) => {
                const db = event.target.result;
                const tx = db.transaction('keyval', 'readwrite');
                const store = tx.objectStore('keyval');
                const putReq = store.put(value, name);

                putReq.onsuccess = () => resolve();
                putReq.onerror = () => reject(putReq.error);
            };

            request.onerror = () => reject(request.error);
        });
    },

    removeItem: async (name: string): Promise<void> => {
        if (typeof window === 'undefined' || !window.indexedDB) return;
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('asset-cache-db', 1);

            request.onsuccess = (event: any) => {
                const db = event.target.result;
                const tx = db.transaction('keyval', 'readwrite');
                const store = tx.objectStore('keyval');
                const delReq = store.delete(name);

                delReq.onsuccess = () => resolve();
                delReq.onerror = () => reject(delReq.error);
            };
        });
    },
};
