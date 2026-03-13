import React from "react";
import classNames from "classnames";
import { connect } from "react-redux";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faVolumeDown, faVolumeUp } from "@fortawesome/free-solid-svg-icons";

const VolumeIndicatorComponent: React.FC<{
  speaking: boolean;
  speakingVolume: number;
}> = ({ speaking, speakingVolume }) => {
  const low = 200;
  const high = 10000;
  const direction = speakingVolume > low ? "High" : "Low";
  return (
    <div
      className={classNames(
        "operator-pill",
        {
          hidden:
            !speaking ||
            !speakingVolume ||
            speakingVolume < 1 ||
            (speakingVolume > low && speakingVolume < high),
        }
      )}
      title={`${direction} Volume`}
    >
      <FontAwesomeIcon icon={speakingVolume > low ? faVolumeUp : faVolumeDown} /> {direction} Volume
    </div>
  );
};

export const VolumeIndicator = connect((state: any) => ({
  speaking: state.speaking,
  speakingVolume: state.speakingVolume,
}))(VolumeIndicatorComponent);
