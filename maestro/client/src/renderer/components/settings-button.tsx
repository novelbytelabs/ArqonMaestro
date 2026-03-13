import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCog } from "@fortawesome/free-solid-svg-icons";
import { shell } from "../shell";

export const SettingsButton = () => (
  <a
    href="#"
    className="operator-settings-button"
    title="Settings"
    onClick={(e: React.MouseEvent) => {
      e.preventDefault();
      shell.showSettingsWindow();
    }}
  >
    <FontAwesomeIcon icon={faCog} className="settings-icon" />
  </a>
);
