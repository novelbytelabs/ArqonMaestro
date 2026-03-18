import React from "react";
import { tutorials } from "../../../shared/tutorial";
import { Row } from "../settings";
import { shell } from "../../shell";

const DocsLink: React.FC<{
  title: string;
  subtitle: string;
  link: string;
  installed?: boolean;
}> = ({ title, subtitle, link, installed }) => (
  <Row
    title={title}
    subtitle={subtitle}
    action={
      installed ? (
        <span className="secondary-button !bg-white/5 !border-white/10 !text-white/40 !py-1 !px-4 !text-[10px] !shadow-none cursor-default">
          Installed
        </span>
      ) : (
        <a className="secondary-button !py-1 !px-4 !text-[10px]" href={link} target="_blank">
          Install
        </a>
      )
    }
  />
);

const TutorialLink: React.FC<{
  title: string;
  subtitle: string;
  name: string;
}> = ({ title, subtitle, name }) => {
  const click = (e: React.MouseEvent) => {
    e.preventDefault();
    shell.send("loadTutorial", { name });
  };

  return (
    <Row
      title={title}
      subtitle={subtitle}
      action={
        <button className="secondary-button !py-1 !px-4 !text-[10px]" onClick={click}>
          Open
        </button>
      }
    />
  );
};

export const Docs = () => (
  <div className="px-4">
    <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-400/80 mb-2">Plugins</h2>
    <DocsLink
      title="Community"
      subtitle="Get help and report issues"
      link="https://github.com/novelbytelabs/ArqonMaestro/issues"
    />
    <DocsLink
      title="Editors & IDEs"
      subtitle="Edit code with VS Code and JetBrains"
      link="https://novelbytelabs.github.io/ArqonMaestro/"
    />
    <DocsLink
      title="Web Browsers"
      subtitle="Browse the web with Chrome and Edge"
      link="https://novelbytelabs.github.io/ArqonMaestro/"
    />
    <DocsLink
      title="Custom Commands"
      subtitle="Create your own voice commands"
      link="https://novelbytelabs.github.io/ArqonMaestro/"
    />
    <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-400/80 mt-6 mb-2">Tutorials</h2>
    {tutorials.map((e, i) => (
      <TutorialLink title={e.title} subtitle={e.description} name={e.tutorial} key={e.tutorial} />
    ))}
  </div>
);
