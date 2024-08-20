import React, { useCallback, useState, useEffect, useMemo } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import ErrorMessage from '@/components/ErrorMessage';
import { gridItems } from "@/data";
import { BentoGrid, BentoGridItem, BentoGridItemProps } from "./ui/BentoGrid";
import { LoadingSpinner } from "@/components/LoadingSpinner";

type GridItem = Omit<BentoGridItemProps, 'size'> & { size?: BentoGridItemProps['size'] };

const isValidGridItem = (item: unknown): item is GridItem => {
  if (typeof item !== 'object' || item === null) return false;
  const gridItem = item as Partial<GridItem>;
  return (
    typeof gridItem.id === 'number' &&
    typeof gridItem.title === 'string' &&
    typeof gridItem.description === 'string' &&
    (gridItem.size === undefined ||
     (typeof gridItem.size === 'string' &&
      ['small', 'medium', 'large', 'wide', 'tall'].includes(gridItem.size)))
  );
};

const Grid: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [visibleItems, setVisibleItems] = useState<Required<GridItem>[]>([]);

  const validGridItems = useMemo(() =>
    gridItems.filter((item): item is Required<GridItem> => isValidGridItem(item)),
    []  // gridItems is imported and doesn't change
  );

  useEffect(() => {
    const loadGridItems = async () => {
      try {
        // Simulate async loading of grid items
        await new Promise(resolve => setTimeout(resolve, 1000));
        setVisibleItems(validGridItems.slice(0, 10)); // Initially load first 10 items
        setIsLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to load grid items'));
        setIsLoading(false);
      }
    };

    loadGridItems();
  }, [validGridItems]);

  const renderGridItems = useCallback(() => {
    return visibleItems.map((item) => (
      <BentoGridItem
        key={item.id}
        {...item}
        size={item.size || 'small'}
        className={`${item.className || ''} transition-all duration-300 ease-in-out hover:scale-[1.02] flex flex-col justify-between h-full`}
        imgClassName={`${item.imgClassName || ''} w-full h-full object-cover`}
        titleClassName={`${item.titleClassName || ''} mt-2 sm:mt-3 md:mt-4`}
      />
    ));
  }, [visibleItems]);

  const handleRetry = useCallback(() => {
    setIsLoading(true);
    setError(null);
    setVisibleItems([]);
  }, []);

  const handleLoadMore = useCallback(() => {
    const currentLength = visibleItems.length;
    const nextItems = validGridItems.slice(currentLength, currentLength + 10);
    setVisibleItems(prevItems => [...prevItems, ...nextItems]);
  }, [visibleItems, validGridItems]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen" role="status">
        <LoadingSpinner message="Loading grid items..." aria-label="Loading grid items" />
      </div>
    );
  }

  if (error) {
    return <ErrorMessage message={error.message} onRetry={handleRetry} />;
  }

  return (
    <ErrorBoundary
      FallbackComponent={({ error, resetErrorBoundary }) => (
        <ErrorMessage
          message="An error occurred while rendering the grid"
          details={error.message}
          onRetry={resetErrorBoundary}
        />
      )}
      onReset={handleRetry}
      onError={(error) => {
        console.error("Grid rendering error:", error);
        setError(error);
      }}
    >
      <section id="about" className="w-full px-4 sm:px-6 md:px-8 lg:px-16 xl:px-20 py-12 sm:py-16 md:py-20 lg:py-24 xl:py-32" aria-label="About section with grid layout">
        <BentoGrid>
          {renderGridItems()}
        </BentoGrid>
        {visibleItems.length < validGridItems.length && (
          <button
            onClick={handleLoadMore}
            className="mt-8 px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            aria-label="Load more grid items"
          >
            Load More
          </button>
        )}
      </section>
    </ErrorBoundary>
  );
};

export default React.memo(Grid);
