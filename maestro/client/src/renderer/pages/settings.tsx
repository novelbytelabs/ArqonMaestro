import React from "react";
import classNames from "classnames";
import { Link } from "react-router-dom";
import { connect } from "react-redux";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBookOpen,
  faCloud,
  faCog,
  faMagic,
  faPlug,
  faShieldAlt,
  faTools,
} from "@fortawesome/free-solid-svg-icons";
import { General } from "./settings/general";
import { Docs } from "./settings/docs";
import { Plugins } from "./settings/plugins";
import { Server } from "./settings/server";
import { Advanced } from "./settings/advanced";
import { Security } from "./settings/security";
import { EnrollmentWizard } from "./settings/enrollment-wizard";
import { Endpoint as EndpointType } from "../../shared/endpoint";
import { shell } from "../shell";

const Section: React.FC<{
  current: string;
  icon: any;
  page: string;
  title: string;
}> = ({ current, icon, page, title }) => {
  const showPage = (e: React.MouseEvent, page: string) => {
    e.preventDefault();
    shell.send("setSettingsPage", page);
  };

  return (
    <a
      href="#"
      onClick={(e: React.MouseEvent) => showPage(e, page)}
      className={classNames(
        "block text-center py-2.5 w-full rounded-lg transition-all duration-300 border flex flex-col items-center justify-center group",
        {
          "text-white/60 border-white/5 hover:border-white/20 hover:bg-white/5": current != page,
          "bg-cyan-500/20 border-cyan-400 text-white shadow-[0_0_15px_rgba(34,211,238,0.3)]":
            current == page,
        }
      )}
      style={{
        minWidth: "72px",
      }}
    >
      <FontAwesomeIcon
        icon={icon}
        className={classNames("settings-icon text-lg mb-1 transition-colors", {
          "text-cyan-400": current == page,
          "text-white/40 group-hover:text-white/80": current != page,
        })}
      />
      <h2 className="text-[10px] uppercase font-bold tracking-widest">{title}</h2>
    </a>
  );
};

export const setValue = (key: string, e: any) => {
  let value: any = e;
  if (e.target) {
    value = e.target.type == "checkbox" ? e.target.checked : e.target.value;
  }

  shell.send("setSettings", { [key]: value });
};

export const Row: React.FC<{
  title: any;
  subtitle?: any;
  action: any;
}> = ({ title, subtitle, action }) => (
  <div className="flex items-center border-b py-3 border-white/5">
    <div>
      <h2 className="block font-bold text-sm text-white/90">{title}</h2>
      {subtitle ? <h3 className="block text-sm text-white/50 leading-tight">{subtitle}</h3> : null}
    </div>
    <div className="ml-auto flex items-center">{action}</div>
  </div>
);

const SettingsPageComponent: React.FC<{
  endpoint: EndpointType;
  endpoints: EndpointType[];
  microphones: any[];
  settingsPage: string;
}> = ({ endpoint, endpoints, microphones, settingsPage }) => {
  if (!endpoints || !endpoints.length || !microphones || !microphones.length) {
    return null;
  }

  const microphone = microphones.filter((e) => e.selected)[0];
  return (
    <div className="pt-[48px] h-screen flex flex-col operator-surface">
      <div className="flex w-full justify-around px-2 gap-2 mb-4">
        <Section current={settingsPage} icon={faCog} page="general" title="General" />
        <Section current={settingsPage} icon={faBookOpen} page="docs" title="Docs" />
        <Section current={settingsPage} icon={faPlug} page="plugins" title="Plugins" />
        <Section current={settingsPage} icon={faCloud} page="server" title="Server" />
        <Section current={settingsPage} icon={faMagic} page="wizard" title="Wizard" />
        <Section current={settingsPage} icon={faShieldAlt} page="security" title="Security" />
        <Section current={settingsPage} icon={faTools} page="advanced" title="Advanced" />
      </div>
      <div className="flex-1 overflow-y-scroll">
        <div
          className={classNames("settings-content", {
            hidden: settingsPage != "general",
          })}
        >
          <General />
        </div>
        <div
          className={classNames("settings-content", {
            hidden: settingsPage != "docs",
          })}
        >
          <Docs />
        </div>
        <div
          className={classNames("settings-content", {
            hidden: settingsPage != "plugins",
          })}
        >
          <Plugins />
        </div>
        <div
          className={classNames("settings-content", {
            hidden: settingsPage != "server",
          })}
        >
          <Server />
        </div>
        <div
          className={classNames("settings-content", {
            hidden: settingsPage != "wizard",
          })}
        >
          <EnrollmentWizard />
        </div>
        <div
          className={classNames("settings-content", {
            hidden: settingsPage != "security",
          })}
        >
          <Security />
        </div>
        <div
          className={classNames("settings-content", {
            hidden: settingsPage != "advanced",
          })}
        >
          <Advanced />
        </div>
      </div>
    </div>
  );
};

export const SettingsPage = connect((state: any) => ({
  endpoint: state.endpoint,
  endpoints: state.endpoints,
  microphones: state.microphones,
  settingsPage: state.settingsPage,
}))(SettingsPageComponent);
