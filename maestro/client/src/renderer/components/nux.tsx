import React from "react";
import classNames from "classnames";
import { connect } from "react-redux";
import { Step } from "../../shared/tutorial";
import { shell } from "../shell";

const NuxComponent: React.FC<{
  miniMode: boolean;
  nuxHintShown: boolean;
  nuxNextButtonEnabled: boolean;
  nuxStep: Step;
}> = ({ miniMode, nuxHintShown, nuxNextButtonEnabled, nuxStep }) => {
  const back = (e: React.MouseEvent) => {
    e.preventDefault();
    shell.send("nuxBack");
  };

  const close = (e: React.MouseEvent) => {
    e.preventDefault();
    shell.send("setNuxCompleted", true);
  };

  const next = (e: React.MouseEvent) => {
    e.preventDefault();
    shell.send("nuxNext");
  };

  const reset = (e: React.MouseEvent) => {
    e.preventDefault();
    shell.send("setNuxCompleted", true);
    shell.send("setNuxCompleted", false);
  };

  const showHint = (e: React.MouseEvent) => {
    e.preventDefault();
    shell.send("showNuxHint");
  };

  if (!nuxStep) {
    return null;
  }

  return (
    <div
      id="nux"
      className={classNames(
        "glass-card p-4 relative overflow-hidden z-20",
        {
          "mt-2 mb-4 mx-2": !miniMode,
          "mb-2": miniMode,
        }
      )}
    >
      {/* Background Glowing Orb */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[250px] h-[250px] bg-cyan-500/10 blur-[60px] rounded-full pointer-events-none z-0" />
      <h2 className="font-bold pb-1">{nuxStep.title}</h2>
      <a className="absolute top-[-4px] right-[4px]" href="#" onClick={close}>
        &times;
      </a>
      <div>
        <div className="text-sm" dangerouslySetInnerHTML={{ __html: nuxStep.body }} />
        {nuxStep.hideAnswer && !nuxHintShown ? (
          <div className="pb-1 pl-1">
            <a
              href="#"
              onClick={showHint}
              className="font-bold text-blue-500 hover:text-blue-700 dark:text-blue-300 dark:hover:text-blue-500 text-sm transition-colors"
            >
              Show hint
            </a>
          </div>
        ) : null}
        {nuxStep.transcript ? (
          <div
            className={classNames("p-[2px] rainbow rounded-md", {
              hidden: nuxStep.hideAnswer && !nuxHintShown,
            })}
          >
            <div className="rounded-md bg-white dark:bg-gray-500 px-3 py-1 shadow">
              {nuxStep.transcript}
            </div>
          </div>
        ) : null}
      </div>
      {!nuxStep.last ? (
        <div className="mt-4 flex w-full relative z-10">
          {!nuxStep.error && nuxStep.index !== undefined && nuxStep.index > 0 ? (
            <button className="secondary-button glow-cyan !py-1 !px-4 !text-[10px] uppercase font-bold tracking-widest" onClick={back}>
              &lsaquo; Back
            </button>
          ) : null}
          {!nuxStep.error ? (
            <button
              onClick={next}
              disabled={!nuxNextButtonEnabled}
              className={classNames("secondary-button glow-cyan !py-1 !px-4 !text-[10px] uppercase font-bold tracking-widest ml-auto", {
                "opacity-50 grayscale pointer-events-none": !nuxNextButtonEnabled,
              })}
            >
              Next &rsaquo;
            </button>
          ) : null}
        </div>
      ) : (
        <div className="mt-4 relative z-10">
          <div className="mb-2">
            <a href="#" className="secondary-button glow-cyan block text-center !py-2 !text-[10px] uppercase font-bold tracking-widest" onClick={reset}>
              More tutorials
            </a>
          </div>
          <div>
            <a href="#" className="secondary-button glow-cyan block text-center !py-2 !text-[10px] uppercase font-bold tracking-widest" onClick={next}>
              Done
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

export const NUX = connect((state: any) => ({
  miniMode: state.miniMode,
  nuxHintShown: state.nuxHintShown,
  nuxNextButtonEnabled: state.nuxNextButtonEnabled,
  nuxStep: state.nuxStep,
}))(NuxComponent);
