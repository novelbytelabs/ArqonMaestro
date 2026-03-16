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

const AlternativesPageComponent: React.FC<{ miniMode: boolean }> = ({ miniMode }) => (
  <div className="overflow-hidden flex flex-col h-screen pt-[40px] operator-surface">
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

export const AlternativesPage = connect((state: any) => ({
  miniMode: state.miniMode,
}))(AlternativesPageComponent);
