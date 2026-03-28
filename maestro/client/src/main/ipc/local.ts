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
  private startupHealthy: boolean = false;
  private consecutiveHealthFailures: number = 0;
  private recovering: boolean = false;
  private recoveryAttempts: number = 0;
  private maxRecoveryAttempts: number = 5;

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

  private async servicesHealthy(): Promise<boolean> {
    try {
      const [coreResponse, speechResponse, codeResponse] = await Promise.all([
        fetch("http://localhost:17200/api/status", { method: "GET", timeout: 1500 }),
        fetch("http://localhost:17202/api/status", { method: "GET", timeout: 1500 }),
        fetch("http://localhost:17203/api/status", { method: "GET", timeout: 1500 }),
      ]);
      if (!coreResponse.ok || !speechResponse.ok || !codeResponse.ok) {
        return false;
      }

      const [coreHealthy, speechHealthy, codeHealthy] = await Promise.all([
        coreResponse.json(),
        speechResponse.json(),
        codeResponse.json(),
      ]);
      return !!coreHealthy && !!speechHealthy && !!codeHealthy;
    } catch (_e) {
      return false;
    }
  }

  private async waitForServiceHealthy(url: string, timeoutMs: number = 10000): Promise<boolean> {
    const startedAt = Date.now();
    while (Date.now() - startedAt < timeoutMs) {
      try {
        const response = await fetch(url, { method: "GET", timeout: 1500 });
        if (response.ok) {
          const healthy = await response.json();
          if (!!healthy) {
            return true;
          }
        }
      } catch (_e) {}

      await new Promise((resolve) => global.setTimeout(resolve, 250));
    }

    return false;
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
    this.startupHealthy = false;
    this.consecutiveHealthFailures = 0;
    this.recovering = false;
    this.recoveryAttempts = 0;
    this.stopPolling();
    this.killAll();
    this.setLocalState(false, message);
  }

  private scheduleRecovery(reason: string) {
    if (this.recovering || !this.started) {
      return;
    }

    if (this.recoveryAttempts >= this.maxRecoveryAttempts) {
      this.failStartup(
        `Local backend became unstable and exceeded recovery attempts (${this.maxRecoveryAttempts}). Last reason: ${reason}`
      );
      return;
    }

    this.recovering = true;
    this.recoveryAttempts += 1;
    const attempt = this.recoveryAttempts;
    this.log.logError(
      new Error(`Local backend unhealthy: ${reason}. Attempting recovery ${attempt}/${this.maxRecoveryAttempts}.`)
    );
    this.setLocalState(
      true,
      `Local backend disconnected. Attempting recovery ${attempt}/${this.maxRecoveryAttempts}...`
    );

    this.started = false;
    this.stopPolling();
    this.killAll();
    global.setTimeout(async () => {
      this.recovering = false;
      await this.start();
    }, Math.min(1000 * attempt, 5000));
  }

  private localPath(...parts: string[]) {
    return path.join(__dirname, "..", "static", "local", ...parts);
  }

  private processCommandLine(pid: number): string {
    try {
      const cmdline = fs.readFileSync(`/proc/${pid}/cmdline`);
      return cmdline.toString("utf8").replace(/\0/g, " ").trim();
    } catch (_e) {
      return "";
    }
  }

  private listeningPids(port: number): number[] {
    if (os.platform() == "win32") {
      return [];
    }

    try {
      const result = child_process.spawnSync("ss", ["-ltnp"]);
      const output = `${result.stdout?.toString() || ""}\n${result.stderr?.toString() || ""}`;
      const pattern = new RegExp(`:${port}\\s`);
      const pids: number[] = [];
      for (const line of output.split("\n")) {
        if (!pattern.test(line)) {
          continue;
        }

        const regex = /pid=(\d+)/g;
        let match;
        while ((match = regex.exec(line)) != null) {
          const pid = parseInt(match[1], 10);
          if (!isNaN(pid)) {
            pids.push(pid);
          }
        }
      }

      return [...new Set(pids)];
    } catch (_e) {
      return [];
    }
  }

  private ensurePortsAvailable(): string | undefined {
    const ports = [17200, 17202, 17203];
    for (const port of ports) {
      const initialPids = this.listeningPids(port);
      for (const pid of initialPids) {
        const cmdline = this.processCommandLine(pid);
        if (
          cmdline.includes("arqon-maestro-speech-engine") ||
          cmdline.includes("arqon-maestro-code-engine") ||
          cmdline.includes("serenade-speech-engine") ||
          cmdline.includes("serenade-code-engine") ||
          cmdline.includes("run-pro")
        ) {
          try {
            process.kill(pid, "SIGTERM");
          } catch (_e) {}
        }
      }

      // Give graceful shutdown a moment, then force-kill lingering local engine processes.
      if (initialPids.length > 0) {
        child_process.spawnSync("sleep", ["1"]);
      }
      const afterTermPids = this.listeningPids(port);
      for (const pid of afterTermPids) {
        const cmdline = this.processCommandLine(pid);
        if (
          cmdline.includes("arqon-maestro-speech-engine") ||
          cmdline.includes("arqon-maestro-code-engine") ||
          cmdline.includes("serenade-speech-engine") ||
          cmdline.includes("serenade-code-engine") ||
          cmdline.includes("run-pro")
        ) {
          try {
            process.kill(pid, "SIGKILL");
          } catch (_e) {}
        }
      }

      const remainingPids = this.listeningPids(port);
      if (remainingPids.length > 0) {
        const owners = remainingPids
          .map((pid) => {
            const cmdline = this.processCommandLine(pid) || "unknown";
            return `${pid} (${cmdline})`;
          })
          .join(", ");
        return `Port ${port} is already in use by ${owners}. Stop the conflicting process or switch off local endpoint mode.`;
      }
    }

    return undefined;
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

      const serviceHealthUrl =
        service == "speech-engine"
          ? "http://localhost:17202/api/status"
          : service == "code-engine"
            ? "http://localhost:17203/api/status"
            : "http://localhost:17200/api/status";

      // Some run-pro launchers can exit 0 after handing off to the actual service binary.
      // In that case, poll service health for a bounded warm-up window before failing startup.
      if ((service == "speech-engine" || service == "code-engine") && code === 0) {
        global.setTimeout(async () => {
          if (!this.started || !this.pollingInterval) {
            return;
          }

          const healthy = await this.waitForServiceHealthy(serviceHealthUrl, 12000);
          if (healthy) {
            this.log.logVerbose(
              `${service} launcher exited with code 0 after successful startup handoff.`
            );
            return;
          }

          this.failStartup(
            `${service} exited before local startup completed (exit code 0) and health check failed.`
          );
        }, 500);
        return;
      }

      // Some local wrappers can receive transient signals while the actual
      // service keeps (or quickly becomes) healthy. Confirm health before fail-close.
      if ((service == "speech-engine" || service == "code-engine" || service == "core") && signal) {
        global.setTimeout(async () => {
          if (!this.started || !this.pollingInterval) {
            return;
          }

          const healthy = await this.waitForServiceHealthy(serviceHealthUrl, 12000);
          if (healthy) {
            this.log.logVerbose(
              `${service} launcher exited with signal ${signal} after successful startup handoff.`
            );
            return;
          }

          const exitDetail = `signal ${signal}`;
          this.failStartup(`${service} exited before local startup completed (${exitDetail}).`);
        }, 500);
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
        "Local backend did not become healthy on :17200/:17202/:17203 within 30 seconds. Check `~/.arqon/core.log`, `~/.arqon/speech-engine.log`, and `~/.arqon/code-engine.log`, then rebuild the local bundle if needed."
      );
    }, 30000);

    this.pollingInterval = global.setInterval(async () => {
      const healthy = await this.servicesHealthy();
      if (healthy) {
        this.consecutiveHealthFailures = 0;
        if (!this.startupHealthy) {
          this.startupHealthy = true;
          if (this.localStartTimeout) {
            clearTimeout(this.localStartTimeout);
            this.localStartTimeout = undefined;
          }
          this.setLocalState(false, "");
        }

        return;
      }

      this.consecutiveHealthFailures += 1;
      if (!this.startupHealthy) {
        return;
      }

      if (this.consecutiveHealthFailures >= 3) {
        this.scheduleRecovery("health checks failed three consecutive times");
      }
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
    this.startupHealthy = false;
    this.consecutiveHealthFailures = 0;
    this.killAll();
    const portIssue = this.ensurePortsAvailable();
    if (portIssue) {
      this.failStartup(portIssue);
      return;
    }
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
    this.startupHealthy = false;
    this.consecutiveHealthFailures = 0;
    this.recovering = false;
    this.recoveryAttempts = 0;
    this.stopPolling();
    this.killAll();
    this.setLocalState(false);
  }
}
