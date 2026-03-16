import React from "react";
import { Link } from "react-router-dom";
import operatorDeck from "../../../../static/img/maestro-operator-deck.png";

export const WelcomePage = () => (
  <div className="h-screen w-full operator-surface overflow-hidden pt-12 flex flex-col items-center">
    <div className="welcome-container w-full h-full px-4 flex flex-col items-center justify-start relative gap-4 max-w-[275px]">
      {/* Decorative background glow */}
      <div className="absolute top-[-20%] left-[-10%] w-[300px] h-[300px] bg-cyan-500/5 blur-[80px] rounded-full pointer-events-none" />
      
      <div className="welcome-header flex flex-col items-center gap-3 z-10 w-full mb-2">
        <div className="flex flex-col items-center gap-1">
          <span className="text-cyan-400 font-mono text-[9px] tracking-widest uppercase font-bold opacity-80">
            Arqon Maestro Desktop
          </span>
          <div className="bg-amber-500/10 border border-amber-500/30 px-3 py-0.5 rounded-full">
            <span className="text-amber-500 text-[9px] uppercase font-bold tracking-widest">
              Pilot Active
            </span>
          </div>
        </div>
      </div>

      <div className="welcome-text z-10 text-center flex flex-col items-center">
        <h1 className="text-3xl font-black text-white leading-[0.9] mb-2 tracking-tighter uppercase">
          OPERATOR <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
            SURFACE
          </span>
        </h1>
        
        <p className="text-[11px] text-slate-400 leading-snug mb-4 font-light max-w-[220px]">
          Harness persistent intelligence and <br />
          seamless execution history. 
          <span className="text-white font-normal"> Arqon</span> is ready.
        </p>
        
        <div className="flex items-center justify-center gap-4 mb-2">
          <Link to="/plugins" className="secondary-button glow-cyan !py-2 !px-6 !text-xs">
            Get Started
          </Link>
          <div className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">
            v2.0.2
          </div>
        </div>
      </div>
      
      <div className="welcome-hero w-full z-10 flex justify-center mt-2">
        <div className="relative bg-transparent p-0 border-none shadow-none">
          <img 
            className="w-full max-w-[200px] h-auto drop-shadow-[0_0_30px_rgba(0,229,255,0.15)] bg-transparent" 
            src={operatorDeck} 
            alt="Maestro Operator Deck" 
          />
        </div>
      </div>
    </div>
  </div>
);
