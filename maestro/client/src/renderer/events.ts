import * as revisionBox from "./pages/revision-box";
import { updateMiniModeWindowHeight } from "./pages/mini-mode";
import { shell } from "./shell";
import store from "./state/store";

export const register = () => {
  shell.on("focusRevisionBox", (_data: any) => {
    revisionBox.focus();
  });

  shell.on("focusTextInput", (_data: any) => {
    const input: any = document.getElementById("text-input");
    if (!input) {
      return;
    }

    input.focus();
  });

  shell.on("getRevisionBoxState", (data: { id: string }) => {
    shell.send("revisionBoxState", {
      id: data.id,
      ...revisionBox.getEditorState(),
    });
  });

  shell.on(
    "setRevisionBoxState",
    (data: { allEditors?: boolean; source: string; cursor: number; cursorEnd: number }) => {
      revisionBox.setEditorState(
        { source: data.source, cursor: data.cursor, cursorEnd: data.cursorEnd },
        data.allEditors
      );
    }
  );

  shell.on("setState", (data: any) => {
    for (const k of Object.keys(data)) {
      store.dispatch({ type: k, [k]: data[k] });
    }
  });

  shell.on("setURL", (data: { url: string }) => {
    history.pushState(data.url, "ArqonMaestro");
  });

  shell.on("updateMiniModeWindowHeight", (_data: any) => {
    updateMiniModeWindowHeight();
  });
};
