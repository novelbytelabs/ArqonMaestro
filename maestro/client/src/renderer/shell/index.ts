import { ipcRenderer } from "electron";

type ShellListener<T = any> = (data: T) => void;

// Keep Electron IPC behind one renderer boundary so the host can be swapped later.
export const shell = {
  on<T = any>(channel: string, listener: ShellListener<T>) {
    const wrapped = (_event: any, data: T) => {
      listener(data);
    };
    ipcRenderer.on(channel, wrapped);
    return () => {
      ipcRenderer.removeListener(channel, wrapped);
    };
  },

  send(channel: string, data?: any) {
    ipcRenderer.send(channel, data);
  },
};
