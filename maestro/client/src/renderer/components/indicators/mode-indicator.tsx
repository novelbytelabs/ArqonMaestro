import React from "react";
import classNames from "classnames";
import { connect } from "react-redux";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faICursor } from "@fortawesome/free-solid-svg-icons";
import { shell } from "../../shell";

const ModeIndicatorComponent: React.FC<{ dictateMode: boolean }> = ({ dictateMode }) => (
  <a
    className={classNames(
      "operator-pill operator-pill--interactive",
      { hidden: !dictateMode }
    )}
    href="#"
    onClick={(e: React.MouseEvent) => {
      e.preventDefault();
      shell.toggleDictateMode();
    }}
  >
    <FontAwesomeIcon icon={faICursor} /> Dictate
  </a>
);

export const ModeIndicator = connect((state: any) => ({
  dictateMode: state.dictateMode,
}))(ModeIndicatorComponent);
