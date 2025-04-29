import React, { useRef, useEffect, useCallback, useState, useMemo } from 'react';
// import { debounce } from 'lodash-es'; // Removed lodash dependency

// Custom Debounce Hook
function useDebounce<T extends (...args: any[]) => any>(
    callback: T,
    delay: number
): (...args: Parameters<T>) => void {
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        // Cleanup function to clear the timeout if the component unmounts
        // or if the callback/delay changes (though we memoize the function itself)
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []); // Empty dependency array means cleanup runs on unmount

    const debouncedCallback = useCallback((...args: Parameters<T>) => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
            callback(...args);
        }, delay);
    }, [callback, delay]);

    // Return a function that can cancel the pending timeout
    // (Useful if needed, though not strictly required by our current usage)
    // We'll return just the debounced function for simplicity here.
    // return { debouncedCallback, cancel: () => { /* ... */ } };
    return debouncedCallback;
}

// Define the shape of the data points expected by the chart
interface ChartDataPoint {
    month: string; // e.g., "Jan", "Feb"
    incoming: number;
    outgoing: number;
    invested: number;
    // Add year and numeric month for data attributes
    year: number;
    numericMonth: number;
}

interface CashFlowChartProps {
    data: ChartDataPoint[];
    // selectedMonthAbbr: string; // This prop might become redundant if we pass year/month
    isLoading: boolean;
    className?: string;
    // Pass selected year/month for highlighting and identifying the correct element
    selectedYear: number;
    selectedMonth: number;
    // Callback to notify parent when the centered month changes via scroll
    onMonthSelect: (year: number, month: number) => void;
}

const CashFlowChart: React.FC<CashFlowChartProps> = ({
    data,
    isLoading,
    className,
    selectedYear,
    selectedMonth,
    onMonthSelect
}) => {
    // Ref for the scrollable container
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    // Ref to track if scrolling is programmatic or user-initiated
    const isProgrammaticScroll = useRef(false);
    // Ref to track if interaction (touch/mouse down) is active
    const isInteracting = useRef(false);

    // State to store the scroll container's width
    const [containerWidth, setContainerWidth] = useState<number>(0);

    // Find the index of the selected month for centering and highlighting
    const selectedMonthIndex = data.findIndex(d => d.year === selectedYear && d.numericMonth === selectedMonth);

    // Constants for chart dimensions and spacing
    const pointSpacing = 60; // Spacing between data points in pixels
    // Ensure minimum width even with few data points for better centering
    const minPointsForWidthCalc = 5;
    const totalPointsWidth = Math.max(data.length, minPointsForWidthCalc) * pointSpacing;
    const svgHeight = 300;

    // Calculate padding based on container width (memoized)
    const padding = useMemo(() => {
        // Use half container width for left/right padding to allow centering first/last items
        // Ensure containerWidth is positive, provide fallback if 0 (e.g., initial render)
        const sidePadding = containerWidth > 0 ? containerWidth / 2 : pointSpacing / 2; // Fallback to pointSpacing based padding
        return {
            top: 40,
            // Ensure padding isn't excessively large if pointSpacing is small relative to width
            right: Math.max(pointSpacing / 2, sidePadding),
            bottom: 50,
            left: Math.max(pointSpacing / 2, sidePadding),
        };
    }, [containerWidth, pointSpacing]);

    // Calculate SVG width based on points and dynamic padding (memoized)
    const calculatedSvgWidth = totalPointsWidth + padding.left + padding.right;
    const chartWidth = calculatedSvgWidth - padding.left - padding.right;
    // Memoize chartHeight as well, depends on padding
    const chartHeight = useMemo(() => svgHeight - padding.top - padding.bottom, [svgHeight, padding.top, padding.bottom]);

    // Calculate X position for a given index
    const xScale = useCallback((index: number) => {
        // Center points within the available chartWidth
        return padding.left + pointSpacing / 2 + index * pointSpacing;
    }, [padding.left, pointSpacing]);

    // Effect to measure container width and observe resizes
    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        // Initial measurement
        setContainerWidth(container.clientWidth);

        // Observe resizing
        const resizeObserver = new ResizeObserver(entries => {
            for (let entry of entries) {
                if (entry.target === container) {
                    setContainerWidth(entry.contentRect.width);
                }
            }
        });

        resizeObserver.observe(container);

        // Cleanup observer on unmount
        return () => resizeObserver.disconnect();
    }, []); // Run only once on mount

    // Effect to scroll to center the selected month
    useEffect(() => {
        // Don't auto-scroll if user is actively interacting or if data is empty
        if (scrollContainerRef.current && selectedMonthIndex !== -1 && !isInteracting.current && data.length > 0) {
            const targetX = xScale(selectedMonthIndex);
            const containerWidth = scrollContainerRef.current.clientWidth;
            const targetScrollLeft = targetX - containerWidth / 2;

            // console.log(`Scrolling to center month ${selectedMonth}/${selectedYear} at index ${selectedMonthIndex}, X: ${targetX}, targetScrollLeft: ${targetScrollLeft}`);

            // Mark scroll as programmatic
            isProgrammaticScroll.current = true;
            scrollContainerRef.current.scrollTo({
                left: targetScrollLeft,
                behavior: 'smooth' // Use smooth scrolling
            });

            // Reset the flag after a short delay to allow smooth scroll animation
            const timer = setTimeout(() => {
                isProgrammaticScroll.current = false;
            }, 500); // Adjust timing if needed based on scroll duration

            return () => clearTimeout(timer);
        }
    }, [selectedYear, selectedMonth, selectedMonthIndex, data, xScale, containerWidth]); // Rerun when selection or data changes

    // Function to find closest point and trigger selection update
    const triggerSnap = useCallback(() => {
        // Check required conditions first
        // Check containerWidth > 0 as padding/xScale depend on it
        if (isProgrammaticScroll.current || !scrollContainerRef.current || data.length === 0 || containerWidth <= 0) {
            console.log(`Snap cancelled: Programmatic=${isProgrammaticScroll.current}, No container=${!scrollContainerRef.current}, No data=${data.length === 0}, Invalid Width=${containerWidth <= 0}`);
            return; // Don't snap during programmatic scroll, or if refs/data/width invalid
        }

        console.log("Executing triggerSnap");

        const container = scrollContainerRef.current;
        // Recalculate center based on current containerWidth state
        const scrollCenter = container.scrollLeft + containerWidth / 2;

        // Find the data point closest to the center
        let closestIndex = -1;
        let minDistance = Infinity;

        data.forEach((_, index) => {
            const pointX = xScale(index);
            const distance = Math.abs(pointX - scrollCenter);
            if (distance < minDistance) {
                minDistance = distance;
                closestIndex = index;
            }
        });

        if (closestIndex !== -1) {
            const centeredDataPoint = data[closestIndex];
            if (centeredDataPoint.year !== selectedYear || centeredDataPoint.numericMonth !== selectedMonth) {
                console.log(`Snap Trigger: Selecting ${centeredDataPoint.numericMonth}/${centeredDataPoint.year}`);
                onMonthSelect(centeredDataPoint.year, centeredDataPoint.numericMonth);
                // The useEffect listening to selectedYear/Month will handle the smooth scroll centering.
            } else {
                // If the closest is already selected, force a re-center scroll to ensure alignment
                console.log("Snap Trigger: Closest already selected, ensuring it is centered.");
                const targetX = xScale(closestIndex);
                const containerWidth = container.clientWidth; // Use current width for centering calc
                const targetScrollLeft = targetX - containerWidth / 2;
                // Check if already centered enough to avoid tiny adjustments
                if (Math.abs(container.scrollLeft - targetScrollLeft) > 1) {
                    isProgrammaticScroll.current = true;
                    container.scrollTo({ left: targetScrollLeft, behavior: 'smooth' });
                    setTimeout(() => { isProgrammaticScroll.current = false; }, 500);
                }
            }
        }
    }, [data, xScale, onMonthSelect, selectedYear, selectedMonth, containerWidth]); // Dependencies for snap logic

    // Raw scroll end handler logic (to be debounced)
    const handleScrollEnd = useCallback(() => {
        console.log("Debounced scroll end triggered.");
        // Only trigger snap if the user is NOT currently interacting
        if (!isInteracting.current) {
            triggerSnap();
        } else {
            console.log("Debounced scroll end ignored: User still interacting.");
        }
    }, [triggerSnap]); // Depends on triggerSnap

    // Debounced scroll handler using the custom hook
    const debouncedScrollEndHandler = useDebounce(handleScrollEnd, 150); // Debounce delay (might need tuning)

    // Interaction end handler (touch/mouse up)
    const handleInteractionEnd = useCallback(() => {
        console.log("Interaction end detected (touchend/mouseup/mouseleave).");
        if (!isInteracting.current) return; // Avoid redundant calls
        isInteracting.current = false;
         // Note: Cancelling the custom debounce isn't straightforward without modifying the hook
        // to return a cancel function. The timeout behavior should mostly work.
        setTimeout(triggerSnap, 50); // 50ms delay before snapping
    }, [triggerSnap]);

    // Interaction start handler (touch/mouse down)
    const handleInteractionStart = useCallback(() => {
        console.log("Interaction start detected (touchstart/mousedown).");
        isInteracting.current = true;
        // Note: Cancelling custom debounce isn't straightforward here either.
        if (isProgrammaticScroll.current) {
            console.log("Interaction started, clearing programmatic scroll flag.");
            isProgrammaticScroll.current = false;
        }
    }, []); // No dependencies needed as it only sets refs

    // Effect to attach/detach listeners
    useEffect(() => {
        const container = scrollContainerRef.current;
        if (container) {
            // Scroll listener triggers debounce
            container.addEventListener('scroll', debouncedScrollEndHandler);

            // Interaction listeners
            container.addEventListener('touchstart', handleInteractionStart, { passive: true });
            container.addEventListener('mousedown', handleInteractionStart);
            window.addEventListener('touchend', handleInteractionEnd);
            window.addEventListener('mouseup', handleInteractionEnd);
            container.addEventListener('mouseleave', handleInteractionEnd);

            // Listener to clear programmatic flag on user wheel scroll (when no interaction start/end fires)
             const scrollClearFlag = () => {
                if (isProgrammaticScroll.current && !isInteracting.current) {
                    console.log("Clearing programmatic scroll flag due to non-interactive scroll (wheel?).");
                    isProgrammaticScroll.current = false;
                }
            }
            container.addEventListener('scroll', scrollClearFlag);


            return () => {
                container.removeEventListener('scroll', debouncedScrollEndHandler);
                container.removeEventListener('touchstart', handleInteractionStart);
                container.removeEventListener('mousedown', handleInteractionStart);
                window.removeEventListener('touchend', handleInteractionEnd);
                window.removeEventListener('mouseup', handleInteractionEnd);
                container.removeEventListener('mouseleave', handleInteractionEnd);
                container.removeEventListener('scroll', scrollClearFlag);
            };
        }
    }, [debouncedScrollEndHandler, handleInteractionStart, handleInteractionEnd]); // Add handlers to dependencies

    // Cleanup debounce timeout ref on unmount (added for completeness)
    // The useDebounce hook itself handles its internal timeout cleanup,
    // but this ensures the ref is cleared if the component unmounts.
    // This part might be redundant depending on the exact hook implementation details.
    // useEffect(() => {
    //     return () => {
    //         // Assuming useDebounce stores timeoutId in a ref accessible way or handles internally
    //         // If useDebounce doesn't return a cancel, this might not be possible/needed.
    //     };
    // }, [debouncedScrollEndHandler]);

    return (
        // Scrollable container div
        <div
            ref={scrollContainerRef}
            // Height class removed by user, let parent control height or use svgHeight directly?
            // Re-add h-[300px] for consistency unless intended otherwise.
            className={`overflow-x-auto scrollbar-hide w-full relative ${className}`}
            style={{ scrollbarWidth: 'none' }}
        // Attach the throttled scroll handler
        // onScroll={throttledScrollHandler} // Event listener is added via useEffect now
        >
            {/* Centered Vertical Indicator Line - REMOVED FROM HERE */}
            {/* <div className="absolute top-0 bottom-0 left-1/2 transform -translate-x-1/2 w-px bg-primary z-10"></div> */}

            {/* Conditional Rendering: Check loading, data length, AND containerWidth */}
            {isLoading || data.length === 0 || containerWidth <= 0 ? (
                <p className="text-muted-foreground text-center absolute inset-0 flex items-center justify-center">
                    {isLoading ? 'Loading chart...' : 'No chart data available.'}
                </p>
            ) : (
                // Render SVG only if not loading, data exists, and container width is known
                <svg
                    width={calculatedSvgWidth}
                    height={svgHeight}
                    viewBox={`0 0 ${calculatedSvgWidth} ${svgHeight}`}
                    preserveAspectRatio="xMidYMid meet"
                    className="block"
                >
                    {/* Calculate necessary values using updated dimensions */}
                    {(() => {
                        // Find max value across all data points for scaling
                        const allValues = data.flatMap(d => [d.incoming, d.outgoing, d.invested]);
                        const maxValue = Math.max(...allValues, 1); // Ensure > 0

                        // Scaling function for Y axis
                        const yScale = (value: number) =>
                            padding.top + chartHeight - (value / maxValue) * chartHeight;

                        // Generate points strings for polylines
                        const incomingPoints = data.map((d, i) => `${xScale(i)},${yScale(d.incoming)}`).join(' ');
                        const investedPoints = data.map((d, i) => `${xScale(i)},${yScale(d.invested)}`).join(' ');
                        const outgoingPoints = data.map((d, i) => `${xScale(i)},${yScale(d.outgoing)}`).join(' ');

                        return (
                            <>

                                {/* Data Lines (Polylines) - Drawn after points and labels */}
                                {data.length > 1 && (
                                    <>
                                        <polyline
                                            fill="none"
                                            stroke="rgba(16, 185, 129, 0.8)" // Green with 80% opacity
                                            strokeWidth="4"
                                            points={incomingPoints}
                                        />
                                        <polyline
                                            fill="none"
                                            stroke="rgba(59, 130, 246, 0.8)" // Blue with 80% opacity
                                            strokeWidth="4"
                                            points={investedPoints}
                                        />
                                        <polyline
                                            fill="none"
                                            stroke="rgba(239, 68, 68, 0.8)" // Red with 80% opacity
                                            strokeWidth="4"
                                            points={outgoingPoints}
                                        />
                                    </>
                                )}

                                {/* Group elements per month */}
                                {data.map((d, i) => {
                                    const xPos = xScale(i);
                                    const isSelected = d.year === selectedYear && d.numericMonth === selectedMonth;

                                    return (
                                        <g key={`month-group-${d.numericMonth}-${d.year}`} data-month-year={`${d.numericMonth}-${d.year}`}>
                                            {/* X Axis Label (Month) */}
                                            <text
                                                // key={`label-${d.month}-${d.year}`} // Key moved to group
                                                x={xPos}
                                                y={padding.top + chartHeight + 42}
                                                textAnchor="middle"
                                                fontSize="16"
                                                fill={isSelected ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))"} // Use primary color for selected, gray for others
                                                fontWeight={isSelected ? 'bold' : 'normal'}
                                            >
                                                {d.month} {/* Display short month name */}
                                            </text>

                                            {/* Data Points (Circles) - Render within the group */}
                                            <circle key={`inc-${i}`} cx={xPos} cy={yScale(d.incoming)} r="8" fill="rgba(16, 185, 129, 0.8)" /* Green with 80% opacity */ />
                                            <circle key={`inv-${i}`} cx={xPos} cy={yScale(d.invested)} r="8" fill="rgba(59, 130, 246, 0.8)" /* Blue with 80% opacity */ />
                                            <circle key={`out-${i}`} cx={xPos} cy={yScale(d.outgoing)} r="8" fill="rgba(239, 68, 68, 0.8)" /* Red with 80% opacity */ />

                                            {/* Add unique keys for the inner circles */}
                                            <circle key={`inc-${i}-inner`} cx={xPos} cy={yScale(d.incoming)} r="4" fill="black" />
                                            <circle key={`inv-${i}-inner`} cx={xPos} cy={yScale(d.invested)} r="4" fill="black" />
                                            <circle key={`out-${i}-inner`} cx={xPos} cy={yScale(d.outgoing)} r="4" fill="black" />
                                            {/* Optional: Highlight selected points */}
                                            {isSelected && (
                                                <>
                                                    {/* Highlights remain fully opaque for emphasis */}
                                                    <circle cx={xPos} cy={yScale(d.incoming)} r="5" fill="#10B981" />
                                                    <circle cx={xPos} cy={yScale(d.invested)} r="5" fill="#3B82F6" />
                                                    <circle cx={xPos} cy={yScale(d.outgoing)} r="5" fill="#EF4444" />
                                                </>
                                            )}
                                        </g>
                                    );
                                })}
                            </>
                        );
                    })()}
                </svg>
            )}
        </div>
    );
};

export default CashFlowChart; 