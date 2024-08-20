import React, { useMemo, useCallback } from 'react';
import { FaLocationArrow } from "react-icons/fa6";
import MagicButton from "./MagicButton";
import { Spotlight } from "./ui/Spotlight";
import { TextGenerateEffect } from "./ui/TextGenerateEffect";

const Hero: React.FC = () => {
  const spotlights = useMemo(() => [
    { className: "-top-40 -left-10 md:-left-32 md:-top-20 h-screen", fill: "white" },
    { className: "h-[80vh] w-[50vw] top-10 left-full", fill: "purple" },
    { className: "left-80 top-28 h-[80vh] w-[50vw]", fill: "blue" }
  ], []);

  const titleWords = useMemo(() => "Transforming Concepts into Seamless User Experiences", []);

  const renderSpotlights = useCallback(() => (
    <div className="spotlight-container absolute inset-0 overflow-hidden" aria-hidden="true">
      {spotlights.map((spotlight, index) => (
        <Spotlight
          key={`spotlight-${index}`}
          className={spotlight.className}
          fill={spotlight.fill}
        />
      ))}
    </div>
  ), [spotlights]);

  const renderBackground = useCallback(() => (
    <div
      className="absolute inset-0 bg-white dark:bg-black-100 bg-grid-black-100/[0.03] dark:bg-grid-white/[0.03]
      flex items-center justify-center"
      aria-hidden="true"
    >
      <div
        className="absolute inset-0 flex items-center justify-center bg-white dark:bg-black-100
        [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]"
      />
    </div>
  ), []);

  return (
    <section className="relative overflow-hidden min-h-screen flex items-center justify-center py-20" aria-labelledby="hero-title">
      {renderSpotlights()}
      {renderBackground()}

      <div className="relative z-10 max-w-[89vw] md:max-w-2xl lg:max-w-[60vw] text-center">
        <header>
          <p className="uppercase tracking-widest text-xs text-blue-100 mb-4" aria-hidden="true">
            Dynamic Web Magic with Next.js
          </p>

          <h1 id="hero-title" className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold mb-6">
            <TextGenerateEffect words={titleWords} aria-hidden="true" />
            <span className="sr-only">{titleWords}</span>
          </h1>

          <p className="md:tracking-wider text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl mb-8">
            Hi! I&apos;m Adrian, a Next.js Developer based in Croatia.
          </p>
        </header>

        <nav>
          <a
            href="#about"
            className="inline-block focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            aria-label="Navigate to my work section"
          >
            <MagicButton
              title="Show my work"
              icon={<FaLocationArrow aria-hidden="true" />}
              position="right"
            />
          </a>
        </nav>
      </div>
    </section>
  );
};

export default React.memo(Hero);
