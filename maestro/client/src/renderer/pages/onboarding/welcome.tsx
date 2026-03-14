import React from "react";
import { Link } from "react-router-dom";
import onboardingWelcome from "../../../../static/img/onboarding-welcome.png";

export const WelcomePage = () => (
  <div className="h-screen w-full bg-slate-600 dark:bg-indigo-800">
    <div
      className="h-full w-full bg-white dark:bg-neutral-800"
      style={{ borderBottomRightRadius: "100% 100%" }}
    >
      <div className="w-full h-full flex items-center">
        <div className="w-7/12 mx-auto pl-6 pr-4">
          <h2 className="text-xl font-light">Welcome to Arqon Maestro</h2>
          <p className="pt-2">
            Let's start writing code with voice. We'll walk through setting Arqon Maestro up with your
            favorite tools.
          </p>
          <div className="mx-auto pt-4">
            <Link to="/plugins" className="secondary-button inline-block">
              Get Started
            </Link>
          </div>
        </div>
        <div className="w-5/12">
          <img className="w-full" src={onboardingWelcome} alt="Welcome to ArqonMaestro" />
        </div>
      </div>
    </div>
  </div>
);
