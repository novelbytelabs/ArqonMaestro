import React from "react";
import classNames from "classnames";
import { connect } from "react-redux";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCloud, faGlobe, faLock } from "@fortawesome/free-solid-svg-icons";
import { Endpoint } from "../../../shared/endpoint";
import { shell } from "../../shell";

const EndpointIndicatorComponent: React.FC<{ endpoint: Endpoint }> = ({ endpoint }) => {
  const isLocal = endpoint && endpoint.id === "local";
  const icon = isLocal ? faLock : faCloud;

  return (
    <a
      href="#"
      className={classNames(
        "inline-flex items-center gap-1.5 rounded px-2 py-0.5 transition-all text-[9px] font-mono font-bold uppercase tracking-widest",
        {
          "text-amber-400 bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 hover:border-amber-500/50 drop-shadow-[0_0_8px_rgba(251,191,36,0.2)]": 
            isLocal,
          "text-cyan-400 bg-cyan-500/10 border border-cyan-500/30 hover:bg-cyan-500/20 hover:border-cyan-500/50 drop-shadow-[0_0_8px_rgba(34,211,238,0.2)]": 
            !isLocal
        }
      )}
      onClick={(e: React.MouseEvent) => {
        e.preventDefault();
        shell.send("setSettingsPage", "server");
        shell.send("showSettingsWindow");
      }}
    >
      <div className="indicator-inner flex items-center gap-1.5">
        <FontAwesomeIcon icon={icon || faGlobe} className="text-[10px]" />{" "}
        {isLocal ? "Local" : "Cloud"}
      </div>
    </a>
  );
};

export const EndpointIndicator = connect((state: any) => ({
  endpoint: state.endpoint,
}))(EndpointIndicatorComponent);
