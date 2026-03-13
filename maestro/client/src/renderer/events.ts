import * as revisionBox from "./pages/revision-box";
import { updateMiniModeWindowHeight } from "./pages/mini-mode";
import store from "./state/store";
import { shell } from "./shell";

const routeToHash = (url: string) => {
  const normalized = url.startsWith("#") ? url.slice(1) : url;
  window.location.hash = normalized.startsWith("/") ? normalized : `/${normalized}`;
};

export const register = () => {
  shell.onFocusRevisionBox(() => {
    revisionBox.focus();
  });

  shell.onFocusTextInput(() => {
    const input: any = document.getElementById("text-input");
    if (!input) {
      return;
    }

    input.focus();
  });

  shell.onRequestRevisionBoxState((data) => {
    shell.sendRevisionBoxState({
      id: data.id,
      ...revisionBox.getEditorState(),
    });
  });

  shell.onSetRevisionBoxState((data) => {
    revisionBox.setEditorState(
      { source: data.source, cursor: data.cursor, cursorEnd: data.cursorEnd },
      data.allEditors
    );
  });

  shell.onStatePatch((data) => {
    for (const k of Object.keys(data)) {
      store.dispatch({ type: k, [k]: data[k] });
    }
  });

  shell.onRouteChange((data) => {
    routeToHash(data.url);
  });

  shell.onMiniModeHeightUpdate(() => {
    updateMiniModeWindowHeight();
  });
};
