import React from "react";
import { StaticImage } from "gatsby-plugin-image";
import { Link } from "gatsby";
import { FullWidthFeature, TwoColumnFeature } from "../components/features";
import { FeaturePageBottom } from "../components/footer";
import { Hero } from "../components/hero";
import { Main } from "../components/pages";

const EverywherePage = () => (
  <Main>
    <Hero
      title="Voice commands beyond code"
      text="As a developer you do far more than write code. Arqon Maestro lets you use voice to browse the web, write emails, and edit docs."
      image={
        <div className="w-[500px] mx-auto">
          <StaticImage
            src="https://cdn.serenade.ai/web/img/email-messages.png"
            alt="Arqon Maestro"
            placeholder="none"
            eager={true}
          />
        </div>
      }
    />
    <TwoColumnFeature
      dark={true}
      title="Give your hands a break"
      subtitle="Send Slack messages, craft emails, or add comments on project management tools entirely hands-free. Arqon Maestro works wherever you do."
      content={
        <div className="w-[450px] mx-auto">
          <StaticImage
            src="https://cdn.serenade.ai/web/img/dictate-mode.png"
            alt="Arqon Maestro"
            placeholder="none"
          />
        </div>
      }
    />
    <FullWidthFeature
      title="Browse the web without a keyboard"
      subtitle="Arqon Maestro integrates with web browsers like Chrome, so you can browse the web, find answers on Stack Overflow, or open a PR by speaking rather than typing."
      content={
        <div className="mx-auto w-max max-w-screen-lg px-4">
          <video controls poster="https://cdn.serenade.ai/web/video/workflow-demo-poster.png">
            <source src="https://cdn.serenade.ai/web/video/workflow-demo.mp4" type="video/mp4" />
          </video>
        </div>
      }
    />
    <TwoColumnFeature
      title="Dictate text, code, and everything in between"
      subtitle="Seamlessly switch between code and documentation. Use voice across your workflow while keeping editing intent explicit."
      gradient="bottom-right"
      content={
        <div className="w-[400px] mx-auto">
          <StaticImage
            src="https://cdn.serenade.ai/web/img/document-code.png"
            alt="Dictate mode"
            placeholder="none"
          />
        </div>
      }
    />
    <FeaturePageBottom />
  </Main>
);

export default EverywherePage;
