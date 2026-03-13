import React from "react";
import { connect } from "react-redux";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCloud, faLock } from "@fortawesome/free-solid-svg-icons";
import { Endpoint } from "../../../shared/endpoint";
import { shell } from "../../shell";

const EndpointIndicatorComponent: React.FC<{ endpoint: Endpoint }> = ({ endpoint }) => (
  <a
    href="#"
    className="operator-pill operator-pill--interactive"
    onClick={(e: React.MouseEvent) => {
      e.preventDefault();
      shell.setSettingsPage("server");
      shell.showSettingsWindow();
    }}
  >
    <div className="indicator-inner">
      <FontAwesomeIcon icon={endpoint && endpoint.id == "local" ? faLock : faCloud} />{" "}
      {endpoint && endpoint.id == "local" ? "Local" : "Cloud"}
    </div>
  </a>
);

export const EndpointIndicator = connect((state: any) => ({
  endpoint: state.endpoint,
}))(EndpointIndicatorComponent);
