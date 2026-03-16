import React from "react";
import { Link } from "react-router-dom";
import { tutorials } from "../../../shared/tutorial";
import onboardingTutorials from "../../../../static/img/onboarding-tutorials.svg";
import { shell } from "../../shell";

export const TutorialsPage = () => {
  const click = (e: React.MouseEvent, name: string) => {
    shell.send("generateToken");
    shell.send("loadTutorial", { name, resize: true });
  };

  return (
    <div className="h-screen w-full operator-surface overflow-hidden pt-12 flex flex-col items-center relative">
      {/* Central Background Glowing Orb */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-cyan-500/10 blur-[100px] rounded-full pointer-events-none z-0" />
      
      <div className="welcome-container w-full h-full px-4 flex flex-col items-center justify-start relative gap-4 max-w-[280px] z-10">
        <div className="welcome-header flex flex-col items-center gap-1 z-10 w-full mb-2">
          <span className="text-cyan-400 font-mono text-[9px] tracking-widest uppercase font-bold opacity-80">
            Voice Programming
          </span>
          <div className="bg-cyan-500/10 border border-cyan-500/30 px-3 py-0.5 rounded-full">
            <span className="text-cyan-400 text-[9px] uppercase font-bold tracking-widest">
              Tutorial Selection
            </span>
          </div>
        </div>

        <div className="welcome-text z-10 text-center flex flex-col items-center w-full">
          <h1 className="text-2xl font-black text-white leading-[0.9] mb-2 tracking-tighter uppercase">
            CHOOSE A <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
              TUTORIAL
            </span>
          </h1>
          
          <p className="text-[11px] text-slate-400 leading-snug mb-4 font-light max-w-[240px]">
            Master the core commands in your <br />
            preferred language.
          </p>
          
          <div className="grid grid-cols-2 gap-2 w-full">
            {tutorials.map((tutorial) =>
              tutorial.basic ? (
                <Link
                  to="/alternatives"
                  className="secondary-button glow-cyan !py-1.5 !px-0 !text-[10px] text-center w-full"
                  onClick={(e) => click(e, tutorial.tutorial)}
                  key={tutorial.tutorial}
                >
                  {tutorial.title.replace("Basics", "")}
                </Link>
              ) : null
            )}
          </div>
          
          <div className="flex items-center justify-start w-full mt-8">
            <Link to="/plugins" className="text-slate-500 text-[10px] uppercase font-bold tracking-widest hover:text-white transition-colors">
              &larr; Back
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
