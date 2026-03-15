import Log from "../log";
import System from "../execute/system";

export default class FocusHistoryService {
  private current?: string;
  private previous?: string;
  private selfApps = new Set(["serenade", "arqon", "arqonmaestro"]);

  constructor(private log: Log) {}

  private emit(event: string, data: Record<string, unknown>) {
    this.log.logVerbose(`[FocusHistoryService] ${JSON.stringify({ event, ...data })}`);
  }

  private normalize(app?: string): string | undefined {
    if (!app) {
      return undefined;
    }

    const normalized = app.trim().toLowerCase();
    if (!normalized || this.selfApps.has(normalized)) {
      return undefined;
    }

    return normalized;
  }

  private isReturnAlias(target: string): boolean {
    return [
      "last focus",
      "previous",
      "previous app",
      "previous application",
      "previous focus",
      "restore focus",
      "return",
      "return focus",
    ].includes(target.trim().toLowerCase());
  }

  observe(app?: string): void {
    const normalized = this.normalize(app);
    if (!normalized || normalized === this.current) {
      return;
    }

    const priorCurrent = this.current;
    if (priorCurrent && priorCurrent !== normalized) {
      this.previous = priorCurrent;
    }
    this.current = normalized;
    this.emit("observe", {
      current: this.current,
      previous: this.previous,
    });
  }

  async refreshFromSystem(system: System): Promise<void> {
    this.observe(await system.determineActiveApplication());
  }

  async focusTarget(target: string, system: System, currentApp?: string): Promise<void> {
    if (this.isReturnAlias(target)) {
      await this.returnFocus(system, currentApp);
      return;
    }

    this.observe(currentApp);
    await system.focus(target);
    await this.refreshFromSystem(system);
  }

  async returnFocus(system: System, currentApp?: string): Promise<boolean> {
    this.observe(currentApp);
    const target = this.previous;
    if (!target) {
      this.emit("return_focus_noop", {
        current: this.current,
        previous: this.previous,
      });
      return false;
    }

    await system.focus(target);
    await this.refreshFromSystem(system);
    return true;
  }

  snapshot() {
    return {
      current: this.current,
      previous: this.previous,
    };
  }
}
