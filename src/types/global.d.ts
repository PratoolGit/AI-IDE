import type { IdeApi } from "../../electron/preload";

declare global {
  interface Window {
    ide: IdeApi;
  }
}
export {};
