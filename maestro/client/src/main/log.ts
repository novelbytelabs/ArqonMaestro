import * as fs from "fs-extra";
import * as path from "path";
import Settings from "./settings";

export default class Log {
  private errorStream?: fs.WriteStream;
  private verboseStream?: fs.WriteStream;

  constructor(private settings: Settings) {}

  logError(e: any) {
    if (!this.errorStream) {
      fs.mkdirpSync(this.settings.path());
      this.errorStream = fs.createWriteStream(path.join(this.settings.path(), "error.log"));
    }

    console.error(e);
    this.errorStream.write(`${e.stack}\n`);
  }

  logVerbose(message: string, includeDate: boolean = true) {
    if (!this.settings.getUseVerboseLogging()) {
      return;
    }

    if (!this.verboseStream) {
      fs.mkdirpSync(this.settings.path());
      this.verboseStream = fs.createWriteStream(path.join(this.settings.path(), "verbose.log"));
    }

    const data = `${includeDate ? Date.now() + " " : ""}${message}`;
    console.log(data);
    this.verboseStream.write(`${data}\n`);
  }
}
