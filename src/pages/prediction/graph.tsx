import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './graph.css';
import { predictAbsolute } from '@/ML/predictor';
import { getStepKernel } from '@/ML/getStepKernel';
import Header from '@/components/Header/Header';

export const PredictionPage: React.FC = () => {
  const navigate = useNavigate();
  const [currentBG, setCurrentBG] = useState<number>(98);
  const [carbs, setCarbs] = useState<number>(83);
  const [bolus, setBolus] = useState<number>(10);
  const [cir, setCir] = useState<number>(4.2);
  const [gi, setGi] = useState<number>(55);
  const [pred, setPred] = useState<number[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePredict = () => {
    try {
      setError(null);
      const res = predictAbsolute({ currentBG, carbs, bolus, cir, gi });
      setPred(res);
    } catch (e: any) {
      setError(e?.message || 'Failed to generate prediction');
      setPred(null);
    }
  };

  const kernel = getStepKernel(45, 40);
  const totalTime = kernel.length * 5;

  const minPred = pred ? Math.min(...pred) : 0;
  const maxPred = pred ? Math.max(...pred) : 0;

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-emerald-50 to-white">
      <Header onBack={() => navigate('/chat')} />

      <main className="flex-1 overflow-y-auto p-4 pt-24 md:p-8">
        <div className="max-w-5xl mx-auto">
          {/* Header Card */}
          <div className="mb-8">
            <div className="rounded-3xl border border-emerald-100 bg-white/90 p-8 shadow-lg backdrop-blur-sm">
              <h1 className="text-3xl md:text-4xl font-bold text-emerald-900 mb-2">Glucose Prediction</h1>
              <p className="text-emerald-600 text-sm md:text-base">Enter your current metrics to predict blood glucose over the next {totalTime} minutes</p>
            </div>
          </div>

          {/* Input Form Card */}
          <div className="rounded-3xl border border-emerald-100 bg-white/90 p-6 md:p-8 shadow-lg backdrop-blur-sm mb-8">
            <h2 className="text-xl font-bold text-emerald-900 mb-6">Input Parameters</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="input-group">
                <label className="input-label">Current Blood Glucose (mg/dL)</label>
                <div className="input-wrapper">
                  <input
                    type="number"
                    value={currentBG}
                    onChange={(e) => setCurrentBG(Number(e.target.value))}
                    className="input-field"
                    placeholder="98"
                  />
                </div>
              </div>
              <div className="input-group">
                <label className="input-label">Carbohydrates (g)</label>
                <div className="input-wrapper">
                  <input
                    type="number"
                    value={carbs}
                    onChange={(e) => setCarbs(Number(e.target.value))}
                    className="input-field"
                    placeholder="83"
                  />
                </div>
              </div>
              <div className="input-group">
                <label className="input-label">Glycemic Index (0-150)</label>
                <div className="input-wrapper">
                  <input
                    type="number"
                    value={gi}
                    onChange={(e) => setGi(Number(e.target.value))}
                    className="input-field"
                    placeholder="55"
                  />
                </div>
              </div>
              <div className="input-group">
                <label className="input-label">Insulin Bolus (U)</label>
                <div className="input-wrapper">
                  <input
                    type="number"
                    value={bolus}
                    onChange={(e) => setBolus(Number(e.target.value))}
                    className="input-field"
                    placeholder="10"
                  />
                </div>
              </div>
              <div className="input-group">
                <label className="input-label">Carb-to-Insulin Ratio (g/U)</label>
                <div className="input-wrapper">
                  <input
                    type="number"
                    step="0.1"
                    value={cir}
                    onChange={(e) => setCir(Number(e.target.value))}
                    className="input-field"
                    placeholder="4.2"
                  />
                </div>
              </div>
            </div>

            <button className="btn-predict w-full" onClick={handlePredict}>
              Generate Prediction
            </button>
          </div>

          {/* Error State */}
          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6 mb-8">
              <p className="text-red-600 font-medium">{error}</p>
            </div>
          )}

          {/* Chart Card */}
          {pred && (
            <div className="rounded-3xl border border-emerald-100 bg-white/90 p-6 md:p-8 shadow-lg backdrop-blur-sm mb-8">
              <h2 className="text-xl font-bold text-emerald-900 mb-6">Predicted Glucose Trend</h2>
              <SimpleLineChart data={pred} totalTime={totalTime} minPred={minPred} maxPred={maxPred} />

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-4 mt-8">
                <div className="rounded-2xl bg-gradient-to-br from-emerald-100 to-emerald-50 p-4">
                  <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">Starting BG</p>
                  <p className="mt-2 text-2xl font-bold text-emerald-900">{pred[0].toFixed(0)}</p>
                  <p className="text-xs text-emerald-700 mt-1">mg/dL</p>
                </div>
                <div className="rounded-2xl bg-gradient-to-br from-teal-100 to-teal-50 p-4">
                  <p className="text-xs font-semibold text-teal-600 uppercase tracking-wide">Peak</p>
                  <p className="mt-2 text-2xl font-bold text-teal-900">{maxPred.toFixed(0)}</p>
                  <p className="text-xs text-teal-700 mt-1">mg/dL</p>
                </div>
                <div className="rounded-2xl bg-gradient-to-br from-blue-100 to-blue-50 p-4">
                  <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Final</p>
                  <p className="mt-2 text-2xl font-bold text-blue-900">{pred[pred.length - 1].toFixed(0)}</p>
                  <p className="text-xs text-blue-700 mt-1">mg/dL</p>
                </div>
              </div>
            </div>
          )}

          {/* Empty State */}
          {!pred && !error && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-12 text-center">
              <div className="mb-4">
                <svg className="w-16 h-16 mx-auto text-emerald-400 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <p className="text-emerald-600 font-medium text-lg">Fill in your metrics and tap "Generate Prediction" to see your glucose forecast</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};


function SimpleLineChart({ data, minPred, maxPred }: { data: number[]; totalTime?: number; minPred: number; maxPred: number }) {
  // Mobile-optimized: compact spacing for less scrolling
  const pointSpacing = 35; // pixels between each data point (reduced from 60)
  const width = data.length * pointSpacing;
  const height = 400;
  const padding = { top: 40, bottom: 70, left: 60, right: 40 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Calculate coordinates
  const xs = data.map((_, i) => padding.left + (i / Math.max(1, data.length - 1)) * chartWidth);
  const range = maxPred - minPred || 1;
  const ys = data.map(v => padding.top + (1 - (v - minPred) / range) * chartHeight);

  // SVG path for the line
  const path = xs.map((x, i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${ys[i].toFixed(2)}`).join(' ');

  // Y-axis labels (grid with glucose values) - reversed to show high to low
  const yTicks = 4;
  const yLabels = Array.from({ length: yTicks + 1 }, (_, i) => {
    const t = i / yTicks;
    return maxPred - t * range; // reversed: start from max, go down to min
  });

  // X-axis labels - show every 3rd point for mobile readability
  const xLabels = data
    .map((_, i) => ({ idx: i, time: i * 5 }))
    .filter((_, i) => i % 3 === 0);

  return (
    <div className="simple-line-chart">
      <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} className="chart-svg">
        {/* Grid background */}
        <defs>
          <pattern id="grid" width="40" height={chartHeight / yTicks} patternUnits="userSpaceOnUse" x={padding.left} y={padding.top}>
            <path d={`M 0 0 L ${chartWidth} 0`} fill="none" stroke="#f3f4f6" strokeWidth="1" />
          </pattern>
        </defs>

        {/* Y-axis grid */}
        {yLabels.map((_, i) => (
          <line
            key={`grid-${i}`}
            x1={padding.left}
            x2={width - padding.right}
            y1={padding.top + (i / yTicks) * chartHeight}
            y2={padding.top + (i / yTicks) * chartHeight}
            stroke="#e5e7eb"
            strokeWidth="1"
            strokeDasharray="4,4"
          />
        ))}

        {/* Y-axis */}
        <line x1={padding.left} y1={padding.top} x2={padding.left} y2={height - padding.bottom} stroke="#374151" strokeWidth="2" />

        {/* X-axis */}
        <line x1={padding.left} y1={height - padding.bottom} x2={width - padding.right} y2={height - padding.bottom} stroke="#374151" strokeWidth="2" />

        {/* Chart line */}
        <path d={path} fill="none" stroke="#10b981" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" />

        {/* Area under line (gradient fill) */}
        <defs>
          <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.05" />
          </linearGradient>
        </defs>
        <path
          d={`${path} L ${xs[xs.length - 1]} ${height - padding.bottom} L ${xs[0]} ${height - padding.bottom} Z`}
          fill="url(#areaGradient)"
        />

        {/* Data points */}
        {xs.map((x, i) => (
          <circle key={`point-${i}`} cx={x} cy={ys[i]} r="5" fill="#10b981" stroke="white" strokeWidth="2" />
        ))}

        {/* Y-axis labels */}
        {yLabels.map((val, i) => (
          <text
            key={`ylabel-${i}`}
            x={padding.left - 10}
            y={padding.top + (i / yTicks) * chartHeight + 5}
            textAnchor="end"
            fontSize="14"
            fill="#6b7280"
            fontWeight="600"
            className="chart-label"
          >
            {Math.round(val)}
          </text>
        ))}

        {/* Y-axis unit label */}
        <text x={14} y={padding.top - 10} fontSize="12" fill="#9ca3af" fontWeight="600" textAnchor="start" className="chart-label">
          mg/dL
        </text>

        {/* X-axis labels */}
        {xLabels.map((label, i) => {
          const x = xs[label.idx];
          return (
            <text
              key={`xlabel-${i}`}
              x={x}
              y={height - padding.bottom + 24}
              textAnchor="middle"
              fontSize="13"
              fill="#6b7280"
              fontWeight="600"
              className="chart-label"
            >
              {label.time}m
            </text>
          );
        })}

        {/* X-axis unit label */}
        <text x={width - 24} y={height - 10} fontSize="12" fill="#9ca3af" fontWeight="600" textAnchor="end" className="chart-label">
          Time
        </text>
      </svg>
    </div>
  );
}

export default PredictionPage;
