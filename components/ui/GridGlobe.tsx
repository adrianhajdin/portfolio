"use client";
import React, { Suspense, useMemo, useCallback, useState, useEffect, useRef } from "react";
import { GlobeConfig, Position, WorldProps } from "./Globe";
import { ErrorBoundary } from "react-error-boundary";
import dynamic from 'next/dynamic';
import ErrorMessage from "@/components/ErrorMessage";
import { LoadingSpinner } from "@/components/LoadingSpinner";

const DynamicGlobe = dynamic<WorldProps>(
  () => import("./Globe").then(mod => mod.World).catch(err => {
    console.error("Failed to load Globe component:", err);
    return () => <ErrorMessage message="Failed to load Globe component. Please try refreshing the page." />;
  }),
  {
    ssr: false,
    loading: () => <LoadingSpinner message="Loading Globe..." aria-label="Loading 3D Globe" />,
  }
);

type ArcGeneratorWorker = Worker & {
  postMessage: (message: { count: number; MIN_ARC_DISTANCE: number; createArc: string }) => void;
};

interface ArcData {
  order: number;
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  arcAlt: number;
  color: string;
}

const GlobeWrapper: React.FC<WorldProps> = React.memo((props) => {
  const reportError = useCallback((error: Error, info: React.ErrorInfo) => {
    console.error("Globe error:", error, info);
    // TODO: Implement error reporting logic (e.g., sending to a logging service)
  }, []);

  const handleReset = useCallback(() => {
    // TODO: Implement reset logic (e.g., clearing cache or resetting state)
  }, []);

  return (
    <Suspense fallback={<LoadingSpinner message="Loading Globe..." />}>
      <ErrorBoundary
        fallbackRender={({ error, resetErrorBoundary }) => (
          <div className="text-center">
            <ErrorMessage message={`Failed to load Globe component: ${error.message}`} />
            <button
              onClick={resetErrorBoundary}
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              aria-label="Retry loading Globe component"
            >
              Retry
            </button>
          </div>
        )}
        onError={reportError}
        onReset={handleReset}
      >
        <DynamicGlobe {...props} />
      </ErrorBoundary>
    </Suspense>
  );
});

GlobeWrapper.displayName = 'GlobeWrapper';

const globeConfig: GlobeConfig = {
  pointSize: 4,
  globeColor: "#062056",
  showAtmosphere: true,
  atmosphereColor: "#FFFFFF",
  atmosphereAltitude: 0.1,
  emissive: "#062056",
  emissiveIntensity: 0.1,
  shininess: 0.9,
  polygonColor: "rgba(255,255,255,0.7)",
  ambientLight: "#38bdf8",
  directionalLeftLight: "#ffffff",
  directionalTopLight: "#ffffff",
  pointLight: "#ffffff",
  arcTime: 1000,
  arcLength: 0.9,
  rings: 1,
  maxRings: 3,
  initialPosition: { lat: 22.3193, lng: 114.1694 },
  autoRotate: true,
  autoRotateSpeed: 0.5,
};

const MAX_RETRY_ATTEMPTS = 3;
const ARC_COUNT = 40;
const MIN_ARC_DISTANCE = 0.75;
const GENERATION_TIMEOUT = 8000;
const RETRY_DELAY_BASE = 1000;

const useArcGeneration = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [sampleArcs, setSampleArcs] = useState<Position[]>([]);
  const retryCountRef = useRef(0);
  const workerRef = useRef<Worker | null>(null);
  const mountedRef = useRef(true);

  const colors = useMemo(() => ["#06b6d4", "#3b82f6", "#6366f1"], []);

  const getRandomColor = useCallback(() => colors[Math.floor(Math.random() * colors.length)], [colors]);

  const validateCoordinate = useCallback((value: number, min: number, max: number): number => {
    if (!Number.isFinite(value) || Number.isNaN(value)) {
      console.warn(`Invalid coordinate value: ${value}. Using default.`);
      return (min + max) / 2;
    }
    return Math.max(min, Math.min(max, value));
  }, []);

  const createArc = useCallback((
    order: number,
    startLat: number,
    startLng: number,
    endLat: number,
    endLng: number,
    arcAlt: number
  ): Position => {
    const arc: Position = {
      order,
      startLat: validateCoordinate(startLat, -90, 90),
      startLng: validateCoordinate(startLng, -180, 180),
      endLat: validateCoordinate(endLat, -90, 90),
      endLng: validateCoordinate(endLng, -180, 180),
      arcAlt: validateCoordinate(arcAlt, 0, 1),
      color: getRandomColor(),
    };

    if (arc.startLat === arc.endLat && arc.startLng === arc.endLng) {
      arc.endLat = validateCoordinate(arc.endLat + MIN_ARC_DISTANCE, -90, 90);
      arc.endLng = validateCoordinate(arc.endLng + MIN_ARC_DISTANCE, -180, 180);
    }

    return arc;
  }, [validateCoordinate, getRandomColor]);

  const isValidPosition = useCallback((item: unknown): item is Position => {
    if (typeof item !== 'object' || item === null) return false;
    const pos = item as Partial<Position>;
    return (
      typeof pos.order === 'number' &&
      typeof pos.startLat === 'number' &&
      typeof pos.startLng === 'number' &&
      typeof pos.endLat === 'number' &&
      typeof pos.endLng === 'number' &&
      typeof pos.arcAlt === 'number' &&
      typeof pos.color === 'string'
    );
  }, []);

  const cleanupWorker = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
  }, []);

  const generateSampleArcs = useCallback(async (count: number): Promise<Position[]> => {
    if (!workerRef.current) {
      try {
        // Commented out due to missing arcGenerator.worker.ts file
        // workerRef.current = new Worker(
        //   new URL('../workers/arcGenerator.worker.ts', import.meta.url),
        //   { type: 'module' }
        // );
        console.log('Web Worker creation skipped due to missing file');
      } catch (error) {
        console.error('Failed to create Web Worker:', error);
        throw new Error(`Failed to initialize arc generator: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return new Promise<Position[]>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        cleanupWorker();
        reject(new Error(`Arc generation timed out after ${GENERATION_TIMEOUT}ms`));
      }, GENERATION_TIMEOUT);

      const handleMessage = (event: MessageEvent) => {
        clearTimeout(timeoutId);
        if (Array.isArray(event.data) && event.data.every(isValidPosition)) {
          const validArcs = event.data.length;
          console.log(`Successfully generated ${validArcs} arcs`);
          resolve(event.data);
        } else {
          const errorMessage = Array.isArray(event.data)
            ? `Invalid data received from worker: ${event.data.length} items, ${event.data.filter(isValidPosition).length} valid`
            : 'Invalid data received from worker: not an array';
          console.error(errorMessage);
          reject(new Error(errorMessage));
        }
      };

      const handleError = (error: ErrorEvent) => {
        clearTimeout(timeoutId);
        console.error('Worker error:', error);
        reject(new Error(`Worker error: ${error.message}`));
      };

      if (workerRef.current) {
        workerRef.current.onmessage = handleMessage;
        workerRef.current.onerror = handleError;
        workerRef.current.postMessage({ count, MIN_ARC_DISTANCE, createArc: createArc.toString() });
        console.log(`Sent message to worker: generating ${count} arcs`);
      } else {
        const errorMessage = 'Worker not initialized';
        console.error(errorMessage);
        reject(new Error(errorMessage));
      }
    });
  }, [createArc, cleanupWorker, isValidPosition]);

  const generateArcs = useCallback(async () => {
    let localRetryCount = 0;
    while (localRetryCount < MAX_RETRY_ATTEMPTS && mountedRef.current) {
      try {
        console.log(`Attempt ${localRetryCount + 1} to generate arcs`);
        const arcs = await generateSampleArcs(ARC_COUNT);
        if (mountedRef.current) {
          setSampleArcs(arcs);
          setIsLoading(false);
          setError(null);
          console.log(`Successfully generated ${arcs.length} arcs`);
        }
        return;
      } catch (error) {
        console.error(`Attempt ${localRetryCount + 1} failed:`, error);
        const delay = Math.pow(2, localRetryCount) * RETRY_DELAY_BASE;
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        localRetryCount++;
      }
    }
    if (mountedRef.current) {
      const errorMessage = `Failed to generate arcs after ${MAX_RETRY_ATTEMPTS} attempts`;
      console.error(errorMessage);
      setError(new Error(errorMessage));
      setIsLoading(false);
    }
  }, [generateSampleArcs]);

  useEffect(() => {
    mountedRef.current = true;

    const initializeAndGenerateArcs = async () => {
      try {
        await generateArcs();
      } catch (error) {
        console.error('Failed to generate arcs:', error);
        setError(error instanceof Error ? error : new Error('Unknown error occurred'));
      }
    };

    initializeAndGenerateArcs();

    return () => {
      mountedRef.current = false;
      cleanupWorker();
    };
  }, [generateArcs, cleanupWorker]);

  const handleRetry = useCallback(() => {
    if (mountedRef.current) {
      setError(null);
      setIsLoading(true);
      retryCountRef.current = 0;
      generateArcs();
    }
  }, [generateArcs]);

  return { isLoading, error, sampleArcs, handleRetry };
};

const GridGlobe: React.FC = React.memo(() => {
  const { isLoading, error, sampleArcs, handleRetry } = useArcGeneration();
  const [retryCount, setRetryCount] = useState(0);
  const [webGLContextLost, setWebGLContextLost] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const memoizedGlobeConfig = useMemo(() => globeConfig, []);

  const handleRetryWithCount = useCallback(() => {
    setRetryCount(prev => prev + 1);
    handleRetry();
  }, [handleRetry]);

  const renderError = useCallback((errorMessage: string, retryHandler: () => void) => (
    <div className="flex items-center justify-center h-full" role="alert">
      <div className="text-center">
        <ErrorMessage message={errorMessage} />
        <button
          onClick={retryHandler}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
          aria-label="Retry generating globe data"
          disabled={retryCount >= MAX_RETRY_ATTEMPTS}
        >
          {retryCount >= MAX_RETRY_ATTEMPTS ? 'Max retries reached' : 'Retry'}
        </button>
      </div>
    </div>
  ), [retryCount]);

  const ErrorFallback = useCallback(({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) => {
    console.error("GridGlobe error:", error);
    return renderError(`An unexpected error occurred: ${error.message}. Please try again.`, () => {
      resetErrorBoundary();
      handleRetryWithCount();
    });
  }, [renderError, handleRetryWithCount]);

  const WorldMemo = useMemo(() => (
    <GlobeWrapper
      globeConfig={memoizedGlobeConfig}
      data={sampleArcs}
    />
  ), [memoizedGlobeConfig, sampleArcs]);

  const content = useMemo(() => {
    if (error) {
      console.error("Failed to render Globe:", error);
      return renderError(`Failed to render Globe: ${error.message}. Please check your network connection and try again.`, handleRetryWithCount);
    }

    if (isLoading) {
      return <LoadingSpinner message="Generating globe data... This may take a few moments." aria-live="polite" size="large" />;
    }

    if (webGLContextLost) {
      return <ErrorMessage message="WebGL context lost. Please refresh the page." />;
    }

    return (
      <ErrorBoundary
        FallbackComponent={ErrorFallback}
        onReset={handleRetryWithCount}
        onError={(error) => {
          console.error("GridGlobe error:", error);
        }}
      >
        <Suspense fallback={<LoadingSpinner message="Rendering globe... Please wait." aria-live="polite" size="large" />}>
          <div
            role="region"
            aria-label="Interactive Globe Visualization"
            className="w-full h-full"
          >
            {WorldMemo}
          </div>
        </Suspense>
      </ErrorBoundary>
    );
  }, [error, isLoading, webGLContextLost, renderError, handleRetryWithCount, ErrorFallback, WorldMemo]);

  useEffect(() => {
    const handleWebGLContextLost = (event: WebGLContextEvent) => {
      event.preventDefault();
      console.error("WebGL context lost. Attempting to restore...");
      setWebGLContextLost(true);
      handleRetryWithCount();
    };

    const handleWebGLContextRestored = () => {
      console.log("WebGL context restored.");
      setWebGLContextLost(false);
      setRetryCount(0);
    };

    const handleResize = () => {
      // Trigger a re-render when the container size changes
      handleRetryWithCount();
    };

    const canvas = document.querySelector('canvas');
    if (canvas) {
      canvas.addEventListener('webglcontextlost', handleWebGLContextLost as EventListener);
      canvas.addEventListener('webglcontextrestored', handleWebGLContextRestored as EventListener);
    }

    const resizeObserver = new ResizeObserver(handleResize);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      if (canvas) {
        canvas.removeEventListener('webglcontextlost', handleWebGLContextLost as EventListener);
        canvas.removeEventListener('webglcontextrestored', handleWebGLContextRestored as EventListener);
      }
      resizeObserver.disconnect();
    };
  }, [handleRetryWithCount]);

  return (
    <div ref={containerRef} className="grid-globe-container" aria-busy={isLoading} aria-live="polite">
      {content}
    </div>
  );
});

GridGlobe.displayName = 'GridGlobe';

export default GridGlobe;
