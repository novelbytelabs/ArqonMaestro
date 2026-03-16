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
    <div className="h-screen w-full operator-surface overflow-hidden pt-12 flex flex-col items-center">
      <div className="welcome-container w-full h-full px-4 flex flex-col items-center justify-start relative gap-4 max-w-[280px]">
        {/* Decorative background glow */}
        <div className="absolute top-[-20%] left-[-10%] w-[300px] h-[300px] bg-cyan-500/5 blur-[80px] rounded-full pointer-events-none" />
        
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
          
          <p className="text-[11px] text-slate-400 leading-snug mb-4 font-light max-w-[240px]">
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
          
          <div
            className={classNames("pt-4 transition-all duration-500", {
              "opacity-0 pointer-events-none scale-95": disabled,
              "opacity-100 scale-100": !disabled,
            })}
          >
            <Link to="/privacy" className="text-cyan-400 text-[10px] uppercase font-bold tracking-widest hover:text-white transition-colors flex items-center gap-2">
              Continue Deployment <span>&rarr;</span>
            </Link>
          </div>
        </div>
        
        <div className="welcome-hero w-full z-10 flex justify-center mt-2">
          <img 
            className="w-full max-w-[220px] h-auto drop-shadow-[0_0_40px_rgba(0,229,255,0.2)]" 
            src={onboardingHub} 
            alt="Integration Hub" 
          />
        </div>
      </div>
    </div>
  );
};
