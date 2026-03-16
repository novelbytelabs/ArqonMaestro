import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCog } from "@fortawesome/free-solid-svg-icons";
import { shell } from "../shell";

export const SettingsButton = () => (
  <a
    href="#"
    className="inline-flex items-center justify-center text-cyan-400 bg-cyan-500/10 border border-cyan-500/30 h-[26px] w-[26px] rounded transition-all hover:bg-cyan-500/20 hover:border-cyan-500/50 drop-shadow-[0_0_8px_rgba(34,211,238,0.2)]"
    title="Settings"
    onClick={(e: React.MouseEvent) => {
      e.preventDefault();
      shell.send("showSettingsWindow");
    }}
  >
    <FontAwesomeIcon icon={faCog} className="text-[14px]" />
  </a>
);
