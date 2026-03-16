import React from "react";
import { connect } from "react-redux";
import { Row } from "../settings";
import { LoadingBar } from "../../components/loading-bar";
import { Select } from "../../components/select";
import { Spinner } from "../../components/spinner";
import { Toggle } from "../../components/toggle";
import { Endpoint as EndpointType } from "../../../shared/endpoint";
import { shell } from "../../shell";

const ServerComponent: React.FC<{
  endpoint: EndpointType;
  endpoints: EndpointType[];
  latency: number;
  backendIssue: string;
  loadingPageMessage: string;
  loadingPageProgress: number;
  localLoading: boolean;
  logAudio: boolean;
  logSource: boolean;
  requiresNewerMac: boolean;
  requiresWsl: boolean;
}> = ({
  endpoint,
  endpoints,
  latency,
  backendIssue,
  loadingPageMessage,
  loadingPageProgress,
  localLoading,
  logAudio,
  logSource,
  requiresNewerMac,
  requiresWsl,
}) => {
  const setEndpoint = (endpoint: string) => {
    shell.send("setSettings", { endpoint });
    shell.send(endpoint == "local" ? "startLocal" : "stopLocal");
  };

  const endpointOptions = endpoints.map((e: EndpointType) => ({
    id: e.id,
    value: e.name,
  }));

  return (
    <div className="px-4">
      <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-400/80 mb-2">Server</h2>
      {!requiresWsl ? null : (
        <div className="bg-orange-500/10 border-l-2 border-orange-500 text-orange-200 p-2 my-1 text-sm rounded-r-md">
          <p>
            To use ArqonMaestro Local, you'll need to install{" "}
            <a className="underline text-orange-400" href="https://github.com/novelbytelabs/ArqonMaestro/blob/main/RUN_COMMANDS.md" target="_blank">
              WSL
            </a>
            .
          </p>
        </div>
      )}
      {!requiresNewerMac ? null : (
        <div className="bg-orange-500/10 border-l-2 border-orange-500 text-orange-200 p-2 my-1 text-sm rounded-r-md">
          <p>To use ArqonMaestro Local, you'll need to upgrade to macOS 11.0+.</p>
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
        subtitle="You can help improve ArqonMaestro by sharing your audio data, which will be used to train ArqonMaestro's custom speech models."
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
        subtitle="You can help improve ArqonMaestro by sharing your source code and command data, which will be used to train ArqonMaestro's custom code models."
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
    </div>
  );
};

export const Server = connect((state: any) => ({
  backendIssue: state.backendIssue,
  endpoint: state.endpoint,
  endpoints: state.endpoints,
  latency: state.latency,
  localLoading: state.localLoading,
  loadingPageMessage: state.loadingPageMessage,
  loadingPageProgress: state.loadingPageProgress,
  localVersion: state.localVersion,
  logAudio: state.logAudio,
  logSource: state.logSource,
  requiresNewerMac: state.requiresNewerMac,
  requiresWsl: state.requiresWsl,
}))(ServerComponent);
