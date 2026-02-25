import React, { useState, useMemo } from 'react';
import {
  AreaChart,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Area,
  Legend,
} from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from './ui/chart';

interface AggregationResult {
  groupBy: string | string[];
  groupValue: string | number | Record<string, string | number>;
  count: number;
  sum?: number;
  avg?: number;
  min?: number;
  max?: number;
}

interface FelixAggregationChartProps {
  data: AggregationResult[];
  groupByField: string | string[];
  aggregationType?: string;
}

const COLORS = [
  '#3b82f6', // blue-500
  '#06b6d4', // cyan-500
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#6366f1', // indigo-500
  '#8b5cf6', // violet-500
  '#ec4899', // pink-500
  '#14b8a6', // teal-500
  '#84cc16', // lime-500
  '#f97316', // orange-500
];

export const FelixAggregationChart: React.FC<FelixAggregationChartProps> = ({
  data,
  groupByField,
  aggregationType = 'count',
}) => {
  const [activeLine, setActiveLine] = useState<string | null>(null);

  if (!data || data.length === 0) {
    return null;
  }

  const isMultiDimensional = Array.isArray(groupByField);
  const groupByFields = isMultiDimensional ? groupByField : [groupByField];

  const metricKey = aggregationType === 'sum' ? 'sum' :
                    aggregationType === 'avg' ? 'avg' :
                    aggregationType === 'min' ? 'min' :
                    aggregationType === 'max' ? 'max' :
                    'count';

  const metricLabel = aggregationType === 'sum' ? 'Sum' :
                      aggregationType === 'avg' ? 'Average' :
                      aggregationType === 'min' ? 'Min' :
                      aggregationType === 'max' ? 'Max' :
                      'Count';

  // Transform data for multi-line chart
  const { chartData, seriesKeys, chartConfig, seriesData } = useMemo(() => {
    if (!isMultiDimensional || groupByFields.length < 2) {
      // Single dimension - show as single line
      const singleData = data.map((item) => {
        const name = String(item.groupValue);
        return {
          name,
          value: item[metricKey] ?? item.count,
        };
      });

      // Sort by name (useful for years) - numeric if possible, otherwise alphabetic
      singleData.sort((a, b) => {
        const numA = Number(a.name);
        const numB = Number(b.name);
        if (!isNaN(numA) && !isNaN(numB)) {
          return numA - numB;
        }
        return a.name.localeCompare(b.name);
      });

      return {
        chartData: singleData,
        seriesKeys: ['value'],
        chartConfig: {
          value: {
            label: metricLabel,
            color: COLORS[0],
          },
        },
        seriesData: new Map([['value', singleData]]),
      };
    }

    // Multi-dimensional - create multiple lines
    // First field = series (lines), Second field = x-axis
    const seriesMap = new Map<string, Map<string, number>>();
    const xAxisValues = new Set<string>();

    data.forEach((item) => {
      if (typeof item.groupValue === 'object' && !Array.isArray(item.groupValue)) {
        const groupValueObj = item.groupValue as Record<string, string | number>;
        const seriesKey = String(groupValueObj[groupByFields[0]]);
        const xAxisKey = String(groupValueObj[groupByFields[1]]);
        const value = item[metricKey] ?? item.count;

        if (!seriesMap.has(seriesKey)) {
          seriesMap.set(seriesKey, new Map());
        }
        seriesMap.get(seriesKey)!.set(xAxisKey, value);
        xAxisValues.add(xAxisKey);
      }
    });

    // Sort x-axis values (useful for years)
    const sortedXAxis = Array.from(xAxisValues).sort((a, b) => {
      const numA = Number(a);
      const numB = Number(b);
      if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB;
      }
      return a.localeCompare(b);
    });

    // Build chart data
    const multiData = sortedXAxis.map((xValue) => {
      const dataPoint: Record<string, any> = { name: xValue };
      seriesMap.forEach((values, seriesKey) => {
        dataPoint[seriesKey] = values.get(xValue) ?? 0;
      });
      return dataPoint;
    });

    // Build series keys and config
    const keys = Array.from(seriesMap.keys());
    const config: Record<string, { label: string; color: string }> = {};
    const seriesDataMap = new Map<string, Array<{ name: string; value: number }>>();
    
    keys.forEach((key, index) => {
      config[key] = {
        label: key,
        color: COLORS[index % COLORS.length],
      };
      
      // Store individual series data for detail view
      const seriesValues = sortedXAxis.map((xValue) => ({
        name: xValue,
        value: seriesMap.get(key)?.get(xValue) ?? 0,
      }));
      seriesDataMap.set(key, seriesValues);
    });

    return {
      chartData: multiData,
      seriesKeys: keys,
      chartConfig: config,
      seriesData: seriesDataMap,
    };
  }, [data, isMultiDimensional, groupByFields, metricKey]);

  const groupByDisplay = isMultiDimensional ? groupByFields.join(' + ') : groupByFields[0];

  const handleLineClick = (dataKey: string) => {
    setActiveLine(activeLine === dataKey ? null : dataKey);
  };

  const handleLegendClick = (e: any) => {
    if (e.dataKey) {
      handleLineClick(e.dataKey);
    }
  };

  return (
    <div className="felix-chart-container" data-tutorial="aggregation-chart">
      <div className="felix-chart-header">
        <span className="felix-chart-title">
          📊 {isMultiDimensional ? 'Multi-Dimensional ' : ''}Trend Analysis
        </span>
        <span className="felix-chart-subtitle">
          {metricLabel} by {groupByDisplay}
        </span>
      </div>
      
      <div className="felix-chart-wrapper felix-chart-white-bg">
        <ChartContainer config={chartConfig} className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="name"
                angle={-45}
                textAnchor="end"
                height={100}
                tick={{ fontSize: 12, fill: '#6b7280' }}
              />
              <YAxis 
                tick={{ fill: '#6b7280' }}
                label={{ value: metricLabel, angle: -90, position: 'insideLeft', fill: '#6b7280' }}
              />
              <ChartTooltip
                content={<ChartTooltipContent indicator="line" />}
              />
              
              {seriesKeys.length > 1 && (
                <Legend 
                  onClick={handleLegendClick}
                  wrapperStyle={{ cursor: 'pointer', paddingTop: '20px' }}
                />
              )}
              
              {/* Render an area for each series */}
              {seriesKeys.map((key, index) => (
                <Area
                  key={key}
                  type="linear"
                  dataKey={key}
                  stroke={chartConfig[key]?.color || COLORS[index % COLORS.length]}
                  fill={chartConfig[key]?.color || COLORS[index % COLORS.length]}
                  fillOpacity={activeLine === null || activeLine === key ? 0.3 : 0.1}
                  strokeWidth={activeLine === null || activeLine === key ? 2.5 : 1.5}
                  opacity={activeLine === null || activeLine === key ? 1 : 0.2}
                  dot={{
                    r: activeLine === null || activeLine === key ? 4 : 2,
                    fill: chartConfig[key]?.color || COLORS[index % COLORS.length],
                    strokeWidth: 2,
                    stroke: '#ffffff',
                    style: { cursor: 'pointer' },
                  }}
                  activeDot={{
                    r: 6,
                    fill: chartConfig[key]?.color || COLORS[index % COLORS.length],
                    strokeWidth: 2,
                    stroke: '#ffffff',
                    style: { cursor: 'pointer' },
                    onClick: () => handleLineClick(key),
                  }}
                  name={chartConfig[key]?.label || key}
                  onClick={() => handleLineClick(key)}
                  style={{ cursor: 'pointer' }}
                  label={
                    activeLine === key
                      ? {
                          position: 'top',
                          fill: chartConfig[key]?.color || COLORS[index % COLORS.length],
                          fontSize: 13,
                          fontWeight: 700,
                          formatter: (value: number) => value.toLocaleString(),
                          content: (props: any) => {
                            const { x, y, value } = props;
                            if (value === undefined || value === null) return null;
                            
                            return (
                              <g>
                                <rect
                                  x={x - 25}
                                  y={y - 20}
                                  width={50}
                                  height={18}
                                  fill="white"
                                  stroke={chartConfig[key]?.color || COLORS[index % COLORS.length]}
                                  strokeWidth={1.5}
                                  rx={4}
                                  opacity={0.95}
                                />
                                <text
                                  x={x}
                                  y={y - 8}
                                  textAnchor="middle"
                                  fill={chartConfig[key]?.color || COLORS[index % COLORS.length]}
                                  fontSize={13}
                                  fontWeight={700}
                                >
                                  {value.toLocaleString()}
                                </text>
                              </g>
                            );
                          },
                        }
                      : false
                  }
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>
      
      {activeLine && seriesData.has(activeLine) && (
        <div className="felix-chart-detail-panel">
          <div className="felix-chart-detail-header">
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-sm" 
                style={{ backgroundColor: chartConfig[activeLine]?.color }}
              />
              <strong className="text-lg">{chartConfig[activeLine]?.label || activeLine}</strong>
            </div>
            <button 
              onClick={() => setActiveLine(null)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              ✕ Close
            </button>
          </div>
          
          <div className="felix-chart-detail-grid">
            {seriesData.get(activeLine)?.map((point) => (
              <div key={point.name} className="felix-chart-detail-item">
                <span className="felix-chart-detail-label">{point.name}</span>
                <span className="felix-chart-detail-value">
                  {point.value.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
          
          <div className="felix-chart-detail-summary">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total:</span>
              <span className="text-lg font-semibold">
                {seriesData.get(activeLine)
                  ?.reduce((sum, point) => sum + point.value, 0)
                  .toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FelixAggregationChart;
