/**
 * Next.js instrumentation file.
 *
 * Node.js 25+ exposes a global `localStorage` object, but without a valid
 * `--localstorage-file` path its methods (getItem, setItem, etc.) throw
 * "is not a function" errors.  This breaks any library code that accesses
 * localStorage during SSR.
 *
 * We replace the broken global with a no-op shim on the server so that SSR
 * code simply gets null/undefined instead of crashing.
 */

export async function register() {
  if (typeof window === 'undefined' && typeof globalThis.localStorage !== 'undefined') {
    // Only patch when the built-in Storage methods are missing / broken
    try {
      globalThis.localStorage.getItem('__probe__');
    } catch {
      const noop = () => null;
      globalThis.localStorage = {
        getItem: noop,
        setItem: noop,
        removeItem: noop,
        clear: noop,
        key: noop,
        length: 0,
      } as unknown as Storage;
    }
  }
}
