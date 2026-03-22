import React from "react";
import { connect } from "react-redux";
import { ListenStatus } from "../components/listen-status";
import { ListenToggle } from "../components/listen-toggle";
import { AlternativesList } from "../components/alternatives-list";
import { ActiveAppIndicator } from "../components/indicators/active-app-indicator";
import { ConnectionIndicator } from "../components/indicators/connection-indicator";
import { EndpointIndicator } from "../components/indicators/endpoint-indicator";
import { LanguageIndicator } from "../components/indicators/language-indicator";
import { ModeIndicator } from "../components/indicators/mode-indicator";
import { SettingsButton } from "../components/settings-button";
import { VolumeIndicator } from "../components/indicators/volume-indicator";
import { shell } from "../shell";

const AlternativesPageComponent: React.FC<{
  miniMode: boolean;
  securityPasskeyBootstrapBlocked: boolean;
  securityPasskeyProviderReady: boolean;
}> = ({
  miniMode,
  securityPasskeyBootstrapBlocked,
  securityPasskeyProviderReady,
}) => {
  React.useEffect(() => {
    shell.send("securityRefreshStatus");
  }, []);

  const passkeyLocked = securityPasskeyBootstrapBlocked;
  return (
    <div className="overflow-hidden flex flex-col h-screen pt-[40px]">
      <div className="flex items-center justify-between select-none px-2 py-1">
        <div className="flex items-center pl-1" style={{ minHeight: "30px" }}>
          <ListenToggle />
          <ListenStatus />
        </div>
        <div className="flex items-center pr-1">
          <VolumeIndicator />
          <ConnectionIndicator />
          <SettingsButton />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-2">
        {passkeyLocked && !miniMode ? (
          <div className="mb-2 rounded-lg border border-amber-400/40 bg-amber-500/10 p-2.5 animate-fade-in">
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-200">
              Locked Startup Gate
            </div>
            <div className="text-xs text-amber-100/90 mt-1">
              Authenticated session bootstrap is required before listening can start.
            </div>
            <div className="text-[11px] text-amber-100/70 mt-1">
              Provider readiness: {securityPasskeyProviderReady ? "ready" : "degraded"}
            </div>
            <div className="text-[11px] text-amber-100/70 mt-1">
              Sign in and wait for backend health to turn ready, then retry listening.
            </div>
          </div>
        ) : null}
        {miniMode ? null : (
          <div className="glass-card p-2 animate-fade-in">
            <AlternativesList miniModePage={false} />
          </div>
        )}
      </div>
      <div
        className="status-indicators flex border-t border-cyan-500/20 mt-1.5 bg-black/20 backdrop-blur-md"
        style={{
          padding: "4px 8px",
        }}
      >
        <div className="flex scale-90 origin-left">
          <ActiveAppIndicator />
        </div>
        <div className="flex ml-auto gap-2 scale-90 origin-right">
          <ModeIndicator />
          <LanguageIndicator />
          <EndpointIndicator />
        </div>
      </div>
    </div>
  );
};

export const AlternativesPage = connect((state: any) => ({
  miniMode: state.miniMode,
  securityPasskeyBootstrapBlocked: !!state.securityPasskeyBootstrapBlocked,
  securityPasskeyProviderReady: !!state.securityPasskeyProviderReady,
}))(AlternativesPageComponent);
