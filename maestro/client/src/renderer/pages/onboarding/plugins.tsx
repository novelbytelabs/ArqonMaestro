import React, { useState } from "react";
import classNames from "classnames";
import { Link } from "react-router-dom";
import { plugins } from "../../../shared/plugins";
import onboardingHub from "../../../../static/img/maestro-integration-hub.png";

export const PluginsPage = () => {
  const [disabled, setDisabled] = useState(true);

  const onClick = (e: React.MouseEvent) => {
    setDisabled(false);
  };

  return (
    <div className="h-screen w-full operator-surface overflow-hidden pt-12 flex flex-col items-center relative">
      {/* Central Background Glowing Orb */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-cyan-500/10 blur-[100px] rounded-full pointer-events-none z-0" />
      
      <div className="welcome-container w-full h-full px-4 flex flex-col items-center justify-start relative gap-4 max-w-[280px] z-10">
        <div className="welcome-header flex flex-col items-center gap-1 z-10 w-full mb-2">
          <span className="text-cyan-400 font-mono text-[9px] tracking-widest uppercase font-bold opacity-80">
            System Integration
          </span>
          <div className="bg-cyan-500/10 border border-cyan-500/30 px-3 py-0.5 rounded-full">
            <span className="text-cyan-400 text-[9px] uppercase font-bold tracking-widest">
              Plugins Required
            </span>
          </div>
        </div>

        <div className="welcome-text z-10 text-center flex flex-col items-center">
          <h1 className="text-2xl font-black text-white leading-[0.9] mb-2 tracking-tighter uppercase">
            CONNECT <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
              YOUR EDITOR
            </span>
          </h1>
          
          <p className="text-[11px] text-slate-400 leading-snug mb-6 font-light max-w-[240px]">
            Maestro integrates with your workflow via plugins. Install one to deploy.
          </p>
          
          <div className="flex flex-col items-center gap-2 w-full max-w-[200px]">
            <a
              href={plugins.vscode.url}
              onClick={onClick}
              target="_blank"
              className="secondary-button glow-cyan !py-2 !w-full !text-xs text-center"
            >
              VS Code
            </a>
            <a
              href="https://pulsar-edit.dev/"
              onClick={onClick}
              target="_blank"
              className="secondary-button glow-cyan !py-2 !w-full !text-xs text-center"
            >
              Pulsar
            </a>
            <a
              href={plugins.jetbrains.url}
              onClick={onClick}
              target="_blank"
              className="secondary-button glow-cyan !py-2 !w-full !text-xs text-center"
            >
              JetBrains
            </a>
          </div>
          
          <div className="flex items-center justify-between w-full mt-8">
            <Link to="/welcome" className="text-slate-500 text-[10px] uppercase font-bold tracking-widest hover:text-white transition-colors">
              &larr; Back
            </Link>
            
            <div
              className={classNames("transition-all duration-500", {
                "opacity-0 pointer-events-none scale-95 translate-x-4": disabled,
                "opacity-100 scale-100 translate-x-0": !disabled,
              })}
            >
              <Link to="/tutorials" className="text-cyan-400 text-[10px] uppercase font-bold tracking-widest hover:text-white transition-colors flex items-center gap-2">
                Continue &rarr;
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
