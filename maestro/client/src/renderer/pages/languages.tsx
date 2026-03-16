import React from "react";
import classNames from "classnames";
import { connect } from "react-redux";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck, faFileAlt, faSearch } from "@fortawesome/free-solid-svg-icons";
import { core } from "../../gen/core";
import { LanguageConfiguration, languagesList } from "../../shared/languages";
import { shell } from "../shell";

const LanguagesPageComponent: React.FC<{
  languageSwitcherLanguage: core.Language;
  languageSwitcherName: string;
}> = ({ languageSwitcherLanguage, languageSwitcherName }) => (
  <div className="h-screen w-full operator-surface flex flex-col pt-4">
    <div className="px-4 mb-4">
      <h2 className="text-[10px] uppercase font-bold tracking-widest text-cyan-400/80">
        Language Selection
      </h2>
    </div>
    <div className="flex-1 overflow-y-auto pb-4">
      {languagesList.map((config) => {
          const language = config.id;
          const name = config.name;
          const active = languageSwitcherName === name;

          let icon = (
            <div className="text-white/40 group-hover:text-white/70 transition-colors">
              <FontAwesomeIcon icon={faFileAlt} className="text-sm" />
            </div>
          );

          if (name === "Auto-Detect") {
            icon = (
              <div className="text-white/40 group-hover:text-white/70 transition-colors">
                <FontAwesomeIcon icon={faSearch} className="text-sm scale-90" />
              </div>
            );
          } else if (config.icon) {
            icon = (
              <img
                className="w-5 h-5 opacity-80 group-hover:opacity-100 transition-opacity"
                src={config.icon}
                alt={name}
              />
            );
          }

          return (
            <a
              key={name}
              href="#"
              className={classNames(
                "block w-full px-4 py-3 transition-all duration-300 border-b border-white/5 group",
                {
                  "bg-cyan-500/10": active,
                  "hover:bg-white/5": !active,
                }
              )}
              onClick={(e) => {
                e.preventDefault();
                shell.send("setLanguage", { language, name });
                setTimeout(() => {
                  shell.send("closeLanguages");
                }, 100);
              }}
            >
              <div className="flex items-center">
                <div
                  className={classNames(
                    "w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 border",
                    {
                      "bg-cyan-500/20 border-cyan-400/50 shadow-[0_0_10px_rgba(34,211,238,0.2)]": active,
                      "bg-black/20 border-white/5 group-hover:border-white/20": !active,
                    }
                  )}
                >
                  {active ? (
                    <FontAwesomeIcon icon={faCheck} className="text-cyan-400 text-xs" />
                  ) : (
                    icon
                  )}
                </div>
                <div
                  className={classNames("pl-3 text-sm font-medium tracking-wide transition-colors", {
                    "text-cyan-400": active,
                    "text-white/70 group-hover:text-white": !active,
                  })}
                >
                  {name}
                </div>
              </div>
            </a>
          );
        })}
    </div>
  </div>
);

export const LanguagesPage = connect((state: any) => ({
  languageSwitcherLanguage: state.languageSwitcherLanguage,
  languageSwitcherName: state.languageSwitcherName,
}))(LanguagesPageComponent);
