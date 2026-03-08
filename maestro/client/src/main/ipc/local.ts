import fetch from "electron-fetch";
import * as child_process from "child_process";
import * as fs from "fs-extra";
import * as os from "os";
import * as path from "path";
import * as semver from "semver";
import Log from "../log";
import MainWindow from "../windows/main";
import Metadata from "../../shared/metadata";
import RendererBridge from "../bridge";
import Settings from "../settings";
const commandExists = require("command-exists");

type RunnableService = "core" | "speech-engine" | "code-engine";

export default class Local {
  private processes: { [key in RunnableService]?: child_process.ChildProcess } = {};
  private logStreams: { [key in RunnableService]?: fs.WriteStream } = {};
  private pollingInterval?: NodeJS.Timeout;
  private localStartTimeout?: NodeJS.Timeout;
  private started: boolean = false;

  constructor(
    private bridge: RendererBridge,
    private log: Log,
    private mainWindow: MainWindow,
    private metadata: Metadata,
    private settings: Settings
  ) {}

  private captureOutput(service: RunnableService, child: child_process.ChildProcess) {
    if (this.logStreams[service]) {
      return;
    }

    const stream = fs.createWriteStream(path.join(this.settings.path(), `${service}.log`));
    child.stdout!.pipe(stream);
    child.stderr!.pipe(stream);
    this.logStreams[service] = stream;
  }

  private killAll() {
    for (const e of Object.values(this.processes)) {
      if (e) {
        this.killProcess(e);
      }
    }

    for (const e of Object.values(this.logStreams)) {
      if (e) {
        e.end();
      }
    }

    this.processes = {};
    this.logStreams = {};
    this.pkill("arqon-maestro-speech-engine");
    this.pkill("arqon-maestro-code-engine");
    this.pkill("arqon-maestro-core");
    this.pkill("serenade-speech-engine");
    this.pkill("serenade-code-engine");
    this.pkill("serenade-core");
    this.pkill("run-pro");
  }

  private killProcess(child?: child_process.ChildProcess) {
    if (child) {
      child.kill("SIGTERM");
    }
  }

  private pkill(name: string) {
    try {
      if (os.platform() == "win32") {
        child_process.spawnSync("wsl.exe", ["pkill", "-f", name]);
      } else {
        child_process.spawnSync("pkill", ["-f", name]);
      }
    } catch (e) {}
  }

  private stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = undefined;
    }

    if (this.localStartTimeout) {
      clearTimeout(this.localStartTimeout);
      this.localStartTimeout = undefined;
    }
  }

  private setLocalState(localLoading: boolean, backendIssue: string = "") {
    this.bridge.setState(
      {
        backendIssue,
        localLoading,
      },
      [this.mainWindow]
    );
  }

  private failStartup(message: string) {
    this.log.logError(new Error(message));
    this.started = false;
    this.stopPolling();
    this.killAll();
    this.setLocalState(false, message);
  }

  private localPath(...parts: string[]) {
    return path.join(__dirname, "..", "static", "local", ...parts);
  }

  private validateLocalBundle(): string | undefined {
    const requiredPaths: { label: string; path: string }[] = [
      { label: "speech-engine/run-pro", path: this.localPath("speech-engine", "run-pro") },
      {
        label: "code-engine/run-pro",
        path: this.localPath("code-engine", "run-pro"),
      },
      { label: "core/bin/run-pro", path: this.localPath("core", "bin", "run-pro") },
      {
        label: "speech-engine-models",
        path: this.localPath("speech-engine-models"),
      },
      {
        label: "code-engine-models",
        path: this.localPath("code-engine-models"),
      },
    ];

    const missing = requiredPaths
      .filter((entry) => !fs.existsSync(entry.path))
      .map((entry) => entry.label);

    if (missing.length == 0) {
      return undefined;
    }

    return (
      "Local bundle incomplete: missing " +
      missing.join(", ") +
      ". Run `./gradlew client:installServer -x downloadModels` after installing the native dependencies from `maestro/docs/building.md`."
    );
  }

  private watchProcess(service: RunnableService, child?: child_process.ChildProcess) {
    if (!child) {
      return;
    }

    child.once("error", (error) => {
      if (!this.started || !this.pollingInterval) {
        return;
      }

      this.failStartup(
        `${service} failed during local startup: ${error.message || "unknown process error"}`
      );
    });

    child.once("exit", (code, signal) => {
      if (!this.started || !this.pollingInterval) {
        return;
      }

      const exitDetail =
        code !== null ? `exit code ${code}` : signal ? `signal ${signal}` : "unknown exit";
      this.failStartup(`${service} exited before local startup completed (${exitDetail}).`);
    });
  }

  pollUntilRunning() {
    if (this.pollingInterval) {
      return;
    }

    this.setLocalState(true, "");
    this.localStartTimeout = global.setTimeout(() => {
      this.failStartup(
        "Local backend did not become healthy on :17202 within 30 seconds. Check `~/.arqon/speech-engine.log` and `~/.arqon/code-engine.log`, then rebuild the local bundle if needed."
      );
    }, 30000);

    this.pollingInterval = global.setInterval(async () => {
      // speech-engine is always the last to load, so poll until it's ready
      try {
        const response = await fetch("http://localhost:17202/api/status");
        if (await response.json()) {
          this.stopPolling();
          this.setLocalState(false, "");
        }
      } catch (e) {}
    }, 1000);
  }

  requiresNewerMac() {
    return os.platform() == "darwin" && semver.lt(os.release(), "20.0.0");
  }

  async requiresWsl() {
    return os.platform() == "win32" && !(await commandExists("wsl.exe"));
  }

  async start() {
    if (this.started || (await this.requiresWsl())) {
      return;
    }

    const localBundleIssue = this.validateLocalBundle();
    if (localBundleIssue) {
      this.failStartup(localBundleIssue);
      return;
    }

    this.started = true;
    this.killAll();
    this.pollUntilRunning();

    let speechEngineModels = path.join(__dirname, "..", "static", "local", "speech-engine-models");
    this.log.logVerbose("Initial speech engine model path: " + speechEngineModels);

    let codeEngineModels = path.join(__dirname, "..", "static", "local", "code-engine-models");
    this.log.logVerbose("Initial code engine model path: " + codeEngineModels);

    if (os.platform() == "win32") {
      speechEngineModels =
        "/" +
        child_process
          .spawnSync("wsl.exe", [
            "wslpath",
            "-a",
            "'" + speechEngineModels.replace("\\", "\\\\") + "'",
          ])
          .stdout.toString()
          .trim();
      this.log.logVerbose("WSL speech engine path: " + speechEngineModels);

      codeEngineModels =
        "/" +
        child_process
          .spawnSync("wsl.exe", [
            "wslpath",
            "-a",
            "'" + codeEngineModels.replace("\\", "\\\\") + "'",
          ])
          .stdout.toString()
          .trim();
      this.log.logVerbose("WSL code engine path: " + codeEngineModels);
    }

    // here and below: WSL doesn't deal well with paths, so set the cwd to be the same as the binary
    this.processes["speech-engine"] = child_process.spawn(
      os.platform() == "win32" ? "wsl.exe" : "./run-pro",
      os.platform() == "win32" ? ["./run-pro", speechEngineModels] : [speechEngineModels],
      {
        cwd: path.join(__dirname, "..", "static", "local", "speech-engine"),
        shell: true,
        windowsHide: true,
      }
    );
    this.captureOutput("speech-engine", this.processes["speech-engine"]);
    this.watchProcess("speech-engine", this.processes["speech-engine"]);

    this.processes["code-engine"] = child_process.spawn(
      os.platform() == "win32" ? "wsl.exe" : "./run-pro",
      os.platform() == "win32" ? ["./run-pro", codeEngineModels] : [codeEngineModels],
      {
        cwd: path.join(__dirname, "..", "static", "local", "code-engine"),
        shell: true,
        windowsHide: true,
      }
    );
    this.captureOutput("code-engine", this.processes["code-engine"]);
    this.watchProcess("code-engine", this.processes["code-engine"]);

    this.processes["core"] = child_process.spawn(
      os.platform() == "win32" ? "wsl.exe" : "./run-pro",
      os.platform() == "win32" ? ["./run-pro"] : [],
      {
        cwd: path.join(__dirname, "..", "static", "local", "core", "bin"),
        shell: true,
        windowsHide: true,
      }
    );
    this.captureOutput("core", this.processes["core"]);
    this.watchProcess("core", this.processes["core"]);
  }

  stop() {
    this.started = false;
    this.stopPolling();
    this.killAll();
    this.setLocalState(false);
  }
}
