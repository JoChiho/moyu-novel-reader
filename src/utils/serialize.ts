/** Strip Vue proxies / non-cloneable values before Electron IPC. */
export function toPlain<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}