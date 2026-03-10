const chokidar = require("chokidar");
const driver = require("./arqon-maestro-driver");
const glob = require("glob");
const os = require("os");
const path = require("path");
const WebSocket = require("ws");

let commands = {};
let hints = {};
let words = {};
let onContextChangedCallback = () => {};
let lastReload = 0;
const scriptRoots = [
  path.join(os.homedir(), ".arqon", "scripts"),
  path.join(os.homedir(), ".serenade", "scripts"),
];
let websocket;
let resolvers = {};
let messageCounter = 0;

const nextMessageId = () => {
  messageCounter += 1;
  return `arq_custom_${Date.now()}_${messageCounter}`;
};

const createBuilder = (applications, languages, extensions, urls) => {
  if (typeof applications === "string") {
    applications = [applications];
  }

  for (let i = 0; i < applications.length; i++) {
    if (applications[i] === "intellij") {
      applications[i] = "jetbrains";
    }
  }

  if (typeof languages === "string") {
    languages = [languages];
  }

  if (typeof extensions === "string") {
    extensions = [extensions];
  }

  if (typeof urls === "string") {
    urls = [urls];
  }

  return {
    command: (templated, callback, options, disabled) => {
      const id = Math.random().toString();
      commands[id] = {
        id,
        applications,
        languages,
        extensions,
        urls,
        templated,
        autoExecute: options && options.autoExecute,
        chainable: options && options.chainable,
        callback,
        disabled: !!disabled,
      };

      return id;
    },

    disable: (ids) => {
      if (typeof ids === "string") {
        ids = [ids];
      }

      for (const id of ids) {
        if (commands[id]) {
          commands[id].disabled = true;
        }
        if (words[id]) {
          words[id].disabled = true;
        }
        if (hints[id]) {
          hints[id].disabled = true;
        }
      }

      sendCommands();
    },

    enable: (ids) => {
      if (typeof ids === "string") {
        ids = [ids];
      }

      for (const id of ids) {
        if (commands[id]) {
          commands[id].disabled = false;
        }
        if (words[id]) {
          words[id].disabled = false;
        }
        if (hints[id]) {
          hints[id].disabled = false;
        }
      }

      sendCommands();
    },

    hint: (hint, disabled) => {
      const id = Math.random().toString();
      hints[id] = {
        id,
        applications,
        languages,
        extensions,
        urls,
        hint,
        disabled: !!disabled,
      };
    },

    key: (templated, key, modifiers, options, disabled) => {
      const id = Math.random().toString();
      commands[id] = {
        id,
        applications,
        languages,
        extensions,
        urls,
        templated,
        autoExecute: options && options.autoExecute,
        chainable: options && options.chainable,
        callback: (api) => {
          api.pressKey(key, modifiers);
        },
        disabled: !!disabled,
      };

      return id;
    },

    pronounce: (before, after, disabled) => {
      const id = Math.random().toString();
      words[id] = {
        id,
        applications,
        languages,
        extensions,
        urls,
        before,
        after,
        disabled: !!disabled,
      };

      return id;
    },

    snippet: (templated, generated, options, snippetType, disabled) => {
      const id = Math.random().toString();
      if (options && arguments.length == 3) {
        if (options.formatting) {
          options = options.formatting;
        }
        if (options.snippetType) {
          snippetType = options.snippetType;
        }
      }

      commands[id] = {
        id,
        applications,
        languages,
        extensions,
        urls,
        templated,
        generated,
        options,
        snippetType,
        disabled: !!disabled,
      };

      return id;
    },

    text: (templated, text, options, disabled) => {
      const id = Math.random().toString();
      commands[id] = {
        id,
        applications,
        languages,
        extensions,
        urls,
        templated,
        autoExecute: options && options.autoExecute,
        chainable: options && options.chainable,
        callback: (api) => {
          api.typeText(text);
        },
        disabled: !!disabled,
      };

      return id;
    },
  };
};

const domBlur = (query) => {
  send("domBlur", { query });
};

const domClick = (query) => {
  send("domClick", { query });
};

const domCopy = (query) => {
  send("domCopy", { query });
};

const domFocus = (query) => {
  send("domFocus", { query });
};

const domScroll = (query) => {
  send("domScroll", { query });
};

const evaluateInPlugin = (command) => {
  send("evaluateInPlugin", {
    command,
  });
};

const reload = () => {
  lastReload = Date.now();
  commands = {};
  hints = {};
  words = {};
  const patterns = scriptRoots.map((root) => `${root}/**/*.js`);
  glob(
    patterns.length == 1 ? patterns[0] : `{${patterns.join(",")}}`,
    { follow: true, ignore: ["**/node_modules/**", "**/.git/**"], nodir: true },
    (globError, files) => {
      let error = false;
      if (globError) {
        error = true;
        console.error(globError);
        send("error", { error: globError.stack });
      }

      const uniqueFiles = [...new Set(files)].sort();
      for (const file of uniqueFiles) {
        try {
          delete require.cache[require.resolve(file)];
          require(file);
        } catch (e) {
          error = true;
          console.error(e);
          send("error", { error: e.stack });
          break;
        }
      }

      if (!error) {
        send("error", { error: "" });
        sendCommands();
      }
    }
  );
};

const runCommand = async (text) => {
  send("sendText", { text });
  return new Promise((resolve) => {
    resolvers[text] = resolve;
  });
};

const send = (message, data) => {
  if (!websocket || websocket.readyState != 1) {
    return;
  }

  websocket.send(
    JSON.stringify({
      id: nextMessageId(),
      timestamp: new Date().toISOString(),
      type: "message",
      version: "1.0",
      room: "maestro",
      channel: "plugin.chrome",
      payload: {
        protocol: "maestro-plugin-v1",
        app: "custom",
        id: "custom-commands-server",
        message,
        data,
      },
      metadata: {
        transport: "arqonbus",
      },
    })
  );
};

const sendCommands = () => {
  send("customCommands", {
    commands: Object.values(commands).filter((e) => !e.disabled),
    hints: Object.values(hints).filter((e) => !e.disabled),
    words: Object.values(words).filter((e) => !e.disabled),
  });
};

const arqon = {
  app: (applications) => {
    return createBuilder(applications, [], [], []);
  },

  global: () => {
    return createBuilder([], [], [], []);
  },

  language: (languages) => {
    return createBuilder([], languages, [], []);
  },

  extension: (extensions) => {
    return createBuilder([], [], extensions, []);
  },

  scope: (applications, languages) => {
    return createBuilder(applications, languages, [], []);
  },

  url: (urls, applications) => {
    if (!applications) {
      applications = ["chrome", "edge"];
    }

    return createBuilder(applications, [], [], urls);
  },

  onContextChanged: (callback) => {
    onContextChangedCallback = callback;
  },
};

const serenade = arqon;

const main = () => {
  global.arqon = arqon;
  global.serenade = arqon;

  driver.focus = driver.focusApplication;
  driver.domBlur = domBlur;
  driver.domClick = domClick;
  driver.domCopy = domCopy;
  driver.domFocus = domFocus;
  driver.domScroll = domScroll;
  driver.evaluateInPlugin = evaluateInPlugin;
  driver.runCommand = runCommand;

  websocket = new WebSocket("ws://localhost:9100");
  websocket.on("message", async (message) => {
    const parsed = JSON.parse(typeof message === "string" ? message : message.toString());
    const request = parsed && parsed.payload && parsed.payload.message ? parsed.payload : parsed;
    if (!request || !request.message) {
      return;
    }
    if (request.message == "execute") {
      if (Object.keys(commands).includes(request.data.id)) {
        await commands[request.data.id].callback(driver, request.data.matches);
      }

      resolvers = {};
    } else if (request.message == "reload") {
      reload();
    } else if (request.message == "keepalive") {
      send("keepalive", {});
    } else if (request.message == "callback") {
      if (Object.keys(resolvers).includes(request.data.transcript)) {
        resolvers[request.data.transcript]();
      }
    } else if (request.message == "contextChanged") {
      if (onContextChangedCallback) {
        onContextChangedCallback(request.data);
      }
    }
  });

  websocket.on("open", () => {
    reload();
  });

  chokidar.watch(scriptRoots).on("all", () => {
    if (lastReload > Date.now() - 1000) {
      return;
    }

    reload();
  });
};

try {
  main();
} catch (e) {
  console.log(e);
}
