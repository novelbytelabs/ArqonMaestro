import { electronShell } from "./electron-shell";

export { type RendererShell, type ShellStatePatch, type RevisionBoxState } from "./types";

export const shell = electronShell;
