import React from "react";
import { ipcRenderer } from "electron";
import { tutorials } from "../../../shared/tutorial";
import { Row } from "../settings";

const DocsLink: React.FC<{
  title: string;
  subtitle: string;
  link: string;
}> = ({ title, subtitle, link }) => (
  <Row
    title={title}
    subtitle={subtitle}
    action={
      <a className="primary-button" href={link} target="_blank">
        Open
      </a>
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
    ipcRenderer.send("loadTutorial", { name });
  };

  return (
    <Row
      title={title}
      subtitle={subtitle}
      action={
        <button className="primary-button" onClick={click}>
          Open
        </button>
      }
    />
  );
};

export const Docs = () => (
  <div className="px-4">
    <h2 className="text-lg font-light">Documentation</h2>
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
    <h2 className="text-lg font-light mt-4">Tutorials</h2>
    {tutorials.map((e, i) => (
      <TutorialLink title={e.title} subtitle={e.description} name={e.tutorial} key={e.tutorial} />
    ))}
  </div>
);
