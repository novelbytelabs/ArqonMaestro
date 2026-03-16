import React from "react";
import { Link } from "react-router-dom";
import operatorDeck from "../../../../static/img/maestro-operator-deck.png";

export const WelcomePage = () => (
  <div className="h-screen w-full operator-surface flex items-center justify-center overflow-hidden pt-10">
    <div className="w-full h-full px-8 flex items-center relative gap-4">
      {/* Decorative background glow */}
      <div className="absolute top-[-20%] right-[-10%] w-[300px] h-[300px] bg-cyan-500/10 blur-[80px] rounded-full" />
      
      <div className="w-7/12 z-10 animate-fade-in">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-cyan-400 font-mono text-[10px] tracking-tighter uppercase font-bold">
            Arqon Maestro Desktop
          </span>
          <span className="pilot-pill">Pilot active</span>
        </div>
        
        <h1 className="text-4xl font-black text-white leading-tight mb-3 tracking-tight">
          OPERATOR <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
            SURFACE
          </span>
        </h1>
        
        <p className="text-sm text-slate-400 leading-relaxed mb-5 font-light max-w-[280px]">
          Harness persistent page intelligence and seamless execution history. 
          <span className="text-white font-normal"> Arqon Maestro</span> is ready to deploy.
        </p>
        
        <div className="flex items-center gap-4">
          <Link to="/plugins" className="secondary-button glow-cyan">
            Get Started
          </Link>
          <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
            v2.0.2
          </div>
        </div>
      </div>
      
      <div className="w-5/12 z-10 flex justify-center animate-fade-in" style={{ animationDelay: '0.2s' }}>
        <div className="relative">
          <img 
            className="w-full h-auto drop-shadow-[0_0_30px_rgba(0,229,255,0.2)] animate-float" 
            src={operatorDeck} 
            alt="Maestro Operator Deck" 
          />
        </div>
      </div>
    </div>
  </div>
);
