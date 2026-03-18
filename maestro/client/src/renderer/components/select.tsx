import React, { Fragment, useState } from "react";
import classNames from "classnames";
import { Listbox, Transition } from "@headlessui/react";
import { CheckIcon, SelectorIcon } from "@heroicons/react/solid";

export const Select: React.FC<{
  items: string[];
  onChange: (item: string) => void;
  value: string;
}> = ({ items, onChange, value }) => (
  <div className="w-full">
    <Listbox value={value} onChange={onChange}>
      <div className="relative">
        <Listbox.Button className="relative w-full py-1.5 pl-3 pr-10 text-left glass-card cursor-default focus:outline-none border-white/20 hover:border-white/40 group transition-all">
          <span className="block truncate text-white/90 text-sm font-mono">{value}</span>
          <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
            <SelectorIcon className="w-5 h-5 text-cyan-400 group-hover:text-cyan-300 transition-colors" aria-hidden="true" />
          </span>
        </Listbox.Button>
        <Transition
          as={Fragment}
          leave="transition ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <Listbox.Options className="absolute w-full py-1 mt-1 overflow-auto glass-card border-cyan-400/30 max-h-60 ring-1 ring-black ring-opacity-5 focus:outline-none text-sm z-50 shadow-2xl">
            {items.map((item, i) => (
              <Listbox.Option
                key={i}
                value={item}
                className={({ active }) =>
                  classNames("cursor-pointer select-none relative py-2.5 pl-8 pr-4 transition-colors", {
                    "text-white/70": !active,
                    "text-white bg-cyan-500/30": active,
                  })
                }
              >
                {({ selected, active }) => (
                  <>
                    <span
                      className={classNames("block truncate font-mono", {
                        "font-bold text-cyan-400": selected,
                        "font-normal": !selected,
                      })}
                    >
                      {item}
                    </span>
                    {selected ? (
                      <span className="absolute inset-y-0 left-0 flex items-center pl-2 text-cyan-400">
                        <CheckIcon className="w-5 h-5" aria-hidden="true" />
                      </span>
                    ) : null}
                  </>
                )}
              </Listbox.Option>
            ))}
          </Listbox.Options>
        </Transition>
      </div>
    </Listbox>
  </div>
);
