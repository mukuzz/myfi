import React, { useRef, useEffect } from 'react';
import CurrencyDisplay from './AmountDisplay'; // Assuming AmountDisplay is in the same folder or adjust path

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
}

const CashFlowChart: React.FC<CashFlowChartProps> = ({ data, isLoading, className, selectedYear, selectedMonth }) => {
    // Ref for the scrollable container
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Find the index of the selected month for the ReferenceLine and X-axis bolding
    // Use selectedYear and selectedMonth now
    const selectedMonthIndex = data.findIndex(d => d.year === selectedYear && d.numericMonth === selectedMonth);

    // Constants for chart dimensions and spacing
    const pointSpacing = 80; // Increased spacing between data points in pixels
    const minChartWidth = 200; // Minimum width of the SVG
    const calculatedSvgWidth = Math.max(minChartWidth, data.length * pointSpacing);
    const svgHeight = 250;
    const padding = { top: 20, right: 20, bottom: 30, left: 20 };
    const chartWidth = calculatedSvgWidth - padding.left - padding.right;
    const chartHeight = svgHeight - padding.top - padding.bottom;

    // Effect to scroll to the end initially or when data changes
    useEffect(() => {
        if (scrollContainerRef.current) {
            // Scroll to the far right
            scrollContainerRef.current.scrollLeft = scrollContainerRef.current.scrollWidth;
        }
    }, [data]); // Dependency array ensures this runs when data updates

    return (
        // Make the outer div scrollable horizontally
        <div
            ref={scrollContainerRef}
            className={`h-[250px] relative ${className}`}
        >
            {/* Add ms-overflow-style: none; for IE/Edge if needed via CSS */}
            {isLoading && data.length === 0 ? (
                <p className="text-muted-foreground text-center absolute inset-0 flex items-center justify-center">Loading chart...</p>
            ) : data.length > 0 ? (
                // Adjust SVG width dynamically, keep height fixed
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

                        // Create scaling functions using dynamic chartWidth
                        const xScale = (index: number) =>
                            padding.left + (data.length > 1 ? (index / (data.length - 1)) * chartWidth : chartWidth / 2);
                        const yScale = (value: number) =>
                            padding.top + chartHeight - (value / maxValue) * chartHeight;

                        // Generate points strings for polylines
                        const incomingPoints = data.map((d, i) => `${xScale(i)},${yScale(d.incoming)}`).join(' ');
                        const investedPoints = data.map((d, i) => `${xScale(i)},${yScale(d.invested)}`).join(' ');
                        const outgoingPoints = data.map((d, i) => `${xScale(i)},${yScale(d.outgoing)}`).join(' ');

                        return (
                            <>
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
                                                y={padding.top + chartHeight + 15}
                                                textAnchor="middle"
                                                fontSize="12"
                                                fill={isSelected ? "#F9FAFB" : "#9CA3AF"} // Highlight selected month label
                                                fontWeight={isSelected ? 'bold' : 'normal'}
                                            >
                                                {d.month} {/* Display short month name */}
                                            </text>

                                             {/* Data Points (Circles) - Render within the group */}
                                             <circle key={`inc-${i}`} cx={xPos} cy={yScale(d.incoming)} r="4" fill="#10B981" />
                                             <circle key={`inv-${i}`} cx={xPos} cy={yScale(d.invested)} r="4" fill="#3B82F6" />
                                             <circle key={`out-${i}`} cx={xPos} cy={yScale(d.outgoing)} r="4" fill="#EF4444" />
                                        </g>
                                    );
                                })}

                                {/* Data Lines (Polylines) - Drawn after points and labels */}
                                {data.length > 1 && (
                                    <>
                                        <polyline
                                            fill="none"
                                            stroke="#10B981" // green-500
                                            strokeWidth="2.5"
                                            points={incomingPoints}
                                        />
                                        <polyline
                                            fill="none"
                                            stroke="#3B82F6" // blue-500
                                            strokeWidth="2.5"
                                            points={investedPoints}
                                        />
                                        <polyline
                                            fill="none"
                                            stroke="#EF4444" // red-500
                                            strokeWidth="2.5"
                                            points={outgoingPoints}
                                        />
                                    </>
                                )}
                            </>
                        );
                    })()}
                </svg>
            ) : (
                 !isLoading && <p className="text-muted-foreground text-center absolute inset-0 flex items-center justify-center">No chart data available.</p>
            )}
        </div>
    );
};

export default CashFlowChart; 