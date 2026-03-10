import * as child_process from "child_process";
import * as fs from "fs-extra";
import * as os from "os";
import * as path from "path";
import Settings from "../settings";
import { PluginTransport } from "./plugin-manager";

export default class Custom {
  private primaryServerFilename = "arqon-maestro-custom-commands-server.js";
  private legacyServerFilename = "serenade-custom-commands-server.min.js";
  private defaultCustomCommandsFile: string = `/* ArqonMaestro Custom Commands

In this file, you can define your own custom commands with the ArqonMaestro API.

For instance, here's a custom automation that opens your terminal and runs a command:

arqon.global().command("make", api => {
  api.focusApplication("terminal");
  api.typeText("make clean && make");
  api.pressKey("return");
});

And, here's a Python snippet for creating a test method:

arqon.language("python").snippet(
  "test method <%identifier%>",
  "def test_<%identifier%>(self):<%newline%><%indent%>pass",
  { "identifier": ["underscores"] }
  "method"
);

For more information, check out the ArqonMaestro API documentation: https://novelbytelabs.github.io/ArqonMaestro/

*/`;

  private keepAliveInterval?: NodeJS.Timeout;
  private keepAliveTimeout?: NodeJS.Timeout;
  private process?: child_process.ChildProcess;
  private resolveStart?: () => void;
  public socket?: PluginTransport;

  constructor(private settings: Settings) {}

  static async create(settings: Settings): Promise<Custom> {
    const instance = new Custom(settings);
    await instance.install();
    return instance;
  }

  clearKeepAliveTimeout() {
    if (this.keepAliveTimeout) {
      clearTimeout(this.keepAliveTimeout);
      this.keepAliveTimeout = undefined;
    }
  }

  connect(socket: PluginTransport) {
    if (this.socket) {
      return;
    }

    this.socket = socket;
    if (this.resolveStart) {
      this.resolveStart();
      this.resolveStart = undefined;
    }
  }

  execute(id: string, matches: any) {
    this.send("execute", { id, matches });
  }

  async install() {
    await fs.mkdirp(path.join(this.settings.path(), "scripts"));
    const customCommandsFile = path.join(this.settings.path(), "scripts", "custom.js");
    if (
      !(await fs.pathExists(customCommandsFile)) ||
      (await fs.readFile(customCommandsFile, "utf8")) == ""
    ) {
      await fs.writeFile(customCommandsFile, this.defaultCustomCommandsFile);
    }

    const server = path.join(this.settings.path(), "ipc");
    await fs.remove(server);
    await fs.mkdirp(server);
    await fs.copy(
      path.join(
        __dirname,
        "..",
        "static",
        "custom-commands-server",
        this.primaryServerFilename
      ),
      path.join(server, this.primaryServerFilename)
    );
    await fs.copy(
      path.join(
        __dirname,
        "..",
        "static",
        "custom-commands-server",
        this.legacyServerFilename
      ),
      path.join(server, this.legacyServerFilename)
    );
    await fs.copy(
      path.join(__dirname, "static", "custom-commands-server-modules"),
      `${server}/node_modules`
    );
  }

  reload() {
    this.send("reload", {});
  }

  send(message: string, data: any) {
    if (!this.socket || this.socket.readyState != 1 || !this.process) {
      return;
    }

    this.socket.send(
      JSON.stringify({
        message,
        data,
      })
    );
  }

  async start(): Promise<void> {
    return new Promise((resolve) => {
      // Do not block app startup indefinitely if the custom commands server
      // can't connect back (e.g. missing sidecar dependencies).
      let resolved = false;
      const resolveOnce = () => {
        if (resolved) {
          return;
        }
        resolved = true;
        this.resolveStart = undefined;
        resolve();
      };

      this.resolveStart = resolveOnce;
      this.stop();
      const stream = fs.createWriteStream(path.join(this.settings.path(), "arqon.log"));
      const fallbackNodeModules = path.join(__dirname, "..", "..", "node_modules");
      const existingNodePath = process.env.NODE_PATH || "";
      const nodePath = [fallbackNodeModules, existingNodePath].filter((e) => e).join(path.delimiter);
      this.process = child_process.fork(this.primaryServerFilename, [], {
        cwd: path.join(this.settings.path(), "ipc"),
        stdio: "pipe",
        env: {
          ...process.env,
          NODE_PATH: nodePath,
        },
      });

      this.process.stdout!.pipe(stream);
      this.process.stderr!.pipe(stream);
      this.process.on("exit", () => {
        resolveOnce();
        this.process = undefined;
      });

      global.setTimeout(() => {
        resolveOnce();
      }, 2000);

      // every 30 seconds, send a keepalive message, and if we don't hear back in 3 seconds,
      // then restart the custom commands process
      this.keepAliveInterval = global.setInterval(() => {
        this.send("keepalive", {});
        this.keepAliveTimeout = global.setTimeout(() => {
          if (this.socket) {
            this.stop();
            this.start();
          }
        }, 3000);
      }, 30000);
    });
  }

  stop() {
    this.clearKeepAliveTimeout();
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = undefined;
    }

    if (this.socket) {
      if (typeof (this.socket as any).terminate === "function") {
        (this.socket as any).terminate();
      } else {
        this.socket.close();
      }
      this.socket = undefined;
    }

    if (this.process) {
      this.process.kill("SIGTERM");
      this.process = undefined;
      if (os.platform() != "win32") {
        child_process.spawnSync("pkill", ["-f", "arqon-maestro-custom-commands-server"]);
        child_process.spawnSync("pkill", ["-f", "serenade-custom-commands-server"]);
      }
    }
  }
}
