import React from "react";
import { connect } from "react-redux";
import { Row, setValue } from "../settings";
import { Select } from "../../components/select";
import { Spinner } from "../../components/spinner";
import { Toggle } from "../../components/toggle";
import { Endpoint as EndpointType } from "../../../shared/endpoint";
import { shell } from "../../shell";

const AdvancedComponent: React.FC<{
  endpoints: EndpointType[];
  backendIssue: string;
  localLoading: boolean;
  logAudio: boolean;
  logSource: boolean;
  requiresNewerMac: boolean;
  requiresWsl: boolean;
  animations: boolean;
  clipboardInsert: boolean;
  editorAutocomplete: boolean;
  chunkSilenceThreshold: number;
  chunkSpeechThreshold: number;
  continueRunningInTray: boolean;
  disableSuggestions: boolean;
  executeSilenceThreshold: number;
  minimizedPosition: string;
  miniModeReversed: boolean;
  showRevisionBox: any;
  textInputKeybinding: string;
  useVerboseLogging: boolean;
}> = ({
  endpoints,
  backendIssue,
  localLoading,
  logAudio,
  logSource,
  requiresNewerMac,
  requiresWsl,
  animations,
  clipboardInsert,
  editorAutocomplete,
  chunkSilenceThreshold,
  chunkSpeechThreshold,
  continueRunningInTray,
  disableSuggestions,
  executeSilenceThreshold,
  minimizedPosition,
  miniModeReversed,
  showRevisionBox,
  textInputKeybinding,
  useVerboseLogging,
}) => {
  const minimizedPositionOptions = [
    { id: "window", value: "Follow window" },
    { id: "top-left", value: "Top-left" },
    { id: "top-right", value: "Top-right" },
    { id: "bottom-right", value: "Bottom-right" },
    { id: "bottom-left", value: "Bottom-left" },
  ];

  return (
    <div className="px-4">
      <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-400/80 mb-2">
        Network and Telemetry
      </h2>
      {!requiresWsl ? null : (
        <div className="bg-orange-500/10 border-l-2 border-orange-500 text-orange-200 p-2 my-1 text-sm rounded-r-md">
          <p>
            To use local endpoint mode, you'll need to install{" "}
            <a
              className="underline text-orange-400"
              href="https://github.com/novelbytelabs/ArqonMaestro/blob/main/RUN_COMMANDS.md"
              target="_blank"
            >
              WSL
            </a>
            .
          </p>
        </div>
      )}
      {!requiresNewerMac ? null : (
        <div className="bg-orange-500/10 border-l-2 border-orange-500 text-orange-200 p-2 my-1 text-sm rounded-r-md">
          <p>To use local endpoint mode, you'll need to upgrade to macOS 11.0+.</p>
        </div>
      )}
      {!backendIssue ? null : (
        <div className="bg-red-500/10 border-l-2 border-red-500 text-red-200 p-2 my-1 text-sm rounded-r-md">
          <p>{backendIssue}</p>
        </div>
      )}
      {endpoints && endpoints.length > 0 ? (
        <Row
          title="Server endpoint"
          subtitle={
            <>
              <div>Which server to connect to</div>
              <div>
                {localLoading ? (
                  <span className="font-bold ml-2 text-cyan-400">
                    <Spinner hidden={false} />
                    <span className="ml-1 uppercase text-[10px] tracking-widest">Starting Local</span>
                  </span>
                ) : null}
              </div>
            </>
          }
          action={
            <div className="w-32 ml-auto">
              <div className="glass-card !bg-white/5 border-white/10 text-white/40 py-1.5 px-3 text-center text-sm font-mono cursor-not-allowed">
                LOCAL
              </div>
            </div>
          }
        />
      ) : null}
      <Row
        title="Share audio data"
        subtitle="You can help improve by sharing audio data used to train speech models."
        action={
          <Toggle
            value={logAudio}
            onChange={(e) =>
              shell.send("setSettings", {
                logAudio: e,
              })
            }
          />
        }
      />
      <Row
        title="Share code data"
        subtitle="You can help improve by sharing source and command data used to train code models."
        action={
          <Toggle
            value={logSource}
            onChange={(e) =>
              shell.send("setSettings", {
                logSource: e,
              })
            }
          />
        }
      />

      <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-400/80 mb-2 mt-4">
        Advanced
      </h2>
      <Row
        title="Continue running in tray"
        subtitle="When closed, continue running in the tray rather than quitting"
        action={
          <Toggle
            value={continueRunningInTray}
            onChange={(e) => setValue("continueRunningInTray", e)}
          />
        }
      />
      <Row
        title="Automatically show revision box"
        subtitle="For apps without plugin, automatically show the revision box when dictating"
        action={
          <Toggle
            value={showRevisionBox && showRevisionBox["default"] != "never"}
            onChange={(e) =>
              shell.send("setSettings", {
                showRevisionBox: { default: e ? "auto" : "never" },
              })
            }
          />
        }
      />
      <Row
        title="Show suggestions"
        subtitle="Display tips and tricks as you're using ArqonMaestro"
        action={
          <Toggle
            value={!disableSuggestions}
            onChange={(e) => setValue("disableSuggestions", !e)}
          />
        }
      />
      <Row
        title="Reverse alternatives when above"
        subtitle="When alternatives are above the window, show the first at the bottom"
        action={
          <Toggle value={miniModeReversed} onChange={(e) => setValue("miniModeReversed", e)} />
        }
      />
      <Row
        title="Use clipboard for text"
        subtitle="When adding system-wide text, use the clipboard rather than individual keypresses"
        action={<Toggle value={clipboardInsert} onChange={(e) => setValue("clipboardInsert", e)} />}
      />
      <Row
        title="Show editor animations"
        subtitle="Show animations when editing code"
        action={<Toggle value={animations} onChange={(e) => setValue("animations", e)} />}
      />
      <Row
        title="Automatically trigger autocomplete"
        subtitle="Show the autocomplete window after adding code"
        action={
          <Toggle value={editorAutocomplete} onChange={(e) => setValue("editorAutocomplete", e)} />
        }
      />
      <Row
        title="Minimized position"
        subtitle="Where alternatives appear when ArqonMaestro is minimized"
        action={
          <div className="w-40 ml-auto">
            <Select
              items={minimizedPositionOptions.map((e: any) => e.value)}
              value={
                minimizedPositionOptions.filter((e: any) => e.id == minimizedPosition)[0].value
              }
              onChange={(value: any) =>
                setValue(
                  "minimizedPosition",
                  minimizedPositionOptions.filter((e: any) => e.value == value)[0].id
                )
              }
            />
          </div>
        }
      />
      <Row
        title="Command wait time"
        subtitle={
          <>
            How long to wait before executing a command. Higher means slower speaking pace.{" "}
            <a
              href="#"
              className="underline"
              onClick={(e) => {
                e.preventDefault();
                shell.send("setSettings", {
                  executeSilenceThreshold: 1,
                });
              }}
            >
              Reset
            </a>
          </>
        }
        action={
          <input
            type="number"
            className="input w-20 text-center py-0"
            min="0.5"
            max="2.0"
            step="0.1"
            value={executeSilenceThreshold}
            onChange={(e) =>
              shell.send("setSettings", {
                executeSilenceThreshold: parseFloat(e.target.value),
              })
            }
          />
        }
      />
      <Row
        title="Speech strictness"
        subtitle={
          <>
            How strict the speech detector should be. Higher means fewer things called speech.{" "}
            <a
              href="#"
              className="text-cyan-400 hover:text-cyan-300 transition-colors uppercase text-[10px] font-bold tracking-widest ml-1"
              onClick={(e) => {
                e.preventDefault();
                shell.send("setSettings", {
                  chunkSpeechThreshold: 0.3,
                });
              }}
            >
              Reset
            </a>
          </>
        }
        action={
          <input
            type="number"
            className="input w-20 text-center py-0"
            min="0.0"
            max="1.0"
            step="0.1"
            value={chunkSpeechThreshold}
            onChange={(e) =>
              shell.send("setSettings", {
                chunkSpeechThreshold: parseFloat(e.target.value),
              })
            }
          />
        }
      />
      <Row
        title="Silence strictness"
        subtitle={
          <>
            How strict the silence detector should be. Higher means more things called silence.{" "}
            <a
              href="#"
              className="text-cyan-400 hover:text-cyan-300 transition-colors uppercase text-[10px] font-bold tracking-widest ml-1"
              onClick={(e) => {
                e.preventDefault();
                shell.send("setSettings", {
                  chunkSilenceThreshold: 0.1,
                });
              }}
            >
              Reset
            </a>
          </>
        }
        action={
          <input
            type="number"
            className="input w-20 text-center py-0"
            min="0.0"
            max="1.0"
            step="0.1"
            value={chunkSilenceThreshold}
            onChange={(e) =>
              shell.send("setSettings", {
                chunkSilenceThreshold: parseFloat(e.target.value),
              })
            }
          />
        }
      />
      <Row
        title="Toggle text input"
        subtitle="Keyboard shortcut for toggling type to ArqonMaestro"
        action={
          <input
            type="text"
            className="input w-36 py-1"
            defaultValue={textInputKeybinding}
            onChange={(e) => setValue("textInputKeybinding", e)}
          />
        }
      />
      <Row
        title="Use verbose logging"
        subtitle={
          <>
            Write more information to logs; useful for debugging.
            <br />
            <a
              href="#"
              className="underline"
              onClick={(e) => {
                e.preventDefault();
                shell.send("openLogDirectory");
              }}
            >
              View logs
            </a>
          </>
        }
        action={
          <Toggle value={useVerboseLogging} onChange={(e) => setValue("useVerboseLogging", e)} />
        }
      />
    </div>
  );
};

export const Advanced = connect((state: any) => ({
  endpoints: state.endpoints,
  backendIssue: state.backendIssue,
  localLoading: state.localLoading,
  logAudio: state.logAudio,
  logSource: state.logSource,
  requiresNewerMac: state.requiresNewerMac,
  requiresWsl: state.requiresWsl,
  animations: state.animations,
  clipboardInsert: state.clipboardInsert,
  editorAutocomplete: state.editorAutocomplete,
  chunkSilenceThreshold: state.chunkSilenceThreshold,
  chunkSpeechThreshold: state.chunkSpeechThreshold,
  continueRunningInTray: state.continueRunningInTray,
  disableSuggestions: state.disableSuggestions,
  executeSilenceThreshold: state.executeSilenceThreshold,
  minimizedPosition: state.minimizedPosition,
  miniModeReversed: state.miniModeReversed,
  showRevisionBox: state.showRevisionBox,
  textInputKeybinding: state.textInputKeybinding,
  useVerboseLogging: state.useVerboseLogging,
}))(AdvancedComponent);
