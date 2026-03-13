import React from "react";
import classNames from "classnames";
import { connect } from "react-redux";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faWifi } from "@fortawesome/free-solid-svg-icons";
import { Endpoint } from "../../../shared/endpoint";

const ConnectionIndicatorComponent: React.FC<{
  endpoint: Endpoint;
  latency: number;
}> = ({ endpoint, latency }) => (
  <div
    className={classNames(
      "operator-pill",
      {
        hidden: !endpoint || endpoint.id == "local" || latency < 500,
      }
    )}
    title="Slow Connection"
  >
    <FontAwesomeIcon icon={faWifi} /> Slow
  </div>
);

export const ConnectionIndicator = connect((state: any) => ({
  endpoint: state.endpoint,
  latency: state.latency,
}))(ConnectionIndicatorComponent);
