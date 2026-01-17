/**
 * Next.js Instrumentation
 * Runs once when the server starts
 */

export async function register() {
  // Polyfill localStorage for Node.js if it exists but lacks methods
  // This is needed for Node.js 25+ which has experimental localStorage
  if (typeof globalThis.localStorage === 'object' && typeof globalThis.localStorage.getItem !== 'function') {
    const storage = new Map<string, string>();

    (globalThis as any).localStorage = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, String(value)),
      removeItem: (key: string) => storage.delete(key),
      clear: () => storage.clear(),
      key: (index: number) => Array.from(storage.keys())[index] ?? null,
      get length() { return storage.size; },
    };

    console.log('localStorage polyfilled for Node.js');
  }
}
