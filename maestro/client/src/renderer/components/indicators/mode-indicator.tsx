import React from "react";
import classNames from "classnames";
import { connect } from "react-redux";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGlobe, faICursor } from "@fortawesome/free-solid-svg-icons";
import { shell } from "../../shell";

const ModeIndicatorComponent: React.FC<{ dictateMode: boolean }> = ({ dictateMode }) => {
  if (dictateMode === undefined) return null;
  return (
    <a
      className={classNames(
        "inline-flex items-center gap-1.5 text-cyan-400 bg-cyan-500/10 border border-cyan-500/30 rounded px-2 py-0.5 mr-1 transition-all hover:bg-cyan-500/20 hover:border-cyan-500/50 text-[9px] font-mono font-bold uppercase tracking-widest drop-shadow-[0_0_8px_rgba(34,211,238,0.2)]",
        { hidden: !dictateMode }
      )}
      href="#"
      onClick={(e: React.MouseEvent) => {
        e.preventDefault();
        shell.send("toggleDictateMode");
      }}
    >
      <FontAwesomeIcon icon={faICursor || faGlobe} className="text-[10px]" /> Dictate
    </a>
  );
};

export const ModeIndicator = connect((state: any) => ({
  dictateMode: state.dictateMode,
}))(ModeIndicatorComponent);
