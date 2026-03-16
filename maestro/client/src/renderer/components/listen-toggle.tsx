import React, { useRef } from "react";
import classNames from "classnames";
import { connect } from "react-redux";
import { Spinner } from "./spinner";
import { shell } from "../shell";

const ListenToggleComponent: React.FC<{
  darkTheme: boolean;
  listening: boolean;
  localLoading: boolean;
  volume: number;
}> = ({ darkTheme, listening, localLoading, volume }) => {
  const toggle = (e: React.MouseEvent) => {
    e.preventDefault();
    shell.send("toggleChunkManager", !listening);
  };

  const color = 210 - 70 * (listening ? volume : 0);
  const borderPadding = 6;
  const width = 52;
  const height = 24;
  const offset = -4;
  return (
    <>
      <div
        className={classNames("ml-2", {
          hidden: !localLoading,
        })}
      >
        <Spinner hidden={!localLoading} />
      </div>
      <div
        onClick={toggle}
        className={classNames("cursor-pointer mr-[5px] relative group transition-all duration-300", {
          listening,
          hidden: localLoading,
        })}
        style={{
          width: width + "px",
          height: height + "px",
        }}
      >
        <div
          className={classNames("w-full h-full border-2 transition-all duration-300 backdrop-blur-sm", {
            "border-cyan-400/80 shadow-[0_0_12px_rgba(34,211,238,0.5)] bg-cyan-500/10": listening,
            "border-white/20 bg-black/40": !listening,
          })}
          style={{
            borderRadius: height / 2 + "px",
          }}
        >
          {/* Slider Knob */}
          <div
            className="absolute transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
            style={{
              background: "white",
              zIndex: 4,
              top: "3px",
              left: listening ? width - (height - 6) - 3 + "px" : "3px",
              width: height - 10 + "px",
              height: height - 10 + "px",
              borderRadius: "50%",
              boxShadow: listening ? "0 0 15px rgba(255, 255, 255, 0.9)" : "0 2px 4px rgba(0,0,0,0.5)",
            }}
          />
        </div>
      </div>
    </>
  );
};

export const ListenToggle = connect((state: any) => ({
  darkTheme: state.darkTheme,
  listening: state.listening,
  localLoading: state.localLoading,
  volume: state.volume,
}))(ListenToggleComponent);
