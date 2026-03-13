import React, { useState } from "react";
import classNames from "classnames";
import { connect } from "react-redux";
import { withRouter } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimes, faMinus } from "@fortawesome/free-solid-svg-icons";
import { faSquare } from "@fortawesome/free-regular-svg-icons";
import logoSymbol from "../../../static/img/symbol_small.png";
import { shell } from "../shell";

const TitleBarComponent: React.FC<{ miniMode: boolean; location: { pathname: string } }> = ({
  miniMode,
  location,
}) => {
  const [maximized, setMaximized] = useState(false);
  const route = location.pathname || "/";

  const minimize = (e: React.MouseEvent) => {
    e.preventDefault();
    shell.setWindowState("minimize", route);
  };

  const maximize = (e: React.MouseEvent) => {
    e.preventDefault();
    if (miniMode) {
      return;
    }

    if (maximized) {
      shell.setWindowState("unmaximize", route);
    } else {
      shell.setWindowState("maximize", route);
    }

    setMaximized((e) => !e);
  };

  const close = (e: React.MouseEvent) => {
    e.preventDefault();
    shell.setWindowState("close", route);
  };

  if (route.endsWith("input") || route.endsWith("minimode")) {
    return null;
  }

  return process.platform != "darwin" ? (
    <div className="operator-titlebar">
      <div className="w-full h-full flex items-center px-2">
        <img src={logoSymbol} className="h-5 w-5 mr-2" alt="Logo" />
        <span className="operator-titlebar__name">Arqon Maestro</span>
        <div className="flex-1 draggable h-full" />
        <div>
          <a
            href="#"
            className="operator-titlebar__button"
            onClick={minimize}
          >
            <FontAwesomeIcon icon={faMinus} />
          </a>
          <a
            href="#"
            className="operator-titlebar__button"
            onClick={maximize}
          >
            <FontAwesomeIcon icon={faSquare} className={classNames({ disabled: miniMode })} />
          </a>
          <a
            href="#"
            className="operator-titlebar__button operator-titlebar__button--danger"
            onClick={close}
          >
            <FontAwesomeIcon icon={faTimes} />
          </a>
        </div>
      </div>
    </div>
  ) : (
    <div className="draggable w-full h-[24px] absolute top-0 left-0" />
  );
};

const mapState = (state: any) => ({ miniMode: state.miniMode });

// @ts-ignore
export const TitleBar = withRouter(connect(mapState)(TitleBarComponent));
