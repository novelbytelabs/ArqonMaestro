import React, { useState } from "react";
import classNames from "classnames";
import { Switch } from "@headlessui/react";

export const Toggle: React.FC<{
  onChange: (value: boolean) => void;
  value: boolean;
}> = ({ onChange, value }) => (
  <Switch
    checked={value}
    onChange={onChange}
    className={classNames(
      "relative inline-flex flex-shrink-0 h-[22px] w-[40px] border transition-all duration-300 rounded-full cursor-pointer focus:outline-none",
      {
        "bg-cyan-500/20 border-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.3)] animate-pulse-cyan": value,
        "bg-black/40 border-white/20": !value,
      }
    )}
  >
    <span
      aria-hidden="true"
      className={classNames(
        "pointer-events-none inline-block h-[16px] w-[16px] rounded-full bg-white shadow-lg transform transition-transform duration-200 ease-in-out mt-[2px] ml-[2px]",
        {
          "translate-x-[18px]": value,
          "translate-x-0": !value,
        }
      )}
    />
  </Switch>
);
