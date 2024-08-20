"use client";
import React, { useEffect, useRef, useState, useMemo, useCallback, Suspense } from "react";
import * as THREE from "three";
import ThreeGlobe from "three-globe";
import { useThree, Object3DNode, Canvas, extend, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import countries from "@/data/globe.json";
import ErrorMessage from "../ErrorMessage";
import { ErrorBoundary } from "react-error-boundary";
import { LoadingSpinner } from "../LoadingSpinner";

declare module "@react-three/fiber" {
  interface ThreeElements {
    threeGlobe: Object3DNode<ThreeGlobe, typeof ThreeGlobe>;
  }
}

extend({ ThreeGlobe });



type GlobeProps = {
  globeConfig: GlobeConfig;
  data: Position[];
};

export type ObjAccessor<T> = T | ((obj: unknown) => T);
export type RGB = { r: number; g: number; b: number };
export type Position = {
  order: number;
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  arcAlt: number;
  color: string;
};

export interface GlobeConfig {
  pointSize: number;
  globeColor: string;
  showAtmosphere: boolean;
  atmosphereColor: string;
  atmosphereAltitude: number;
  emissive: string;
  emissiveIntensity: number;
  shininess: number;
  polygonColor: string;
  ambientLight: string;
  directionalLeftLight: string;
  directionalTopLight: string;
  pointLight: string;
  arcTime: number;
  arcLength: number;
  rings: number;
  maxRings: number;
  initialPosition: { lat: number; lng: number };
  autoRotate: boolean;
  autoRotateSpeed: number;
}

type ThreeGlobeRef = ThreeGlobe & {
  __globeObjRef?: { geometry?: THREE.BufferGeometry };
  globeMaterial: () => THREE.MeshPhongMaterial;
  pointsData: () => Position[];
  arcsData: () => Position[];
  ringsData: (data: Position[]) => ThreeGlobeRef;
  ringColor: (accessor: ObjAccessor<string>) => ThreeGlobe;
  ringMaxRadius: (radius: number) => ThreeGlobe;
  ringPropagationSpeed: (speed: number) => ThreeGlobe;
  ringRepeatPeriod: (period: number) => ThreeGlobe;
  arcAltitude: (accessor: ObjAccessor<number>) => ThreeGlobe;
  pointColor: (accessor: ObjAccessor<string>) => ThreeGlobe;
};

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

export function hexToRgb(hex: string): RGB | undefined {
  const sanitizedHex = hex.replace(/^#/, '').padStart(6, '0');

  if (!/^[0-9A-Fa-f]{6}$/.test(sanitizedHex)) {
    console.warn(`Invalid hex color: ${hex}`);
    return undefined;
  }

  try {
    const r = parseInt(sanitizedHex.slice(0, 2), 16);
    const g = parseInt(sanitizedHex.slice(2, 4), 16);
    const b = parseInt(sanitizedHex.slice(4, 6), 16);

    if (isNaN(r) || isNaN(g) || isNaN(b)) {
      throw new Error('Invalid hex values');
    }

    return { r, g, b };
  } catch (error) {
    console.error(`Error parsing hex color ${hex}:`, error);
    return undefined;
  }
}

function fixGeometryNaNs(geometry: THREE.BufferGeometry): { nanCount: number; fixedPositions: { index: number; original: number; fixed: number }[] } {
  if (!geometry?.attributes?.position) {
    console.error('Invalid geometry or missing position attribute');
    return { nanCount: 0, fixedPositions: [] };
  }

  const positionAttribute = geometry.attributes.position as THREE.BufferAttribute;
  const positions = positionAttribute.array;
  let nanCount = 0;
  const fixedPositions: { index: number; original: number; fixed: number }[] = [];

  if (positions.length === 0) {
    console.warn('Zero-length geometry detected');
    return { nanCount: 0, fixedPositions: [] };
  }

  const fixValue = (index: number): number => {
    const vertexIndex = Math.floor(index / 3);
    const component = index % 3;
    const neighborIndices = [
      (vertexIndex - 1) * 3 + component,
      (vertexIndex + 1) * 3 + component,
      vertexIndex * 3 + ((component + 1) % 3),
      vertexIndex * 3 + ((component + 2) % 3)
    ].filter(i => i >= 0 && i < positions.length);

    const validNeighbors = neighborIndices.map(i => positions[i]).filter(v => Number.isFinite(v) && !Number.isNaN(v));
    if (validNeighbors.length > 0) {
      return validNeighbors.reduce((a, b) => a + b) / validNeighbors.length;
    }
    console.warn(`No valid neighbors found for index ${index}. Using default value.`);
    return 0;
  };

  for (let i = 0; i < positions.length; i++) {
    if (!Number.isFinite(positions[i]) || Number.isNaN(positions[i])) {
      const originalValue = positions[i];
      const fixedValue = fixValue(i);
      positions[i] = fixedValue;
      nanCount++;
      fixedPositions.push({ index: i, original: originalValue, fixed: fixedValue });
      console.debug(`Fixed NaN/Infinite value at index ${i}: ${originalValue} -> ${fixedValue}`);
    }
  }

  if (nanCount > 0) {
    console.warn(`Fixed ${nanCount} invalid values in geometry`, fixedPositions);
    positionAttribute.needsUpdate = true;

    try {
      geometry.computeBoundingBox();
      geometry.computeBoundingSphere();

      if (!geometry.boundingSphere || !isFinite(geometry.boundingSphere.radius)) {
        throw new Error('Invalid bounding sphere after computation');
      }
      console.debug('Successfully computed bounding sphere:', JSON.stringify(geometry.boundingSphere));
    } catch (error) {
      console.error('Error computing bounding box or sphere:', error);
      handleBoundingError(geometry);
    }

    logFinalBoundingSphere(geometry);
  } else {
    console.debug('No NaN/Infinite values found in geometry');
  }

  // Ensure valid bounding box and sphere
  if (!geometry.boundingBox || !geometry.boundingSphere) {
    console.error('Geometry is missing bounding box or sphere after fixes');
    handleBoundingError(geometry);
  } else if (!isFinite(geometry.boundingSphere.radius)) {
    console.error('Bounding sphere radius is invalid after fixes');
    handleBoundingError(geometry);
  }

  // Final sanity check
  if (!isValidGeometry(geometry)) {
    console.error('Geometry is still invalid after all fixes');
    throw new Error('Failed to fix geometry');
  }

  return { nanCount, fixedPositions };
}

function isValidGeometry(geometry: THREE.BufferGeometry): boolean {
  return (
    geometry.boundingBox !== null &&
    geometry.boundingSphere !== null &&
    isFinite(geometry.boundingSphere.radius) &&
    geometry.attributes.position.count > 0
  );
}

function calculateFixedValue(index: number, positions: ArrayLike<number>): number {
  // Try to interpolate from neighboring valid values
  const prevIndex = Math.max(0, index - 1);
  const nextIndex = Math.min(positions.length - 1, index + 1);

  if (Number.isFinite(positions[prevIndex]) && Number.isFinite(positions[nextIndex])) {
    return (positions[prevIndex] + positions[nextIndex]) / 2;
  }

  // If interpolation is not possible, use a default value
  return 0;
}

function handleBoundingError(geometry: THREE.BufferGeometry): void {
  console.warn('Invalid bounding sphere detected. Attempting to calculate fallback.');

  if (!geometry.attributes.position) {
    console.error('Geometry has no position attribute. Cannot calculate bounding sphere.');
    geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 1);
    return;
  }

  const positions = geometry.attributes.position.array;
  if (positions.length === 0) {
    console.error('Geometry has no vertices. Setting default bounding sphere.');
    geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 1);
    return;
  }

  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  let validVertices = 0;

  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i], y = positions[i + 1], z = positions[i + 2];
    if (isFinite(x) && isFinite(y) && isFinite(z)) {
      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z);
      validVertices++;
    }
  }

  if (validVertices === 0) {
    console.error('No valid vertices found. Setting default bounding sphere.');
    geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 1);
  } else {
    const center = new THREE.Vector3((minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2);
    const radius = Math.sqrt(
      Math.max(
        Math.pow(maxX - minX, 2),
        Math.pow(maxY - minY, 2),
        Math.pow(maxZ - minZ, 2)
      )
    ) / 2;

    if (isFinite(radius) && radius > 0) {
      geometry.boundingSphere = new THREE.Sphere(center, radius);
      console.log('Computed fallback bounding sphere:', JSON.stringify({center: center.toArray(), radius, validVertices}));
    } else {
      console.error('Computed radius is invalid. Setting default bounding sphere.');
      geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 1);
    }
  }
}

function logFinalBoundingSphere(geometry: THREE.BufferGeometry): void {
  if (geometry.boundingSphere) {
    console.log('Final bounding sphere:', JSON.stringify({
      center: geometry.boundingSphere.center.toArray(),
      radius: geometry.boundingSphere.radius
    }, null, 2));
  } else {
    console.error('Bounding sphere is still undefined after attempts to set it');
  }
}

type GlobeData = {
  size: number;
  order: number;
  color: (t: number) => string;
  lat: number;
  lng: number;
};



function safeNumber(value: any): number {
  const num = Number(value);
  return isFinite(num) ? num : 0;
}

function isValidCoordinate(value: number, min: number, max: number): boolean {
  return typeof value === 'number' && !isNaN(value) && isFinite(value) && value >= min && value <= max;
}

function isValidAltitude(value: number): boolean {
  return isValidCoordinate(value, 0, 1);
}

function isValidRGB(rgb: RGB): boolean {
  return ['r', 'g', 'b'].every(key => isValidCoordinate(rgb[key as keyof RGB], 0, 255));
}

function safeValue<T>(value: T, defaultValue: T): T {
  if (typeof value === 'number') {
    return isFinite(value) && !isNaN(value) ? value : defaultValue;
  }
  return value !== undefined && value !== null ? value : defaultValue;
}

function isValidNumber(value: any): boolean {
  return typeof value === 'number' && !isNaN(value) && isFinite(value);
}

const ErrorFallback: React.FC<{ error: Error }> = ({ error }) => (
  <div role="alert">
    <p>Something went wrong:</p>
    <pre>{error.message}</pre>
  </div>
);

declare module "@react-three/fiber" {
  interface ThreeElements {
    threeGlobe: Object3DNode<ThreeGlobe, typeof ThreeGlobe>;
  }
}

declare module "@react-three/fiber" {
  interface ThreeElements {
    threeGlobe: Object3DNode<ThreeGlobe, typeof ThreeGlobe>;
  }
}

extend({ ThreeGlobe });

const RING_PROPAGATION_SPEED = 3;
const aspect = 1.2;
const cameraZ = 300;

// GlobeConfig interface is already defined earlier in the file

export interface WorldProps {
  globeConfig: GlobeConfig;
  data: Position[];
}

let numbersOfRings = [0];

const defaultProps: Required<GlobeConfig> = {
  pointSize: 1,
  globeColor: "#1d072e",
  showAtmosphere: true,
  atmosphereColor: "#ffffff",
  atmosphereAltitude: 0.1,
  emissive: "#000000",
  emissiveIntensity: 0.1,
  shininess: 0.9,
  polygonColor: "rgba(255,255,255,0.7)",
  ambientLight: "#ffffff",
  directionalLeftLight: "#ffffff",
  directionalTopLight: "#ffffff",
  pointLight: "#ffffff",
  arcTime: 2000,
  arcLength: 0.9,
  rings: 1,
  maxRings: 3,
  initialPosition: { lat: 0, lng: 0 },
  autoRotate: false,
  autoRotateSpeed: 1,
};

// Utility functions moved outside the component
const fixCoordinate = (value: number, min: number, max: number): number => {
  if (!isValidNumber(value)) {
    console.warn(`Invalid coordinate value: ${value}. Using default.`);
    return (min + max) / 2;
  }
  return Math.max(min, Math.min(max, value));
};

const validateAndFixData = (inputData: Position[]): { fixedData: Position[], invalidIndices: number[] } => {
  const invalidIndices: number[] = [];
  const fixedData = inputData.map((arc, index) => {
    const fixArcCoordinate = (value: number, min: number, max: number, name: string): number => {
      const fixedValue = fixCoordinate(value, min, max);
      if (fixedValue !== value) {
        console.warn(`${name} at index ${index} fixed. Original: ${value}, Fixed: ${fixedValue}`);
        invalidIndices.push(index);
      }
      return fixedValue;
    };

    const fixedArc = {
      ...arc,
      startLat: fixArcCoordinate(arc.startLat, -90, 90, 'startLat'),
      startLng: fixArcCoordinate(arc.startLng, -180, 180, 'startLng'),
      endLat: fixArcCoordinate(arc.endLat, -90, 90, 'endLat'),
      endLng: fixArcCoordinate(arc.endLng, -180, 180, 'endLng'),
      arcAlt: fixArcCoordinate(arc.arcAlt, 0, 1, 'arcAlt'),
    };

    if (fixedArc.startLat === fixedArc.endLat && fixedArc.startLng === fixedArc.endLng) {
      console.warn(`Arc at index ${index} has identical start and end points. Adjusting end point.`);
      fixedArc.endLat = fixArcCoordinate(fixedArc.endLat + 1, -90, 90, 'endLat');
      fixedArc.endLng = fixArcCoordinate(fixedArc.endLng + 1, -180, 180, 'endLng');
      invalidIndices.push(index);
    }

    const rgbColor = hexToRgb(arc.color);
    if (!rgbColor) {
      console.warn(`Invalid color at index ${index}. Original: ${arc.color}, Fixed: #FFFFFF`);
      fixedArc.color = '#FFFFFF';
      invalidIndices.push(index);
    }

    return fixedArc;
  });

  return { fixedData, invalidIndices };
};

const handleGlobeInitializationError = (
  error: unknown,
  setError: React.Dispatch<React.SetStateAction<string | null>>,
  globeRef: React.MutableRefObject<ThreeGlobe | null>,
  retryCount: React.MutableRefObject<number>,
  initializeGlobe: () => void,
  createFallbackGlobe: () => void
) => {
  console.error("Globe initialization error:", error);
  setError(`Failed to initialize globe: ${error instanceof Error ? error.message : 'Unknown error'}`);
  if (globeRef.current?.parent) {
    globeRef.current.parent.remove(globeRef.current);
  }
  globeRef.current = null;

  const maxRetries = 3;
  if (retryCount.current < maxRetries) {
    retryCount.current++;
    console.log(`Retrying globe initialization (Attempt ${retryCount.current} of ${maxRetries})`);
    setTimeout(initializeGlobe, 1000 * retryCount.current); // Exponential backoff
  } else {
    console.error(`Failed to initialize globe after ${maxRetries} attempts`);
    createFallbackGlobe();
  }
};

const createFallbackGlobe = (
  globeRef: React.MutableRefObject<ThreeGlobe | null>,
  setError: React.Dispatch<React.SetStateAction<string | null>>
) => {
  console.warn("Creating fallback globe");
  try {
    const fallbackGlobe = new ThreeGlobe()
      .globeImageUrl("/images/fallback-globe-texture.jpg")
      .showAtmosphere(false)
      .showGraticules(true);

    globeRef.current = fallbackGlobe;
  } catch (error) {
    console.error("Failed to create fallback globe:", error);
    setError("Failed to create fallback globe. Please try reloading the page.");
  }
};

export const Globe: React.FC<WorldProps> = React.memo(({ globeConfig, data }) => {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const globeRef = useRef<ThreeGlobe | null>(null);
  const animationFrameId = useRef<number | null>(null);
  const retryCount = useRef<number>(0);
  const MAX_RETRIES = useRef<number>(3);
  const isMounted = useRef<boolean>(true);

  const mergedProps = useMemo(() => ({ ...defaultProps, ...globeConfig }), [globeConfig]);
  const hexPolygonColor = useMemo(() => mergedProps.polygonColor || defaultProps.polygonColor, [mergedProps.polygonColor]);

  const handleError = useCallback((error: unknown) => {
    if (!isMounted.current) return;
    const errorMessage = `Failed to initialize globe: ${error instanceof Error ? error.message : 'Unknown error'}`;
    console.error(errorMessage, error);
    setError(errorMessage);
    setIsLoading(false);
    if (globeRef.current?.parent) {
      globeRef.current.parent.remove(globeRef.current);
    }
    globeRef.current = null;

    if (data.length === 0) {
      setError("No data available for globe initialization. Please check your data source.");
      return;
    }

    if (retryCount.current < MAX_RETRIES.current) {
      retryCount.current++;
      console.log(`Retrying globe initialization (Attempt ${retryCount.current} of ${MAX_RETRIES.current})`);
      setTimeout(initializeGlobe, 1000 * Math.pow(2, retryCount.current)); // Exponential backoff
    } else {
      console.error(`Failed to initialize globe after ${MAX_RETRIES.current} attempts. Please try refreshing the page.`);
      createFallbackGlobe(globeRef, setError);
    }
  }, [data]);

  const configureGlobe = useCallback((globe: ThreeGlobe) => {
    try {
      globe
        .hexPolygonsData(countries.features)
        .hexPolygonResolution(3)
        .hexPolygonMargin(0.7)
        .showAtmosphere(mergedProps.showAtmosphere)
        .atmosphereColor(mergedProps.atmosphereColor)
        .atmosphereAltitude(mergedProps.atmosphereAltitude)
        .hexPolygonColor(hexPolygonColor)
        .arcsData(data)
        .arcColor(() => '#FFFFFF')
        .arcAltitude((d: unknown) => {
          const position = d as Position;
          return isValidNumber(position.arcAlt) ? position.arcAlt : 0;
        })
        .arcStroke(() => [0.32, 0.28, 0.3][Math.floor(Math.random() * 3)])
        .arcDashLength(mergedProps.arcLength)
        .arcDashGap(4)
        .arcDashAnimateTime(mergedProps.arcTime)
        .pointsData(data)
        .pointColor((d: unknown) => {
          const position = d as Position;
          return position.color && typeof position.color === 'string' && position.color.trim() !== '' ? position.color : '#FFFFFF';
        })
        .pointsMerge(true)
        .pointAltitude(0.0)
        .pointRadius(mergedProps.pointSize);

      globe.renderOrder = Math.floor(Math.random() * 1000);
    } catch (error) {
      console.error("Error configuring globe:", error);
      throw new Error(`Failed to configure globe: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [data, mergedProps, hexPolygonColor]);

  const initializeGlobe = useCallback(() => {
    if (!isMounted.current) return;
    if (data.length === 0) {
      setError("Globe data is not available. Please try again later or check your data source.");
      setIsLoading(false);
      return;
    }

    try {
      if (!globeRef.current) {
        globeRef.current = new ThreeGlobe();
      }
      const globe = globeRef.current;

      configureGlobe(globe);

      const globeObj = globe as unknown as { __globeObjRef?: { geometry?: THREE.BufferGeometry } };
      if (globeObj.__globeObjRef?.geometry instanceof THREE.BufferGeometry) {
        const geometry = globeObj.__globeObjRef.geometry;
        const result = fixGeometryNaNs(geometry);
        if (result.nanCount > 0) {
          console.warn(`Fixed ${result.nanCount} NaN/Infinite values in globe geometry`, result.fixedPositions);
        }

        if (!geometry.boundingSphere || !isFinite(geometry.boundingSphere.radius)) {
          console.warn("Invalid bounding sphere. Attempting to recompute...");
          geometry.computeBoundingSphere();
          if (!geometry.boundingSphere || !isFinite(geometry.boundingSphere.radius)) {
            handleBoundingError(geometry);
          }
        }

        if (!isValidGeometry(geometry)) {
          throw new Error("Failed to create a valid geometry after all fixes. Please try refreshing the page.");
        }

        logFinalBoundingSphere(geometry);
      } else {
        throw new Error("Globe geometry is not available or not a BufferGeometry. Please try refreshing the page.");
      }

      retryCount.current = 0;
      setError(null);
      setIsLoading(false);
    } catch (error) {
      handleError(error);
    }
  }, [data, configureGlobe, handleError]);

  const animate = useCallback(() => {
    if (globeRef.current && isMounted.current) {
      globeRef.current.rotation.y += mergedProps.autoRotateSpeed || 0.002;
      animationFrameId.current = requestAnimationFrame(animate);
    }
  }, [mergedProps.autoRotateSpeed]);

  const handleContextLoss = useCallback((event: Event) => {
    if (event instanceof WebGLContextEvent) {
      event.preventDefault();
      console.warn("WebGL context lost. Attempting to restore...");
      setError("WebGL context lost. Attempting to restore... Please wait.");
      setIsLoading(true);
      if (globeRef.current) {
        const material = globeRef.current.globeMaterial();
        if (material) {
          material.dispose();
        }
      }
      initializeGlobe();
    }
  }, [initializeGlobe]);

  const handleContextRestored = useCallback(() => {
    console.log("WebGL context restored.");
    setError(null);
    setIsLoading(false);
    initializeGlobe();
  }, [initializeGlobe]);

  useEffect(() => {
    const canvas = document.querySelector('canvas');
    if (canvas) {
      canvas.addEventListener('webglcontextlost', handleContextLoss);
      canvas.addEventListener('webglcontextrestored', handleContextRestored);
    }

    initializeGlobe();

    if (mergedProps.autoRotate) {
      animate();
    }

    return () => {
      isMounted.current = false;
      if (canvas) {
        canvas.removeEventListener('webglcontextlost', handleContextLoss);
        canvas.removeEventListener('webglcontextrestored', handleContextRestored);
      }
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
      if (globeRef.current) {
        if (globeRef.current.parent) {
          globeRef.current.parent.remove(globeRef.current);
        }
        globeRef.current.arcsData([]);
        globeRef.current.pointsData([]);
        globeRef.current.hexPolygonsData([]);
        globeRef.current = null;
      }
    };
  }, [initializeGlobe, animate, mergedProps.autoRotate, handleContextLoss, handleContextRestored]);

  const retryInitialization = useCallback(() => {
    retryCount.current = 0;
    setIsLoading(true);
    initializeGlobe();
  }, [initializeGlobe]);

  if (error) {
    return (
      <ErrorBoundary fallback={<ErrorMessage message={error} />}>
        <div role="alert" aria-live="assertive">
          <p className="mb-4">{error}</p>
          <button
            onClick={retryInitialization}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            aria-label="Retry loading the globe"
          >
            Retry
          </button>
        </div>
      </ErrorBoundary>
    );
  }

  if (isLoading) {
    return <LoadingSpinner message="Rendering Globe..." aria-label="Loading 3D Globe" />;
  }

  return (
    <ErrorBoundary
      fallback={
        <ErrorMessage
          message="An error occurred while rendering the Globe. Please try refreshing the page."
          onRetry={retryInitialization}
        />
      }
    >
      {globeRef.current && (
        <primitive
          object={globeRef.current}
          aria-label="Interactive 3D Globe"
          aria-roledescription="Interactive 3D visualization of Earth with data points and arcs"
        />
      )}
    </ErrorBoundary>
  );
});

Globe.displayName = 'Globe';

const validatePositiveNumber = (value: number | undefined, defaultValue: number, propertyName: string): number => {
  if (typeof value !== 'number' || !isFinite(value) || value <= 0) {
    console.warn(`Invalid ${propertyName}: ${value}. Using default value: ${defaultValue}`);
    return defaultValue;
  }
  return value;
};

const calculateRingRepeatPeriod = (): number => {
  const { arcTime, arcLength, rings } = defaultProps;
  if (typeof arcTime === 'number' && typeof arcLength === 'number' && typeof rings === 'number' && rings !== 0) {
    return (arcTime * arcLength) / rings;
  }
  return 2000; // Default value if any property is invalid
};

const createRingColorFunction = (): ((e: Position | number) => string) => {
  const defaultColor = 'rgba(255,255,255,0.5)';

  const validateColor = (color: unknown): string => {
    if (typeof color === 'string' && color.trim() !== '') {
      try {
        new THREE.Color(color);
        return color;
      } catch (error) {
        console.warn(`Invalid color string: ${color}. Using default.`, error);
      }
    }
    console.warn(`Invalid color value: ${color}. Using default.`);
    return defaultColor;
  };

  return (e: Position | number): string => {
    if (typeof e === 'number') {
      console.warn('Unexpected number input for ring color. Using default.');
      return defaultColor;
    }

    if (typeof e !== 'object' || e === null) {
      console.error('Invalid input for ring color function:', e);
      return defaultColor;
    }

    const position = e as Position;
    const color = position.color;

    if (typeof color === 'function') {
      try {
        // Type guard to ensure color is a function that takes a Position and returns a string
        const colorFunc = color as (pos: Position) => string;
        const result = colorFunc(0 as unknown as Position); // Use 0 as a default time value
        return typeof result === 'string' ? validateColor(result) : defaultColor;
      } catch (error) {
        console.error('Error in ring color function:', error);
        return defaultColor;
      }
    } else if (typeof color === 'string') {
      return validateColor(color);
    } else if (color && typeof color === 'object' && 'isColor' in color) {
      return (color as THREE.Color).getStyle();
    } else {
      console.warn('Invalid color type:', typeof color);
      return defaultColor;
    }
  };
};

const safeRingColorFunction = createRingColorFunction();








export function WebGLRendererConfig() {
  const { gl, size } = useThree();

  useEffect(() => {
    if (typeof window !== 'undefined' && gl) {
      gl.setPixelRatio(window.devicePixelRatio);
      gl.setSize(size.width, size.height);
      gl.setClearColor(0x000000, 0); // Black with full transparency
    }
  }, [gl, size]);

  return null;
}

const World: React.FC<WorldProps> = React.memo(({ globeConfig, data }) => {
  const [error, setError] = useState<Error | null>(null);
  const [webGLAvailable, setWebGLAvailable] = useState(true);
  const [isContextLost, setIsContextLost] = useState(false);

  const handleError = useCallback((error: Error) => {
    console.error("Error in World component:", error);
    setError(error);
  }, []);

  const lightPositions = useMemo(() => ({
    directionalLeft: new THREE.Vector3(-400, 100, 400),
    directionalTop: new THREE.Vector3(-200, 500, 200),
    point: new THREE.Vector3(-200, 500, 200)
  }), []);

  const orbitControlsProps = useMemo(() => ({
    enablePan: false,
    enableZoom: false,
    minDistance: cameraZ,
    maxDistance: cameraZ,
    autoRotateSpeed: globeConfig.autoRotateSpeed ?? 1,
    autoRotate: globeConfig.autoRotate ?? false,
    minPolarAngle: Math.PI / 3.5,
    maxPolarAngle: Math.PI - Math.PI / 3
  }), [globeConfig.autoRotateSpeed, globeConfig.autoRotate]);

  const checkWebGLAvailability = useCallback(() => {
    if (typeof window === 'undefined') return; // Check for SSR
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      setWebGLAvailable(!!gl);
    } catch (e) {
      console.error("WebGL initialization error:", e);
      setWebGLAvailable(false);
    }
  }, []);

  useEffect(() => {
    checkWebGLAvailability();
  }, [checkWebGLAvailability]);

  const handleContextLoss = useCallback((event: WebGLContextEvent) => {
    event.preventDefault();
    console.warn("WebGL context lost. Attempting to restore...");
    setIsContextLost(true);
    setError(new Error("WebGL context lost. Please wait while we attempt to restore it."));
  }, []);

  const handleContextRestored = useCallback(() => {
    console.log("WebGL context restored.");
    setIsContextLost(false);
    setError(null);
    checkWebGLAvailability();
  }, [checkWebGLAvailability]);

  useEffect(() => {
    const canvas = document.querySelector('canvas');
    if (canvas) {
      canvas.addEventListener('webglcontextlost', handleContextLoss as EventListener);
      canvas.addEventListener('webglcontextrestored', handleContextRestored as EventListener);
    }
    return () => {
      if (canvas) {
        canvas.removeEventListener('webglcontextlost', handleContextLoss as EventListener);
        canvas.removeEventListener('webglcontextrestored', handleContextRestored as EventListener);
      }
    };
  }, [handleContextLoss, handleContextRestored]);

  const handleRetry = useCallback(() => {
    if (isContextLost) {
      const canvas = document.querySelector('canvas');
      if (canvas) {
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (gl) {
          (gl as WebGLRenderingContext).getExtension('WEBGL_lose_context')?.restoreContext();
        }
      }
    } else {
      checkWebGLAvailability();
    }
  }, [isContextLost, checkWebGLAvailability]);

  if (!webGLAvailable) {
    return (
      <ErrorMessage
        message="WebGL is not available in your browser. Please try a different browser or device."
        onRetry={handleRetry}
      />
    );
  }

  if (error) {
    return (
      <ErrorMessage
        message={`Failed to render World: ${error.message}`}
        onRetry={handleRetry}
      />
    );
  }

  return (
    <ErrorBoundary
      fallbackRender={({ error, resetErrorBoundary }) => (
        <ErrorMessage
          message={`Failed to render World: ${error.message}`}
          onRetry={resetErrorBoundary}
        />
      )}
      onError={handleError}
    >
      <Canvas
        camera={{ position: [0, 0, cameraZ], fov: 50, aspect, near: 180, far: 1800 }}
        gl={{
          alpha: true,
          antialias: true,
          preserveDrawingBuffer: true,
          powerPreference: 'high-performance'
        }}
        onCreated={({ gl, scene }) => {
          gl.setClearColor(new THREE.Color('#000000'), 0);
          gl.setPixelRatio(Math.min(window.devicePixelRatio, 2));
          scene.fog = new THREE.Fog(0xffffff, 400, 2000);
        }}
      >
        <fog attach="fog" args={[0xffffff, 400, 2000]} />
        <ambientLight color={globeConfig.ambientLight} intensity={0.6} />
        <directionalLight
          color={globeConfig.directionalLeftLight}
          position={lightPositions.directionalLeft}
        />
        <directionalLight
          color={globeConfig.directionalTopLight}
          position={lightPositions.directionalTop}
        />
        <pointLight
          color={globeConfig.pointLight}
          position={lightPositions.point}
          intensity={0.8}
        />
        <Suspense fallback={<LoadingSpinner message="Rendering Globe..." aria-label="Loading 3D Globe" />}>
          <Globe globeConfig={globeConfig} data={data} />
        </Suspense>
        <OrbitControls {...orbitControlsProps} />
      </Canvas>
    </ErrorBoundary>
  );
});

World.displayName = 'World';

export { World };
