import React from 'react';
import CurrencyDisplay from './AmountDisplay'; // Assuming AmountDisplay is in the same folder or adjust path

// Define the shape of the data points expected by the chart
interface ChartDataPoint {
    month: string; // e.g., "Jan", "Feb"
    incoming: number;
    outgoing: number;
    invested: number;
}

interface CashFlowChartProps {
    data: ChartDataPoint[];
    selectedMonthAbbr: string;
    isLoading: boolean;
}

const CashFlowChart: React.FC<CashFlowChartProps> = ({ data, selectedMonthAbbr, isLoading }) => {
    // Find the index of the selected month for the ReferenceLine and X-axis bolding
    const selectedMonthIndex = data.findIndex(d => d.month === selectedMonthAbbr);

    return (
        <div className="w-full h-[250px] relative">
            {isLoading && data.length === 0 ? (
                <p className="text-muted-foreground text-center absolute inset-0 flex items-center justify-center">Loading chart...</p>
            ) : data.length > 0 ? (
                <svg width="100%" height="100%" viewBox="0 0 400 250" preserveAspectRatio="xMidYMid meet">
                    {/* Calculate necessary values */}
                    {(() => {
                        const padding = { top: 20, right: 20, bottom: 30, left: 20 };
                        const chartWidth = 400 - padding.left - padding.right;
                        const chartHeight = 250 - padding.top - padding.bottom;

                        // Find max value across all data points for scaling
                        const allValues = data.flatMap(d => [d.incoming, d.outgoing, d.invested]);
                        // Ensure maxValue is at least 1 to avoid division by zero or flat lines if all values are 0
                        const maxValue = Math.max(...allValues, 1); 

                        // Create scaling functions (simple linear scale)
                        // Handle case where data might have only one point
                        const xScale = (index: number) => 
                            padding.left + (data.length > 1 ? (index / (data.length - 1)) * chartWidth : chartWidth / 2);
                        const yScale = (value: number) => 
                            padding.top + chartHeight - (value / maxValue) * chartHeight;

                        // Generate points strings for polylines
                        const incomingPoints = data.map((d, i) => `${xScale(i)},${yScale(d.incoming)}`).join(' ');
                        const investedPoints = data.map((d, i) => `${xScale(i)},${yScale(d.invested)}`).join(' ');
                        const outgoingPoints = data.map((d, i) => `${xScale(i)},${yScale(d.outgoing)}`).join(' ');

                        const selectedMonthX = selectedMonthIndex !== -1 ? xScale(selectedMonthIndex) : null;

                        return (
                            <>
                                {/* X Axis Labels (Months) */}
                                {data.map((d, i) => (
                                    <text
                                        key={`label-${d.month}`}
                                        x={xScale(i)}
                                        y={padding.top + chartHeight + 15} // Position below the chart area
                                        textAnchor="middle"
                                        fontSize="12"
                                        fill="#9CA3AF" // text-muted-foreground
                                        fontWeight={d.month === selectedMonthAbbr ? 'bold' : 'normal'}
                                    >
                                        {d.month}
                                    </text>
                                ))}

                                {/* Reference Line for Selected Month */}
                                {selectedMonthX !== null && (
                                    <line
                                        x1={selectedMonthX}
                                        y1={padding.top} // Start from the top padding edge
                                        x2={selectedMonthX}
                                        y2={padding.top + chartHeight} // End at the bottom padding edge
                                        stroke="#6B7280" // gray-500
                                        strokeWidth="1.5"
                                    />
                                )}
                                
                                {/* Data Lines (only draw if more than one point) */}
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

                                {/* Data Points (Circles) */}
                                {data.flatMap((d, i) => [
                                    <circle key={`inc-${i}`} cx={xScale(i)} cy={yScale(d.incoming)} r="4" fill="#10B981" />,
                                    <circle key={`inv-${i}`} cx={xScale(i)} cy={yScale(d.invested)} r="4" fill="#3B82F6" />,
                                    <circle key={`out-${i}`} cx={xScale(i)} cy={yScale(d.outgoing)} r="4" fill="#EF4444" />
                                ])}

                                {/* Optional: Marker on Reference Line intersection point at the bottom */}
                                {selectedMonthX !== null && (
                                    <circle 
                                        cx={selectedMonthX} 
                                        cy={padding.top + chartHeight} // Position at the bottom of the line
                                        r="5" 
                                        fill="#6B7280" // gray-500
                                    />
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