import * as fs from "fs";
import * as mkdirp from "mkdirp";
import * as os from "os";
import * as path from "path";

export default class Settings {
  private systemData: any = {};
  private systemDefaults: any = {};
  private userData: any = {};
  private userDefaults: any = {};

  private createIfNotExists(file: string) {
    mkdirp.sync(path.dirname(file));
    if (!fs.existsSync(file)) {
      fs.closeSync(fs.openSync(file, "w"));
    }
  }

  private preferredPath(): string {
    return path.join(os.homedir(), ".arqon");
  }

  private legacyPath(): string {
    return path.join(os.homedir(), ".serenade");
  }

  private dataForFile(file: string): any {
    if (file == "user") {
      return this.userData;
    } else if (file == "system") {
      return this.systemData;
    }
  }

  private defaultsForFile(file: string): any {
    if (file == "user") {
      return this.userDefaults;
    } else if (file == "system") {
      return this.systemDefaults;
    }
  }

  private get(file: string, key: string): any {
    this.load();
    let data = this.dataForFile(file);
    if (data[key] === undefined) {
      return this.defaultsForFile(file)[key];
    }

    return data[key];
  }

  private load() {
    this.systemData = {};
    this.userData = {};

    this.migrateLegacyFileIfNeeded(this.systemFile(), this.legacySystemFile());
    this.migrateLegacyFileIfNeeded(this.userFile(), this.legacyUserFile());

    try {
      this.systemData = JSON.parse(fs.readFileSync(this.systemFile()).toString());
    } catch (e) {
      this.systemData = {};
    }

    try {
      this.userData = JSON.parse(fs.readFileSync(this.userFile()).toString());
    } catch (e) {
      this.userData = {};
    }
  }

  private save() {
    this.createIfNotExists(this.systemFile());
    this.createIfNotExists(this.userFile());

    fs.writeFileSync(this.systemFile(), JSON.stringify(this.systemData, null, 2));
    fs.writeFileSync(this.userFile(), JSON.stringify(this.userData, null, 2));
  }

  private set(file: string, key: string, value: any) {
    this.load();
    let data = this.dataForFile(file);
    data[key] = value;
    this.save();
  }

  private systemFile(): string {
    return path.join(this.preferredPath(), "arqon.json");
  }

  private userFile(): string {
    return path.join(this.preferredPath(), "settings.json");
  }

  private legacySystemFile(): string {
    return path.join(this.legacyPath(), "serenade.json");
  }

  private legacyUserFile(): string {
    return path.join(this.legacyPath(), "settings.json");
  }

  private migrateLegacyFileIfNeeded(preferred: string, legacy: string) {
    if (!fs.existsSync(legacy)) {
      return;
    }

    const preferredExists = fs.existsSync(preferred);
    const preferredSize = preferredExists ? fs.statSync(preferred).size : 0;
    const legacySize = fs.statSync(legacy).size;
    if (preferredExists && preferredSize > 0) {
      return;
    }

    if (legacySize == 0) {
      return;
    }

    mkdirp.sync(path.dirname(preferred));
    fs.copyFileSync(legacy, preferred);
  }

  getAnimations(): boolean {
    return this.get("user", "animations");
  }

  getAtom(): boolean {
    return this.get("system", "atom");
  }

  getCode(): boolean {
    return this.get("system", "code");
  }

  getInstalled(): boolean {
    return this.get("system", "installed");
  }

  path(): string {
    return path.dirname(this.systemFile());
  }

  setPluginInstalled(plugin: string) {
    this.load();
    let data = this.dataForFile("system");
    if (!data.plugins) {
      data.plugins = [];
    }

    if (!data.plugins.includes(plugin)) {
      data.plugins.push(plugin);
    }

    this.save();
  }
}
