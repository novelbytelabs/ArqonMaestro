import React, { useEffect } from "react";
import classNames from "classnames";
import { connect } from "react-redux";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLightbulb } from "@fortawesome/free-regular-svg-icons";
import {
  faCheck,
  faEllipsisH,
  faExclamationTriangle,
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
    shell.sendTextRequest(`use ${index}`, false);
  };

  if (!alternative || !alternative.description) {
    return null;
  }

  const valid = isValidAlternative(alternative);
  const usable = !partial && valid && !highlighted;
  const unusable = (partial || !valid) && !highlighted;

  let circle = <>{index}</>;
  if (spinner) {
    circle = <Spinner hidden={false} />;
  } else if (partial) {
    circle = <FontAwesomeIcon icon={faEllipsisH} />;
  } else if (highlighted && !partial) {
    circle = <FontAwesomeIcon icon={faCheck} />;
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
            className={classNames("rounded px-2 py-1 mt-1", {
              "operator-code-chip": true,
              "operator-code-chip--active": usable,
              "operator-code-chip--muted": unusable,
              "operator-code-chip--highlighted": highlighted,
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
          className={classNames("inline rounded px-1 py-0.5 whitespace-pre-wrap", {
            "operator-inline-code": true,
            "operator-inline-code--active": usable,
            "operator-inline-code--muted": unusable,
            "operator-inline-code--highlighted": highlighted,
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
        "alternative-row operator-alternative group",
        {
          "operator-alternative--usable cursor-pointer": usable,
          "operator-alternative--unusable cursor-default": unusable,
          "operator-alternative--highlighted cursor-default": highlighted,
          "mb-2 mx-1": !miniMode,
          "mt-1": index > 1 || (miniMode && miniModeBottomUp && miniModeReversed),
        }
      )}
    >
      <div className="operator-alternative__badge-shell">
        <div
          className={classNames(
            "operator-alternative__badge",
            {
              "operator-alternative__badge--usable": usable,
              "operator-alternative__badge--unusable": unusable,
              "operator-alternative__badge--highlighted": highlighted,
            }
          )}
        >
          {circle}
        </div>
      </div>
      <div className="operator-alternative__text">
        {description}
      </div>
    </a>
  );
};

const TutorialSelection = () => {
  const click = (e: React.MouseEvent, name: string) => {
    e.preventDefault();
    shell.loadTutorial(name);
  };

  const close = (e: React.MouseEvent) => {
    e.preventDefault();
    shell.setNuxCompleted(true);
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
              className="text-blue-500 hover:text-blue-700 dark:text-blue-300 dark:hover:text-blue-500 text-sm transition-colors"
              onClick={(e) => click(e, tutorial.tutorial)}
              key={tutorial.tutorial}
            >
              {tutorial.title}
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
        className="operator-suggestion-example"
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
          Suggested Commands
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
      className={classNames("operator-card operator-card--notice", {
        "mt-2 mb-4 mx-2": !miniMode,
        "mb-2": miniMode,
        "border shadow": miniMode && process.arch != "darwin",
      })}
    >
      <div className="operator-card__headline">
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
        className={classNames("pt-2 text-sm leading-6 text-slate-200", { scriptError: "break-all" })}
        dangerouslySetInnerHTML={{ __html: scriptError || suggestion }}
      />
    </div>
  );

  const backendIssueSection = backendIssue ? (
    <div
      id="backend-issue"
      className={classNames("operator-card operator-card--warning", {
        "mt-2 mb-4 mx-2": !miniMode,
        "mb-2": miniMode,
        "border shadow": miniMode && process.arch != "darwin",
      })}
    >
      <div className="operator-card__headline">
        <FontAwesomeIcon icon={faExclamationTriangle} className="block" />
        <h4 className="font-bold pl-2">Voice Backend Issue</h4>
      </div>
      <div className="pt-2 break-words text-sm leading-6 text-slate-200">{backendIssue}</div>
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
      className={classNames("flex overflow-y-auto operator-list", {
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
