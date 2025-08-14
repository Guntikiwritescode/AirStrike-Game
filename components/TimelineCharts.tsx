'use client';

import { useState } from 'react';
import { TurnMetrics } from '@/lib/types';
import { calculateEVGapMetrics, calculateInfraRiskTrends } from '@/lib/analytics-export';
import { TrendingUp, TrendingDown, Target, AlertTriangle, BarChart3, Activity } from 'lucide-react';

interface TimelineChartsProps {
  timelineData: TurnMetrics[];
  width?: number;
  height?: number;
}

export default function TimelineCharts({ timelineData, width = 800, height = 400 }: TimelineChartsProps) {
  const [selectedChart, setSelectedChart] = useState<'score' | 'ev' | 'brier' | 'infra'>('score');

  if (timelineData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-slate-700 rounded-lg">
        <div className="text-center text-slate-400">
          <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No timeline data available</p>
          <p className="text-sm">Start playing to see charts</p>
        </div>
      </div>
    );
  }

  const chartTypes = [
    { id: 'score', label: 'Score', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'ev', label: 'EV Gap', icon: <Target className="w-4 h-4" /> },
    { id: 'brier', label: 'Brier Score', icon: <Activity className="w-4 h-4" /> },
    { id: 'infra', label: 'Infra Risk', icon: <AlertTriangle className="w-4 h-4" /> },
  ] as const;

  const renderChart = () => {
    switch (selectedChart) {
      case 'score':
        return <ScoreChart data={timelineData} width={width} height={height} />;
      case 'ev':
        return <EVGapChart data={timelineData} width={width} height={height} />;
      case 'brier':
        return <BrierChart data={timelineData} width={width} height={height} />;
      case 'infra':
        return <InfraRiskChart data={timelineData} width={width} height={height} />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Chart Selection */}
      <div className="flex space-x-2">
        {chartTypes.map((chart) => (
          <button
            key={chart.id}
            onClick={() => setSelectedChart(chart.id)}
            className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm transition-colors ${
              selectedChart === chart.id
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {chart.icon}
            <span>{chart.label}</span>
          </button>
        ))}
      </div>

      {/* Chart Container */}
      <div className="bg-slate-700 rounded-lg p-4">
        {renderChart()}
      </div>

      {/* Chart Insights */}
      <ChartInsights data={timelineData} selectedChart={selectedChart} />
    </div>
  );
}

interface ChartProps {
  data: TurnMetrics[];
  width: number;
  height: number;
}

function ScoreChart({ data, width, height }: ChartProps) {
  const maxScore = Math.max(...data.map(d => d.score));
  const minScore = Math.min(...data.map(d => d.score));
  const scoreRange = maxScore - minScore || 1;

  return (
    <div className="relative">
      <h4 className="text-lg font-semibold mb-4 text-white">Score Timeline</h4>
      <svg width={width} height={height} className="bg-slate-800 rounded">
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
          <line
            key={ratio}
            x1={60}
            y1={50 + ratio * (height - 100)}
            x2={width - 20}
            y2={50 + ratio * (height - 100)}
            stroke="var(--color-slate-600)"
            strokeWidth={0.5}
          />
        ))}
        
        {/* Y-axis labels */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
          <text
            key={ratio}
            x={50}
            y={55 + ratio * (height - 100)}
            fill="var(--color-slate-400)"
            fontSize="12"
            textAnchor="end"
          >
            {Math.round(maxScore - ratio * scoreRange)}
          </text>
        ))}

        {/* Score line */}
        <polyline
          fill="none"
          stroke="var(--color-success)"
          strokeWidth="3"
          points={data.map((d, i) => {
            const x = 60 + (i / (data.length - 1)) * (width - 80);
            const y = 50 + (1 - (d.score - minScore) / scoreRange) * (height - 100);
            return `${x},${y}`;
          }).join(' ')}
        />

        {/* Data points */}
        {data.map((d, i) => {
          const x = 60 + (i / (data.length - 1)) * (width - 80);
          const y = 50 + (1 - (d.score - minScore) / scoreRange) * (height - 100);
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r="4"
              fill="var(--color-success)"
              className="hover:r-6 transition-all cursor-pointer"
            >
              <title>Turn {d.turn}: {d.score} points</title>
            </circle>
          );
        })}

        {/* X-axis labels */}
        <text x={width / 2} y={height - 10} fill="var(--color-slate-400)" fontSize="12" textAnchor="middle">
          Turn
        </text>
        <text x={25} y={height / 2} fill="var(--color-slate-400)" fontSize="12" textAnchor="middle" transform={`rotate(-90 25 ${height / 2})`}>
          Score
        </text>
      </svg>
    </div>
  );
}

function EVGapChart({ data, width, height }: ChartProps) {
  const maxGap = Math.max(...data.map(d => Math.max(d.evGap, d.bestEVAvailable)));
  const minGap = Math.min(...data.map(d => Math.min(d.evGap, 0)));
  const gapRange = maxGap - minGap || 1;

  return (
    <div className="relative">
      <h4 className="text-lg font-semibold mb-4 text-white">Expected Value Analysis</h4>
      <svg width={width} height={height} className="bg-slate-800 rounded">
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
          <line
            key={ratio}
            x1={60}
            y1={50 + ratio * (height - 100)}
            x2={width - 20}
            y2={50 + ratio * (height - 100)}
            stroke="var(--color-slate-600)"
            strokeWidth={0.5}
          />
        ))}

        {/* Zero line */}
        <line
          x1={60}
          y1={50 + (1 - (0 - minGap) / gapRange) * (height - 100)}
          x2={width - 20}
          y2={50 + (1 - (0 - minGap) / gapRange) * (height - 100)}
          stroke="var(--color-red-500)"
          strokeWidth={1}
          strokeDasharray="5,5"
        />

        {/* Y-axis labels */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
          <text
            key={ratio}
            x={50}
            y={55 + ratio * (height - 100)}
            fill="var(--color-slate-400)"
            fontSize="12"
            textAnchor="end"
          >
            {Math.round(maxGap - ratio * gapRange)}
          </text>
        ))}

        {/* Best EV available line */}
        <polyline
          fill="none"
          stroke="var(--color-blue-500)"
          strokeWidth="2"
          strokeDasharray="3,3"
          points={data.map((d, i) => {
            const x = 60 + (i / (data.length - 1)) * (width - 80);
            const y = 50 + (1 - (d.bestEVAvailable - minGap) / gapRange) * (height - 100);
            return `${x},${y}`;
          }).join(' ')}
        />

        {/* Chosen EV line */}
        <polyline
          fill="none"
          stroke="var(--color-success)"
          strokeWidth="3"
          points={data.map((d, i) => {
            const x = 60 + (i / (data.length - 1)) * (width - 80);
            const y = 50 + (1 - (d.chosenEV - minGap) / gapRange) * (height - 100);
            return `${x},${y}`;
          }).join(' ')}
        />

        {/* EV Gap area */}
        <path
          fill="rgba(239, 68, 68, 0.3)"
          d={`M ${data.map((d, i) => {
            const x = 60 + (i / (data.length - 1)) * (width - 80);
            const yBest = 50 + (1 - (d.bestEVAvailable - minGap) / gapRange) * (height - 100);
            return i === 0 ? `M ${x},${yBest}` : `L ${x},${yBest}`;
          }).join(' ')} ${data.map((d, i) => {
            const x = 60 + ((data.length - 1 - i) / (data.length - 1)) * (width - 80);
            const yChosen = 50 + (1 - (d.chosenEV - minGap) / gapRange) * (height - 100);
            return `L ${x},${yChosen}`;
          }).reverse().join(' ')} Z`}
        />

        {/* Legend */}
        <g transform="translate(70, 70)">
          <line x1={0} y1={0} x2={20} y2={0} stroke="var(--color-blue-500)" strokeWidth={2} strokeDasharray="3,3" />
          <text x={25} y={5} fill="var(--color-slate-400)" fontSize="12">Best EV Available</text>
          
          <line x1={0} y1={20} x2={20} y2={20} stroke="var(--color-success)" strokeWidth={3} />
          <text x={25} y={25} fill="var(--color-slate-400)" fontSize="12">Chosen EV</text>
          
          <rect x={0} y={35} width={20} height={10} fill="rgba(239, 68, 68, 0.3)" />
          <text x={25} y={45} fill="var(--color-slate-400)" fontSize="12">EV Gap</text>
        </g>
      </svg>
    </div>
  );
}

function BrierChart({ data, width, height }: ChartProps) {
  const maxBrier = Math.max(...data.map(d => d.brierScore));
  const minBrier = Math.min(...data.map(d => d.brierScore));
  const brierRange = maxBrier - minBrier || 1;

  return (
    <div className="relative">
      <h4 className="text-lg font-semibold mb-4 text-white">Calibration Quality (Brier Score)</h4>
      <svg width={width} height={height} className="bg-slate-800 rounded">
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
          <line
            key={ratio}
            x1={60}
            y1={50 + ratio * (height - 100)}
            x2={width - 20}
            y2={50 + ratio * (height - 100)}
            stroke="var(--color-slate-600)"
            strokeWidth={0.5}
          />
        ))}

        {/* Y-axis labels */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
          <text
            key={ratio}
            x={50}
            y={55 + ratio * (height - 100)}
            fill="var(--color-slate-400)"
            fontSize="12"
            textAnchor="end"
          >
            {(maxBrier - ratio * brierRange).toFixed(3)}
          </text>
        ))}

        {/* Brier score line */}
        <polyline
          fill="none"
          stroke="var(--color-amber-500)"
          strokeWidth="3"
          points={data.map((d, i) => {
            const x = 60 + (i / (data.length - 1)) * (width - 80);
            const y = 50 + (1 - (d.brierScore - minBrier) / brierRange) * (height - 100);
            return `${x},${y}`;
          }).join(' ')}
        />

        {/* Uncertainty level (background) */}
        <polyline
          fill="none"
          stroke="var(--color-slate-500)"
          strokeWidth="2"
          strokeDasharray="5,5"
          points={data.map((d, i) => {
            const x = 60 + (i / (data.length - 1)) * (width - 80);
            const normalizedUncertainty = d.uncertaintyLevel / 1; // Max entropy is 1
            const y = 50 + (1 - normalizedUncertainty) * (height - 100);
            return `${x},${y}`;
          }).join(' ')}
        />

        {/* Data points */}
        {data.map((d, i) => {
          const x = 60 + (i / (data.length - 1)) * (width - 80);
          const y = 50 + (1 - (d.brierScore - minBrier) / brierRange) * (height - 100);
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r="3"
              fill="var(--color-amber-500)"
              className="hover:r-5 transition-all cursor-pointer"
            >
              <title>Turn {d.turn}: Brier {d.brierScore.toFixed(4)}</title>
            </circle>
          );
        })}

        {/* Legend */}
        <g transform="translate(70, 70)">
          <line x1={0} y1={0} x2={20} y2={0} stroke="var(--color-amber-500)" strokeWidth={3} />
          <text x={25} y={5} fill="var(--color-slate-400)" fontSize="12">Brier Score</text>
          
          <line x1={0} y1={20} x2={20} y2={20} stroke="var(--color-slate-500)" strokeWidth={2} strokeDasharray="5,5" />
          <text x={25} y={25} fill="var(--color-slate-400)" fontSize="12">Uncertainty Level</text>
        </g>
      </svg>
    </div>
  );
}

function InfraRiskChart({ data, width, height }: ChartProps) {
  const maxRisk = Math.max(...data.map(d => d.infraRisk));
  const minRisk = Math.min(...data.map(d => d.infraRisk));
  const riskRange = maxRisk - minRisk || 1;

  return (
    <div className="relative">
      <h4 className="text-lg font-semibold mb-4 text-white">Infrastructure Risk</h4>
      <svg width={width} height={height} className="bg-slate-800 rounded">
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
          <line
            key={ratio}
            x1={60}
            y1={50 + ratio * (height - 100)}
            x2={width - 20}
            y2={50 + ratio * (height - 100)}
            stroke="var(--color-slate-600)"
            strokeWidth={0.5}
          />
        ))}

        {/* Critical threshold line */}
        <line
          x1={60}
          y1={50 + (1 - (0.3 - minRisk) / riskRange) * (height - 100)}
          x2={width - 20}
          y2={50 + (1 - (0.3 - minRisk) / riskRange) * (height - 100)}
          stroke="var(--color-red-500)"
          strokeWidth={2}
          strokeDasharray="5,5"
        />

        {/* Y-axis labels */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
          <text
            key={ratio}
            x={50}
            y={55 + ratio * (height - 100)}
            fill="var(--color-slate-400)"
            fontSize="12"
            textAnchor="end"
          >
            {((maxRisk - ratio * riskRange) * 100).toFixed(1)}%
          </text>
        ))}

        {/* Risk area */}
        <path
          fill="rgba(239, 68, 68, 0.2)"
          d={`M 60,${height - 50} ${data.map((d, i) => {
            const x = 60 + (i / (data.length - 1)) * (width - 80);
            const y = 50 + (1 - (d.infraRisk - minRisk) / riskRange) * (height - 100);
            return `L ${x},${y}`;
          }).join(' ')} L ${width - 20},${height - 50} Z`}
        />

        {/* Risk line */}
        <polyline
          fill="none"
          stroke="var(--color-red-500)"
          strokeWidth="3"
          points={data.map((d, i) => {
            const x = 60 + (i / (data.length - 1)) * (width - 80);
            const y = 50 + (1 - (d.infraRisk - minRisk) / riskRange) * (height - 100);
            return `${x},${y}`;
          }).join(' ')}
        />

        {/* Data points */}
        {data.map((d, i) => {
          const x = 60 + (i / (data.length - 1)) * (width - 80);
          const y = 50 + (1 - (d.infraRisk - minRisk) / riskRange) * (height - 100);
          const isHigh = d.infraRisk > 0.3;
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r="3"
              fill={isHigh ? "var(--color-red-500)" : "var(--color-success)"}
              className="hover:r-5 transition-all cursor-pointer"
            >
              <title>Turn {d.turn}: Risk {(d.infraRisk * 100).toFixed(1)}%</title>
            </circle>
          );
        })}

        {/* Legend */}
        <g transform="translate(70, 70)">
          <line x1={0} y1={0} x2={20} y2={0} stroke="var(--color-red-500)" strokeWidth={3} />
          <text x={25} y={5} fill="var(--color-slate-400)" fontSize="12">Infrastructure Risk</text>
          
          <line x1={0} y1={20} x2={20} y2={20} stroke="var(--color-red-500)" strokeWidth={2} strokeDasharray="5,5" />
          <text x={25} y={25} fill="var(--color-slate-400)" fontSize="12">Critical Threshold (30%)</text>
        </g>
      </svg>
    </div>
  );
}

interface ChartInsightsProps {
  data: TurnMetrics[];
  selectedChart: 'score' | 'ev' | 'brier' | 'infra';
}

function ChartInsights({ data, selectedChart }: ChartInsightsProps) {
  const evMetrics = calculateEVGapMetrics(data);
  const infraMetrics = calculateInfraRiskTrends(data);

  const getInsights = () => {
    switch (selectedChart) {
      case 'score':
        const finalScore = data[data.length - 1]?.score || 0;
        const maxScore = Math.max(...data.map(d => d.score));
        const scoreGrowth = data.length > 1 ? 
          ((finalScore - data[0].score) / Math.max(data[0].score, 1) * 100) : 0;
        
        return (
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-slate-700 rounded-lg p-3">
              <div className="text-sm text-slate-400">Final Score</div>
              <div className="text-xl font-bold text-white">{finalScore}</div>
            </div>
            <div className="bg-slate-700 rounded-lg p-3">
              <div className="text-sm text-slate-400">Peak Score</div>
              <div className="text-xl font-bold text-white">{maxScore}</div>
            </div>
            <div className="bg-slate-700 rounded-lg p-3">
              <div className="text-sm text-slate-400">Growth</div>
              <div className={`text-xl font-bold ${scoreGrowth >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {scoreGrowth >= 0 ? '+' : ''}{scoreGrowth.toFixed(1)}%
              </div>
            </div>
          </div>
        );

      case 'ev':
        return (
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-slate-700 rounded-lg p-3">
              <div className="text-sm text-slate-400">Avg EV Gap</div>
              <div className="text-xl font-bold text-white">{evMetrics.averageGap.toFixed(1)}</div>
            </div>
            <div className="bg-slate-700 rounded-lg p-3">
              <div className="text-sm text-slate-400">Max Gap</div>
              <div className="text-xl font-bold text-red-400">{evMetrics.maxGap.toFixed(1)}</div>
            </div>
            <div className="bg-slate-700 rounded-lg p-3">
              <div className="text-sm text-slate-400">Trend</div>
              <div className={`text-lg font-bold flex items-center ${
                evMetrics.gapTrend === 'improving' ? 'text-green-400' : 
                evMetrics.gapTrend === 'worsening' ? 'text-red-400' : 'text-yellow-400'
              }`}>
                {evMetrics.gapTrend === 'improving' ? <TrendingDown className="w-4 h-4 mr-1" /> :
                 evMetrics.gapTrend === 'worsening' ? <TrendingUp className="w-4 h-4 mr-1" /> : null}
                {evMetrics.gapTrend}
              </div>
            </div>
            <div className="bg-slate-700 rounded-lg p-3">
              <div className="text-sm text-slate-400">Optimal Rate</div>
              <div className="text-xl font-bold text-blue-400">
                {(evMetrics.optimalDecisionRate * 100).toFixed(1)}%
              </div>
            </div>
          </div>
        );

      case 'brier':
        const finalBrier = data[data.length - 1]?.brierScore || 0;
        const avgBrier = data.reduce((sum, d) => sum + d.brierScore, 0) / data.length;
        const brierImprovement = data.length > 1 ? 
          ((data[0].brierScore - finalBrier) / data[0].brierScore * 100) : 0;
        
        return (
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-slate-700 rounded-lg p-3">
              <div className="text-sm text-slate-400">Final Brier</div>
              <div className="text-xl font-bold text-white">{finalBrier.toFixed(4)}</div>
            </div>
            <div className="bg-slate-700 rounded-lg p-3">
              <div className="text-sm text-slate-400">Average</div>
              <div className="text-xl font-bold text-white">{avgBrier.toFixed(4)}</div>
            </div>
            <div className="bg-slate-700 rounded-lg p-3">
              <div className="text-sm text-slate-400">Improvement</div>
              <div className={`text-xl font-bold ${brierImprovement >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {brierImprovement >= 0 ? '+' : ''}{brierImprovement.toFixed(1)}%
              </div>
            </div>
          </div>
        );

      case 'infra':
        return (
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-slate-700 rounded-lg p-3">
              <div className="text-sm text-slate-400">Initial Risk</div>
              <div className="text-xl font-bold text-white">{(infraMetrics.initialRisk * 100).toFixed(1)}%</div>
            </div>
            <div className="bg-slate-700 rounded-lg p-3">
              <div className="text-sm text-slate-400">Final Risk</div>
              <div className="text-xl font-bold text-white">{(infraMetrics.finalRisk * 100).toFixed(1)}%</div>
            </div>
            <div className="bg-slate-700 rounded-lg p-3">
              <div className="text-sm text-slate-400">Reduction</div>
              <div className={`text-xl font-bold ${infraMetrics.riskReduction >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {infraMetrics.riskReduction >= 0 ? '-' : '+'}{Math.abs(infraMetrics.riskReduction * 100).toFixed(1)}%
              </div>
            </div>
            <div className="bg-slate-700 rounded-lg p-3">
              <div className="text-sm text-slate-400">Critical Turns</div>
              <div className="text-xl font-bold text-red-400">{infraMetrics.criticalTurns.length}</div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="bg-slate-800 rounded-lg p-4">
      <h5 className="text-sm font-medium text-slate-400 mb-3">Chart Insights</h5>
      {getInsights()}
    </div>
  );
}