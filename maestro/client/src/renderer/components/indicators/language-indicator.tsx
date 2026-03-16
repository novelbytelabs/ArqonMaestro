import React from "react";
import { connect } from "react-redux";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFileAlt, faGlobe } from "@fortawesome/free-solid-svg-icons";
import { languages } from "../../../shared/languages";
import { core } from "../../../gen/core";
import { shell } from "../../shell";

const LanguageIndicatorComponent: React.FC<{
  language: core.Language;
  sourceAvailable: boolean;
}> = ({ language, sourceAvailable }) => {
  let icon = <FontAwesomeIcon icon={faGlobe} />;
  let name = "Text";
  if (languages[language]) {
    name = languages[language]!.name;
    icon = languages[language]!.icon ? (
      <img
        className={`h-4 w-4 ${language} inline-block`}
        src={languages[language]!.icon}
        alt={languages[language]!.name}
      />
    ) : (
      <FontAwesomeIcon icon={faFileAlt} />
    );
  } else if (sourceAvailable) {
    icon = <FontAwesomeIcon icon={faFileAlt} />;
  }

  return (
    <a
      className="inline-flex items-center gap-1.5 text-cyan-400 bg-cyan-500/10 border border-cyan-500/30 rounded px-2 py-0.5 mr-1 transition-all hover:bg-cyan-500/20 hover:border-cyan-500/50 text-[9px] font-mono font-bold uppercase tracking-widest drop-shadow-[0_0_8px_rgba(34,211,238,0.2)]"
      href="#"
      onClick={(e: React.MouseEvent) => {
        e.preventDefault();
        shell.send("showLanguageSwitcher");
      }}
    >
      <span className="opacity-80 scale-90">{icon}</span> {name}
    </a>
  );
};

export const LanguageIndicator = connect((state: any) => ({
  language: state.language,
  sourceAvailable: state.sourceAvailable,
}))(LanguageIndicatorComponent);
