import React, { useRef, useEffect, useCallback, useState, useMemo } from 'react';

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

    useEffect(() => {
        const container = scrollContainerRef.current;
        console.log('scrollToSelectedMonth');
        // Ensure container, width, and selected index are valid before scrolling
        if (container && containerWidth > 0 && selectedMonthIndex !== -1) {
            // Calculate the target x position of the selected month's center
            const targetX = xScale(selectedMonthIndex);
            // Calculate the scroll position needed to center this point
            const scrollLeft = targetX - containerWidth / 2;

            // Scroll smoothly to the calculated position
            container.scrollTo({
                left: scrollLeft,
                behavior: 'auto' // Use smooth scrolling
            });
            container.style.opacity = '1';
        }
        // Dependencies: scroll when selection, container size, scale function, or data changes
    }, [containerWidth]); // Added data dependency

    // Helper function to find the closest data point to the center of the viewport
    const findClosestDataPoint = useCallback(() => {
        const container = scrollContainerRef.current;
        if (!container || containerWidth <= 0) return null;

        const scrollCenter = container.scrollLeft + containerWidth / 2;

        // Find the index of the data point closest to the center
        let closestIndex = -1;
        let minDistance = Infinity;

        for (let i = 0; i < data.length; i++) {
            const pointX = xScale(i);
            const distance = Math.abs(pointX - scrollCenter);
            if (distance < minDistance) {
                minDistance = distance;
                closestIndex = i;
            }
        }

        if (closestIndex !== -1) {
            return {
                index: closestIndex,
                data: data[closestIndex]
            };
        }

        return null;
    }, [containerWidth, data, xScale]);

    // Effect to handle continuous scrolling and update selected month
    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container || data.length === 0 || !containerWidth) return;

        const handleScroll = () => {
            const closestPoint = findClosestDataPoint();
            if (closestPoint) {
                const { data: centeredData } = closestPoint;
                // Check if the centered month is actually different from the currently selected one
                // to avoid unnecessary updates if scroll ends near the already selected month.
                if (centeredData.year !== selectedYear || centeredData.numericMonth !== selectedMonth) {
                    onMonthSelect(centeredData.year, centeredData.numericMonth);
                }
            }
        }

        container.addEventListener('scroll', handleScroll);

        // Cleanup listener on unmount or when dependencies change
        return () => {
            container.removeEventListener('scroll', handleScroll);
        };
        // Dependencies: Re-run if data, dimensions, scale, or callbacks change
    }, [data, containerWidth, findClosestDataPoint, onMonthSelect, selectedYear, selectedMonth]);

    return (
        // Scrollable container div
        <div
            ref={scrollContainerRef}
            // Height class removed by user, let parent control height or use svgHeight directly?
            // Re-add h-[300px] for consistency unless intended otherwise.
            className={`overflow-x-auto scrollbar-hide w-full relative snap-x snap-mandatory ${className}`}
            style={{ scrollbarWidth: 'none', opacity: 0 }}
        >
            {/* Centered Vertical Indicator Line - REMOVED */}

            {/* Conditional Rendering: Check loading, data length, AND containerWidth */}
            {isLoading || data.length === 0 || containerWidth <= 0 ? (
                <p className="text-muted-foreground text-center absolute inset-0 flex items-center justify-center">
                    {isLoading ? 'Loading chart...' : 'No chart data available.'}
                </p>
            ) : (
                <>
                    {/* Render SVG only if not loading, data exists, and container width is known */}
                    <svg
                        width={calculatedSvgWidth}
                        height={svgHeight}
                        viewBox={`0 0 ${calculatedSvgWidth} ${svgHeight}`}
                        preserveAspectRatio="xMidYMid meet"
                        // Lower z-index if needed, though DOM order should place labels on top
                        className="block relative z-0"
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
                                    {/* Data Lines (Polylines) */}
                                    {data.length > 1 && (
                                        <>
                                            <polyline
                                                fill="none"
                                                stroke="rgba(16, 185, 129, 0.8)" // Green
                                                strokeWidth="4"
                                                points={incomingPoints}
                                            />
                                            <polyline
                                                fill="none"
                                                stroke="rgba(59, 130, 246, 0.8)" // Blue
                                                strokeWidth="4"
                                                points={investedPoints}
                                            />
                                            <polyline
                                                fill="none"
                                                stroke="rgba(239, 68, 68, 0.8)" // Red
                                                strokeWidth="4"
                                                points={outgoingPoints}
                                            />
                                        </>
                                    )}

                                    {/* Group elements per month (Circles only) */}
                                    {data.map((d, i) => {
                                        const xPos = xScale(i);
                                        const isSelected = d.year === selectedYear && d.numericMonth === selectedMonth;

                                        return (
                                            // Group remains useful for data attributes or future interactions
                                            <g key={`month-group-${d.numericMonth}-${d.year}`} data-month-year={`${d.numericMonth}-${d.year}`}>
                                                {/* REMOVED SVG Text Label */}

                                                {/* Data Points (Circles) */}
                                                <circle key={`inc-${i}`} cx={xPos} cy={yScale(d.incoming)} r="8" fill="rgba(16, 185, 129, 0.8)" />
                                                <circle key={`inv-${i}`} cx={xPos} cy={yScale(d.invested)} r="8" fill="rgba(59, 130, 246, 0.8)" />
                                                <circle key={`out-${i}`} cx={xPos} cy={yScale(d.outgoing)} r="8" fill="rgba(239, 68, 68, 0.8)" />
                                                <circle key={`inc-${i}-inner`} cx={xPos} cy={yScale(d.incoming)} r="4" fill="#FBFCFC" />
                                                <circle key={`inv-${i}-inner`} cx={xPos} cy={yScale(d.invested)} r="4" fill="#FBFCFC" />
                                                <circle key={`out-${i}-inner`} cx={xPos} cy={yScale(d.outgoing)} r="4" fill="#FBFCFC" />
                                                {isSelected && (
                                                    <>
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

                    {/* Absolutely Positioned HTML Month Labels */}
                    {data.map((d, i) => {
                        const xPos = xScale(i);
                        const isSelected = d.year === selectedYear && d.numericMonth === selectedMonth;
                        const labelWidth = 50; // Width of the label container
                        const labelHeight = 30; // Height of the label container

                        return (
                            <div
                                key={`html-label-${d.numericMonth}-${d.year}`}
                                className="absolute flex items-center justify-center snap-center"
                                style={{
                                    left: `${xPos}px`,
                                    bottom: `0px`,
                                    width: `${labelWidth}px`,
                                    height: `${labelHeight}px`,
                                    transform: 'translateX(-50%)', // Center horizontally
                                    zIndex: 1, // Ensure labels are clickable if needed, above SVG lines if they overlap
                                }}
                            >
                                <span
                                    className={`text-sm text-primary ${isSelected ? 'font-semibold' : ''}`}
                                >
                                    {d.month}
                                </span>
                            </div>
                        );
                    })}
                </>
            )}
        </div>
    );
};

export default CashFlowChart; 