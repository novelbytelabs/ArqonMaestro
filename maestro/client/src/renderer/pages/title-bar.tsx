import React, { useMemo, useState } from "react";
import classNames from "classnames";
import { connect } from "react-redux";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimes, faMinus } from "@fortawesome/free-solid-svg-icons";
import { faSquare } from "@fortawesome/free-regular-svg-icons";
import { shell } from "../shell";

const TitleBarComponent: React.FC<{
  miniMode: boolean;
  listening: boolean;
  securityIdentityDisplayName: string;
  securityIdentityState: string;
  securityLastLifecyclePhase: string;
}> = ({
  miniMode,
  listening,
  securityIdentityDisplayName,
  securityIdentityState,
  securityLastLifecyclePhase,
}) => {
  const [maximized, setMaximized] = useState(false);
  const titleText = useMemo(() => {
    const activeInteraction = listening && securityLastLifecyclePhase === "activated";
    if (!activeInteraction) {
      return "Arqon Maestro";
    }
    if (securityIdentityState === "verified_primary" || securityIdentityState === "verified_secondary") {
      return securityIdentityDisplayName || "Unknown";
    }
    return "Unknown";
  }, [listening, securityIdentityDisplayName, securityIdentityState, securityLastLifecyclePhase]);

  const minimize = (e: React.MouseEvent) => {
    e.preventDefault();
    shell.send("setWindowState", { state: "minimize", url: window.location.href });
  };

  const maximize = (e: React.MouseEvent) => {
    e.preventDefault();
    if (miniMode) {
      return;
    }

    if (maximized) {
      shell.send("setWindowState", { state: "unmaximize", url: window.location.href });
    } else {
      shell.send("setWindowState", { state: "maximize", url: window.location.href });
    }

    setMaximized((e) => !e);
  };

  const close = (e: React.MouseEvent) => {
    e.preventDefault();
    shell.send("setWindowState", { state: "close", url: window.location.href });
  };

  if (window.location.href.endsWith("input") || window.location.href.endsWith("minimode")) {
    return null;
  }

  return process.platform != "darwin" ? (
    <div className="w-full h-[32px] absolute z-10 top-0 left-0 bg-white dark:bg-neutral-900 border-b border-gray-200 dark:border-neutral-800">
      <div className="w-full h-full flex items-center px-2">
        <span className="text-xs font-semibold text-gray-500 dark:text-neutral-400">{titleText}</span>
        <div className="flex-1 draggable h-full" />
        <div>
          <a
            href="#"
            className="h-[24px] w-[32px] inline-block text-center hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors cursor-pointer outline-none"
            onClick={minimize}
          >
            <FontAwesomeIcon icon={faMinus} />
          </a>
          <a
            href="#"
            className="h-[24px] w-[32px] inline-block text-center hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors cursor-pointer outline-none"
            onClick={maximize}
          >
            <FontAwesomeIcon icon={faSquare} className={classNames({ disabled: miniMode })} />
          </a>
          <a
            href="#"
            className="h-[24px] w-[32px] inline-block text-center hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors cursor-pointer outline-none"
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

export const TitleBar = connect((state: any) => ({
  miniMode: state.miniMode,
  listening: state.listening,
  securityIdentityDisplayName: state.securityIdentityDisplayName || "",
  securityIdentityState: state.securityIdentityState || "unknown",
  securityLastLifecyclePhase: state.securityLastLifecyclePhase || "heard",
}))(TitleBarComponent);
