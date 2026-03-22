import React, { useEffect } from "react";
import classNames from "classnames";
import { connect } from "react-redux";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLightbulb } from "@fortawesome/free-regular-svg-icons";
import {
  faCheck,
  faEllipsisH,
  faExclamationTriangle,
  faMinus,
  faTimes,
} from "@fortawesome/free-solid-svg-icons";
import { updateMiniModeWindowHeight } from "../pages/mini-mode";
import { NUX } from "./nux";
import { Spinner } from "./spinner";
import { UpdateNotification } from "./update-notification";
import { isValidAlternative } from "../../shared/alternatives";
import { tutorials } from "../../shared/tutorial";
import { shell } from "../shell";
const reactStringReplace = require("react-string-replace");

const Alternative: React.FC<{
  alternative: {
    description: string;
  };
  index: number;
  highlighted: boolean;
  executedSuccess: boolean;
  staleOrFailed: boolean;
  miniMode: boolean;
  miniModeBottomUp: boolean;
  miniModeReversed: boolean;
  partial: boolean;
  spinner: boolean;
  truncate: number;
}> = ({
  alternative,
  index,
  highlighted,
  executedSuccess,
  staleOrFailed,
  miniMode,
  miniModeBottomUp,
  miniModeReversed,
  partial,
  spinner,
  truncate,
}) => {
  const truncateText = (text: string, size: number) => {
    if (text.length <= size) {
      return text;
    }

    size -= "...".length;
    size = Math.floor(size / 2);
    return text.substr(0, size) + "..." + text.substr(text.length - size);
  };

  const onClick = () => {
    shell.send("sendTextRequest", {
      text: `use ${index}`,
      includeAlternatives: false,
    });
  };

  if (!alternative || !alternative.description) {
    return null;
  }

  const valid = isValidAlternative(alternative);
  const usable = !partial && valid && !highlighted && !executedSuccess && !staleOrFailed;
  const unusable =
    (partial || !valid) && !highlighted && !executedSuccess && !staleOrFailed;

  let circle = <>{index}</>;
  if (spinner) {
    circle = <Spinner hidden={false} />;
  } else if (partial) {
    circle = <FontAwesomeIcon icon={faEllipsisH} />;
  } else if (executedSuccess && !partial) {
    circle = <FontAwesomeIcon icon={faCheck} />;
  } else if (staleOrFailed && !partial) {
    circle = <FontAwesomeIcon icon={faMinus} />;
  } else if (highlighted && !partial) {
    circle = <FontAwesomeIcon icon={faTimes} />;
  } else if (!valid) {
    circle = <FontAwesomeIcon icon={faTimes} />;
  }

  // replace code markup with appropriate HTML
  let newline = false;
  let wrappedDescription = alternative.description.replace(/<code>/g, `</span><code>`);
  wrappedDescription = wrappedDescription.replace(/<\/code>/g, `</code><span>`);
  wrappedDescription = `<span>${wrappedDescription}</span>`;
  let description = reactStringReplace(
    wrappedDescription,
    /<code>([\s\S]*?)<\/code>/g,
    (m: string, i: any) => {
      if (m.includes("\n") || m.length > 25 || newline) {
        newline = true;
        return (
          <div
            className={classNames("rounded px-2 py-1 mt-1 border", {
              "bg-white/10 border-white/10": usable,
              "bg-white/5 border-white/5": unusable,
              "bg-cyan-500/30 border-cyan-400/50": highlighted,
              "bg-gray-700/40 border-gray-500/40": staleOrFailed,
              "bg-emerald-500/25 border-emerald-400/50": executedSuccess,
            })}
            key={i}
          >
            <pre className="whitespace-pre-wrap" style={{ wordBreak: "break-word" }}>
              {m}
            </pre>
          </div>
        );
      }

      if (truncate > 0) {
        m = truncateText(m, truncate);
      }

      return (
        <pre
          className={classNames("inline rounded px-1 py-0.5 whitespace-pre-wrap border", {
            "bg-white/10 border-white/10": usable,
            "bg-white/5 border-white/5": unusable,
            "bg-cyan-500/30 border-cyan-400/50": highlighted,
            "bg-gray-700/40 border-gray-500/40": staleOrFailed,
            "bg-emerald-500/25 border-emerald-400/50": executedSuccess,
          })}
          key={i}
        >
          {m}
        </pre>
      );
    }
  );

  description = reactStringReplace(description, /<span>([\s\S]*?)<\/span>/g, (m: string) => {
    return <span key={m}>{m}</span>;
  });

  return (
    <a
      onClick={onClick}
      className={classNames(
        "alternative-row block flex items-center text-white py-2 px-3 rounded-lg transition-all duration-300 group relative overflow-hidden",
        {
          "glass-card border-white/10 hover:border-cyan-500/30 hover:bg-white/5 cursor-pointer": usable,
          "bg-white/5 border border-white/5 opacity-40 cursor-default": unusable,
          "bg-cyan-500/20 border border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.4)] cursor-default": highlighted,
          "bg-emerald-500/20 border border-emerald-400 shadow-[0_0_18px_rgba(16,185,129,0.35)] cursor-default":
            executedSuccess,
          "bg-gray-700/25 border border-gray-500/40 opacity-80 cursor-default": staleOrFailed,
          "mb-1.5 mx-1": !miniMode,
          "mt-1": index > 1 || (miniMode && miniModeBottomUp && miniModeReversed),
        }
      )}
    >
      {/* Background Glow on Hover */}
      <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 via-cyan-500/5 to-cyan-500/0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      <div className="mr-3 flex items-center justify-center relative z-10">
        <div
          className={classNames(
            "rounded-md font-mono font-bold h-[24px] w-[24px] flex justify-center items-center transition-all duration-300",
            {
              "bg-black/40 border border-cyan-500/30 text-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.2)] group-hover:border-cyan-400 group-hover:shadow-[0_0_12px_rgba(34,211,238,0.4)]": usable,
              "bg-gray-800/40 border border-white/10 text-gray-400": unusable,
              "bg-cyan-500 border border-cyan-300 text-white shadow-[0_0_10px_rgba(255,255,255,0.4)]": highlighted,
              "bg-emerald-500 border border-emerald-300 text-white shadow-[0_0_10px_rgba(52,211,153,0.45)]":
                executedSuccess,
              "bg-gray-700 border border-gray-400 text-gray-200": staleOrFailed,
            }
          )}
        >
          <span className="text-[10px]">{circle}</span>
        </div>
      </div>
      <div
        className="font-mono font-medium tracking-tight relative z-10"
        style={{
          fontSize: "0.85rem",
          lineHeight: "1.2rem",
          color: staleOrFailed
            ? "rgba(209,213,219,0.88)"
            : highlighted || executedSuccess
              ? "#fff"
              : "rgba(255,255,255,0.9)",
        }}
      >
        {description}
      </div>
    </a>
  );
};

const TutorialSelection = () => {
  const click = (e: React.MouseEvent, name: string) => {
    e.preventDefault();
    shell.send("loadTutorial", { name });
  };

  const close = (e: React.MouseEvent) => {
    e.preventDefault();
    shell.send("setNuxCompleted", true);
  };

  return (
    <div id="nux" className="border rounded shadow mx-2 p-3 relative dark:border-neutral-500">
      <h2 className="font-bold pb-1">Tutorials</h2>
      <a className="absolute top-[-4px] right-[4px]" href="#" onClick={close}>
        &times;
      </a>
      <div className="grid grid-cols-2">
        {tutorials.map((tutorial) => (
          <div>
            <a
              href="#"
              className="text-cyan-400 hover:text-cyan-300 font-mono text-xs transition-colors"
              onClick={(e) => click(e, tutorial.tutorial)}
              key={tutorial.tutorial}
            >
              {tutorial.title.toUpperCase()}
            </a>
          </div>
        ))}
      </div>
    </div>
  );
};

const AlternativesListComponent: React.FC<{
  alternatives: any;
  alternativesSpinner: number[];
  backendIssue: string;
  highlighted: number[];
  executedSuccess: number[];
  staleOrFailed: number[];
  loggedIn: boolean;
  miniMode: boolean;
  miniModeBottomUp: boolean;
  miniModePage: boolean;
  miniModeReversed: boolean;
  nuxCompleted: boolean;
  nuxTutorial: string;
  partial: boolean;
  scriptError: string;
  suggestion: string;
  updateNotification: string;
}> = ({
  alternatives,
  alternativesSpinner,
  backendIssue,
  highlighted,
  executedSuccess,
  staleOrFailed,
  loggedIn,
  miniMode,
  miniModeBottomUp,
  miniModePage,
  miniModeReversed,
  nuxCompleted,
  nuxTutorial,
  partial,
  scriptError,
  suggestion,
  updateNotification,
}) => {
  // update the minimode window height after each render
  if (miniModePage) {
    useEffect(() => {
      setTimeout(() => {
        window.requestAnimationFrame(() => {
          updateMiniModeWindowHeight();
          if (miniMode && miniModeBottomUp && miniModeReversed) {
            const container = document.getElementById("mini-mode-page");
            if (container) {
              container.scrollTop = container.scrollHeight;
            }
          }
        });
      }, 10);
    }, [alternatives, suggestion]);
  }

  const examples = alternatives
    .filter((e: any) => e.example)
    .map((e: any, i: number) => (
      <div
        key={i}
        className="glass-card text-white/90 m-1 px-3 py-2.5 transition-all duration-300 hover:border-cyan-500/30 font-mono uppercase tracking-tight"
        style={{
          fontSize: "0.8rem",
          lineHeight: "1.2rem",
        }}
      >
        {e.description}
      </div>
    ));

  const valid = alternatives
    .filter((e: any) => !e.example && isValidAlternative(e))
    .map((e: any, i: number) => (
      <Alternative
        key={i}
        alternative={e}
        index={i + 1}
        highlighted={highlighted.includes(i)}
        executedSuccess={executedSuccess.includes(i)}
        staleOrFailed={staleOrFailed.includes(i)}
        miniMode={miniMode}
        miniModeBottomUp={miniModeBottomUp}
        miniModeReversed={miniModeReversed}
        partial={partial}
        spinner={alternativesSpinner.includes(i)}
        truncate={0}
      />
    ));

  const invalid = alternatives
    .filter((e: any) => !e.example && !isValidAlternative(e))
    .map((e: any, i: number) => {
      return (
        <Alternative
          key={i + valid.length}
          alternative={e}
          index={i + valid.length + 1}
          highlighted={false}
          executedSuccess={false}
          staleOrFailed={false}
          miniMode={miniMode}
          miniModeBottomUp={miniModeBottomUp}
          miniModeReversed={miniModeReversed}
          partial={partial}
          spinner={false}
          truncate={0}
        />
      );
    });

  const examplesSection =
    examples.length > 0 ? (
      <>
        <h3 className="font-light text-sm mx-2 mt-1.5 mb-2 pb-1 border-b dark:border-neutral-500">
          Try saying:
        </h3>
        {examples}
      </>
    ) : null;

  const validSection = valid.length > 0 ? valid : null;
  const invalidSection = invalid.length > 0 ? invalid : null;
  const syntaxError = suggestion.toLowerCase().includes("syntax");
  const suggestionSection = (
    <div
      id="suggestion"
      className={classNames("glass-card p-3 text-sm", {
        "mt-2 mb-4 mx-2": !miniMode,
        "mb-2": miniMode,
      })}
    >
      <div className="flex items-center">
        <FontAwesomeIcon
          icon={syntaxError || scriptError ? faExclamationTriangle : faLightbulb}
          className="block"
        />
        <h4 className="font-bold pl-2">
          {syntaxError
            ? "Warning: Syntax Error"
            : scriptError
            ? "Custom Command Error"
            : "Did you know?"}
        </h4>
      </div>
      <div
        className={classNames("pt-1", { scriptError: "break-all" })}
        dangerouslySetInnerHTML={{ __html: scriptError || suggestion }}
      />
    </div>
  );

  const backendIssueSection = backendIssue ? (
    <div
      id="backend-issue"
      className={classNames("rounded-md p-3 text-sm bg-white dark:bg-slate-800", {
        "border shadow mt-2 mb-4 mx-2": !miniMode,
        "mb-2": miniMode,
        "border shadow": miniMode && process.arch != "darwin",
      })}
    >
      <div className="flex items-center">
        <FontAwesomeIcon icon={faExclamationTriangle} className="block" />
        <h4 className="font-bold pl-2">Voice Backend Issue</h4>
      </div>
      <div className="pt-1 break-words">{backendIssue}</div>
    </div>
  ) : null;

  // these spacer elements exist to avoid the rounded window border on mac, which we can't change
  const spacer =
    alternatives.length > 0 ||
    suggestion ||
    scriptError ||
    backendIssue ||
    nuxTutorial ||
    updateNotification ? (
      <div className="spacer w-full h-[5px]" />
    ) : null;

  return (
    <div
      className={classNames("flex overflow-y-auto", {
        "flex-1": !miniMode,
        "flex-col": !miniMode || !miniModeBottomUp || !miniModeReversed,
        "flex-col-reverse": miniMode && miniModeBottomUp && miniModeReversed,
      })}
    >
      {spacer}
      <UpdateNotification />
      {backendIssueSection}
      {nuxCompleted && (suggestion || scriptError) ? suggestionSection : null}
      {!loggedIn || nuxCompleted ? null : !nuxTutorial ? <TutorialSelection /> : <NUX />}
      {examplesSection}
      {validSection}
      {invalidSection}
      {spacer}
    </div>
  );
};

export const AlternativesList = connect((state: any) => ({
  alternatives: state.alternatives,
  alternativesSpinner: state.alternativesSpinner,
  backendIssue: state.backendIssue,
  highlighted: state.highlighted,
  executedSuccess: state.executedSuccess || [],
  staleOrFailed: state.staleOrFailed || [],
  loggedIn: state.loggedIn,
  miniMode: state.miniMode,
  miniModeBottomUp: state.miniModeBottomUp,
  miniModeReversed: state.miniModeReversed,
  nuxCompleted: state.nuxCompleted,
  nuxTutorial: state.nuxTutorial,
  partial: state.partial,
  scriptError: state.scriptError,
  suggestion: state.suggestion,
  updateNotification: state.updateNotification,
}))(AlternativesListComponent);
