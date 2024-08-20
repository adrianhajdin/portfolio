import React, { useState, useMemo, useCallback, Suspense, useEffect, lazy } from "react";
import { IoCopyOutline } from "react-icons/io5";
import { ErrorBoundary } from 'react-error-boundary';
import dynamic from 'next/dynamic';
import { cn } from "@/lib/utils";
import { BackgroundGradientAnimation } from "./GradientBg";
import animationData from "@/data/confetti.json";
import MagicButton from "../MagicButton";
import { LoadingSpinner } from "../LoadingSpinner";

const GridGlobe = lazy(() => import("./GridGlobe"));
const LazyLottie = lazy(() => import('react-lottie'));

export type BentoGridItemSize = 'small' | 'medium' | 'large' | 'wide' | 'tall';
export type BentoGridColumns = 1 | 2 | 3 | 4;

interface BentoGridProps {
  className?: string;
  children?: React.ReactNode;
  columns?: 1 | 2 | 3 | 4;
  gap?: string;
}

export const BentoGrid: React.FC<BentoGridProps> = React.memo(({ className, children, columns = 4, gap = "4" }) => {
  const gridColumns = useMemo(() => ({
    1: "grid-cols-1",
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
  }), []);

  return (
    <div
      className={cn(
        "grid",
        gridColumns[columns],
        `gap-${gap}`,
        "mx-auto w-full max-w-[98vw] lg:max-w-[95vw] xl:max-w-[90vw]",
        "px-2 sm:px-4 md:px-6 lg:px-8",
        "py-4 sm:py-6 md:py-8 lg:py-12",
        "items-stretch",
        className
      )}
      role="grid"
      aria-label="Bento Grid Layout"
    >
      {children}
    </div>
  );
});

BentoGrid.displayName = 'BentoGrid';

export interface BentoGridItemProps {
  className?: string;
  id: number;
  title: string;
  description: string;
  img?: string;
  imgClassName?: string;
  titleClassName?: string;
  spareImg?: string;
  size?: BentoGridItemSize;
}

export const BentoGridItem: React.FC<BentoGridItemProps> = React.memo(({
  className,
  id,
  title,
  description,
  img,
  imgClassName,
  titleClassName,
  spareImg,
  size = 'small',
}) => {
  const lists = useMemo(() => ({
    left: ["ReactJS", "Express", "Typescript"],
    right: ["VueJS", "NuxtJS", "GraphQL"]
  }), []);

  const sizeClasses = useMemo(() => ({
    small: 'col-span-1 row-span-1 min-h-[200px] sm:min-h-[240px] md:min-h-[280px] lg:min-h-[320px] xl:min-h-[360px]',
    medium: 'col-span-1 row-span-2 min-h-[300px] sm:min-h-[360px] md:min-h-[420px] lg:min-h-[480px] xl:min-h-[540px]',
    large: 'col-span-2 row-span-2 min-h-[400px] sm:min-h-[480px] md:min-h-[560px] lg:min-h-[640px] xl:min-h-[720px]',
    wide: 'col-span-2 row-span-1 min-h-[200px] sm:min-h-[240px] md:min-h-[280px] lg:min-h-[320px] xl:min-h-[360px]',
    tall: 'col-span-1 row-span-2 min-h-[400px] sm:min-h-[480px] md:min-h-[560px] lg:min-h-[640px] xl:min-h-[720px]',
  }), []);

  const [copied, setCopied] = useState(false);
  const [errors, setErrors] = useState<{lottie?: Error; globe?: Error; image?: boolean}>({});

  const defaultOptions = useMemo(() => ({
    loop: false,
    autoplay: true,
    animationData: animationData,
    rendererSettings: {
      preserveAspectRatio: "xMidYMid slice",
    },
  }), []);

  const handleError = useCallback((type: 'lottie' | 'globe' | 'image', error: Error | boolean) => {
    console.error(`${type.charAt(0).toUpperCase() + type.slice(1)} error:`, error);
    setErrors(prev => ({ ...prev, [type]: error }));
  }, []);

  const handleCopy = useCallback(() => {
    const text = "hsu@jsmastery.pro";
    navigator.clipboard.writeText(text)
      .then(() => {
        setCopied(true);
        const timer = setTimeout(() => setCopied(false), 3000);
        return () => clearTimeout(timer);
      })
      .catch(err => {
        console.error('Failed to copy text:', err);
        const notification = document.createElement('div');
        notification.textContent = 'Failed to copy email. Please try again or copy manually.';
        notification.setAttribute('role', 'alert');
        notification.className = 'fixed top-4 right-4 p-4 bg-red-500 text-white rounded shadow-lg z-50';
        document.body.appendChild(notification);
        const timer = setTimeout(() => notification.remove(), 5000);
        return () => clearTimeout(timer);
      });
  }, []);

  const renderTechList = useCallback((list: string[]) => (
    <ul className="flex flex-col gap-3 md:gap-3 lg:gap-8" aria-label="Technology list">
      {list.map((item) => (
        <li
          key={item}
          className="lg:py-4 lg:px-3 py-2 px-3 text-xs lg:text-base opacity-50 lg:opacity-100 rounded-lg text-center bg-[#10132E]"
        >
          {item}
        </li>
      ))}
      <li className="lg:py-4 lg:px-3 py-4 px-3 rounded-lg text-center bg-[#10132E]" aria-hidden="true"></li>
    </ul>
  ), []);

  const renderImage = useCallback(() => (
    img && !errors.image && (
      <div className="w-full h-full absolute">
        <img
          src={img}
          alt={title || "Grid item image"}
          className={cn(imgClassName, "object-cover object-center")}
          loading="lazy"
          onError={() => handleError('image', true)}
          aria-hidden="true"
        />
      </div>
    )
  ), [img, imgClassName, title, errors.image, handleError]);

  const renderSpareImage = useCallback(() => (
    spareImg && !errors.image && (
      <div className={`absolute right-0 -bottom-5 ${id === 5 ? "w-full opacity-80" : ""}`}>
        <img
          src={spareImg}
          alt={`${title || "Grid item"} spare image`}
          className="object-cover object-center w-full h-full"
          loading="lazy"
          onError={() => handleError('image', true)}
          aria-hidden="true"
        />
      </div>
    )
  ), [spareImg, id, title, errors.image, handleError]);

  const renderGlobe = useCallback(() => (
    <ErrorBoundary
      fallback={
        <div className="text-red-500 p-4 bg-red-100 rounded-lg" role="alert">
          <p className="font-bold">Failed to load Globe</p>
          <p>Please try refreshing the page or check your internet connection.</p>
        </div>
      }
      onError={(error) => handleError('globe', error)}
    >
      <Suspense fallback={<LoadingSpinner message="Loading Globe..." size="large" />}>
        {errors.globe ? (
          <div className="text-red-500 p-4 bg-red-100 rounded-lg" role="alert">
            <p className="font-bold">Error loading Globe</p>
            <p>{errors.globe.message}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-2 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors"
            >
              Refresh Page
            </button>
          </div>
        ) : (
          <GridGlobe />
        )}
      </Suspense>
    </ErrorBoundary>
  ), [errors.globe, handleError]);

  const renderLottieAnimation = useCallback(() => (
    <ErrorBoundary
      fallback={<div className="text-red-500" role="alert">Failed to load animation</div>}
      onError={(error) => handleError('lottie', error)}
    >
      <Suspense fallback={<div className="text-white" aria-live="polite">Loading animation...</div>}>
        {errors.lottie ? (
          <div className="text-yellow-500" role="alert">Animation unavailable</div>
        ) : (
          <LazyLottie
            options={defaultOptions}
            height={200}
            width={400}
            isClickToPauseDisabled={true}
          />
        )}
      </Suspense>
    </ErrorBoundary>
  ), [errors.lottie, defaultOptions, handleError]);

  const itemStyle = useMemo(() => ({
    background: "rgb(4,7,29)",
    backgroundImage: "linear-gradient(90deg, rgba(4,7,29,1) 0%, rgba(12,14,35,1) 100%)",
  }), []);

  const contentClassNames = useMemo(() => cn(
    "h-full w-full relative",
    id === 6 && "flex justify-center",
    size === 'large' && "p-6 sm:p-8 md:p-10 lg:p-12",
    size === 'medium' && "p-4 sm:p-6 md:p-8 lg:p-10",
    size === 'small' && "p-3 sm:p-4 md:p-5 lg:p-6"
  ), [id, size]);

  const titleContainerClassNames = useMemo(() => cn(
    titleClassName,
    "group-hover/bento:translate-x-2 transition duration-200 relative md:h-full min-h-40 flex flex-col px-3 sm:px-5 p-3 sm:p-5 lg:p-10"
  ), [titleClassName]);

  const itemClassNames = useMemo(() => cn(
    "relative overflow-hidden rounded-3xl border border-white/[0.1] group/bento hover:shadow-xl transition duration-200 shadow-input dark:shadow-none justify-between flex flex-col",
    "p-3 sm:p-4 md:p-5 lg:p-6",
    "h-full w-full",
    size && sizeClasses[size],
    className
  ), [size, sizeClasses, className]);

  return (
    <div
      className={itemClassNames}
      style={itemStyle}
      role="gridcell"
      aria-labelledby={`bento-item-${id}-title`}
    >
      <div className={contentClassNames}>
        {renderImage()}
        {renderSpareImage()}
        {id === 6 && (
          <BackgroundGradientAnimation>
            <div className="absolute z-50 inset-0 flex items-center justify-center text-white font-bold px-3 sm:px-4 md:px-5 pointer-events-none text-sm sm:text-base md:text-lg lg:text-xl text-center" aria-hidden="true"></div>
          </BackgroundGradientAnimation>
        )}

        <div className={titleContainerClassNames}>
          <div className="font-sans font-extralight md:max-w-full lg:max-w-32 text-xs sm:text-sm lg:text-base text-[#C1C2D3] z-10">
            {description}
          </div>
          <h3 id={`bento-item-${id}-title`} className="font-sans text-base sm:text-lg lg:text-3xl max-w-full lg:max-w-96 font-bold z-10 mt-2">
            {title}
          </h3>

          {id === 2 && renderGlobe()}

          {id === 3 && (
            <div className="flex gap-1 lg:gap-5 w-fit absolute -right-3 lg:-right-2">
              {renderTechList(lists.left)}
              {renderTechList(lists.right)}
            </div>
          )}

          {id === 6 && (
            <div className="mt-5 relative">
              <div className={`absolute -bottom-5 right-0 ${copied ? "block" : "hidden"}`} aria-live="polite" aria-atomic="true">
                {renderLottieAnimation()}
              </div>

              <MagicButton
                title={copied ? "Email Copied!" : "Copy my email address"}
                icon={<IoCopyOutline aria-hidden="true" />}
                position="left"
                handleClick={handleCopy}
                otherClasses="!bg-[#161A31]"
                aria-label={copied ? "Email copied to clipboard" : "Copy email address to clipboard"}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

BentoGridItem.displayName = 'BentoGridItem';
