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
  <div className="maestro-shell h-screen overflow-hidden pt-[24px]">
    <div className="maestro-shell__inner">
      <section className="operator-frame operator-hero select-none">
        <div className="operator-hero__eyebrow">
          <span className="operator-chip operator-chip--brand">Arqon Maestro</span>
          <span className="operator-chip">Operator Shell</span>
        </div>
        <div className="operator-hero__row">
          <div className="operator-hero__status">
            <ListenToggle />
            <ListenStatus />
          </div>
          <div className="operator-hero__actions">
            <VolumeIndicator />
            <ConnectionIndicator />
            <SettingsButton />
          </div>
        </div>
        <div className="operator-hero__summary">
          Compact voice control for live operating flow, active context, and rapid command response.
        </div>
      </section>

      <section className="operator-frame operator-strip">
        <div className="operator-strip__primary">
          <div className="operator-strip__label">Active Context</div>
          <ActiveAppIndicator />
        </div>
        <div className="operator-strip__secondary">
          <ModeIndicator />
          <LanguageIndicator />
          <EndpointIndicator />
        </div>
      </section>

      <section className="operator-list-shell">
        {miniMode ? null : <AlternativesList miniModePage={false} />}
      </section>
    </div>
  </div>
);

export const AlternativesPage = connect((state: any) => ({
  miniMode: state.miniMode,
}))(AlternativesPageComponent);
