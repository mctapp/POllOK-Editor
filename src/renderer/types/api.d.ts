import type { ApiType } from '../../preload';

declare global {
  interface Window {
    api: ApiType;
  }
}
