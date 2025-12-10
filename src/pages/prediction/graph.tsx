import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import './graph.css';
import { predictAbsolute } from '@/ML/predictor';
import weightsJson from '@/ML/math_model_weights.json';
import Header from '@/components/Header/Header';
import { selectUser } from '@/features/user/userSlice';
import { fetchMealsForDateWithDetails, Meal } from '@/api/mealsApi';

export const PredictionPage: React.FC = () => {
  const navigate = useNavigate();
  const user = useSelector(selectUser);
  // Use string state to allow empty inputs without forcing 0
  const [currentBG, setCurrentBG] = useState<string>("");
  const [carbs, setCarbs] = useState<string>("");
  const [bolus, setBolus] = useState<string>("");
  const [cir, setCir] = useState<string>("");
  const [gi, setGi] = useState<string>("");
  const [pred, setPred] = useState<number[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recentMeals, setRecentMeals] = useState<Meal[]>([]);
  const [startTime, setStartTime] = useState<Date>(new Date());

  // Fetch recent meals on mount
  useEffect(() => {
    const fetchRecentMeals = async () => {
      if (!user?.id) return;
      
      try {
        const today = new Date().toISOString().split('T')[0];
        const meals = await fetchMealsForDateWithDetails(user.id, today);
        // Get last 3 meals
        setRecentMeals(meals.slice(-3).reverse());
      } catch (err) {
        console.error('Failed to fetch recent meals:', err);
      }
    };

    fetchRecentMeals();
  }, [user?.id]);

  const handleUseValues = (meal: Meal) => {
    setCarbs(meal.carbs_grams.toString());
    setBolus((meal.insulin_taken ?? 0).toFixed(1));
    setGi((meal.glycemic_index ?? 0).toString());
    setCir((user?.insulinRatio ?? 0).toString());
  };

  const handlePredict = () => {
    try {
      setError(null);
      // Parse numbers, defaulting to 0 if empty or invalid
      const parsedCurrentBG = Number(currentBG) || 0;
      const parsedCarbs = Number(carbs) || 0;
      const parsedBolus = Number(bolus) || 0;
      const parsedCir = Number(cir) || 0;
      const parsedGi = Number(gi) || 0;

      const res = predictAbsolute({
        currentBG: parsedCurrentBG,
        carbs: parsedCarbs,
        bolus: parsedBolus,
        cir: parsedCir,
        gi: parsedGi,
      });
      console.log('🔍 Raw prediction values (first 10):', res.slice(0, 10));
      console.log('📊 Prediction stats:', {
        length: res.length,
        min: Math.min(...res),
        max: Math.max(...res),
        mean: res.reduce((a, b) => a + b, 0) / res.length,
        variance: res.reduce((sum, val, _, arr) => {
          const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
          return sum + Math.pow(val - mean, 2);
        }, 0) / res.length
      });
      setPred(res);
      setStartTime(new Date()); // Set prediction start time to now
    } catch (e: any) {
      setError(e?.message || 'Failed to generate prediction');
      setPred(null);
    }
  };

  // Use HORIZONS from JSON to match prediction length
  const totalTime = weightsJson.HORIZONS[weightsJson.HORIZONS.length - 1];

  const minPred = pred ? Math.min(...pred) : 0;
  const maxPred = pred ? Math.max(...pred) : 0;

  // Calculate analytics when prediction exists
  const analytics = pred ? {
    startingBG: Number(currentBG) || 0,
    peakBG: maxPred,
    finalBG: pred[pred.length - 1],
    peakTime: pred.indexOf(maxPred) * 5,
    carbs: Number(carbs) || 0,
    requiredDose: Number(bolus) || 0,
    givenDose: Number(bolus) || 0,
    mismatch: 0,
    derivedISF: (Number(cir) || 0) * 3.6,
    totalCarbEffect: (Number(carbs) || 0) * 3.6 * (0.8 + 0.6 * ((Number(gi) || 0) / 100)),
    totalInsulinEffect: (Number(bolus) || 0) * ((Number(cir) || 0) * 3.6),
    netEffect: 0
  } : null;

  if (analytics) {
    analytics.netEffect = Math.round(analytics.totalCarbEffect - analytics.totalInsulinEffect);
  }

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

          {/* Recent Meals Section */}
          {recentMeals.length > 0 && (
            <div className="rounded-3xl border border-emerald-100 bg-white/90 p-6 md:p-8 shadow-lg backdrop-blur-sm mb-8">
              <h2 className="text-xl font-bold text-emerald-900 mb-4">Recent Meals (Today)</h2>
              <div className="space-y-3">
                {recentMeals.map((meal) => (
                  <div key={meal.id} className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-emerald-900 mb-1">{meal.food_name}</p>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-emerald-700">
                          <span><strong>Carbs:</strong> {meal.carbs_grams}g</span>
                          <span><strong>Insulin:</strong> {(meal.insulin_taken ?? 0).toFixed(1)} U</span>
                          {meal.glycemic_index && <span><strong>GI:</strong> {meal.glycemic_index}</span>}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleUseValues(meal)}
                      className="w-full px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl transition-colors"
                    >
                      Use Values
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

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
                    onChange={(e) => setCurrentBG(e.target.value)}
                    className="input-field"
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="input-group">
                <label className="input-label">Carbohydrates (g)</label>
                <div className="input-wrapper">
                  <input
                    type="number"
                    value={carbs}
                    onChange={(e) => setCarbs(e.target.value)}
                    className="input-field"
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="input-group">
                <label className="input-label">Glycemic Index (0-100)</label>
                <div className="input-wrapper">
                  <input
                    type="number"
                    value={gi}
                    onChange={(e) => setGi(e.target.value)}
                    className="input-field"
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="input-group">
                <label className="input-label">Insulin Bolus (U)</label>
                <div className="input-wrapper">
                  <input
                    type="number"
                    value={bolus}
                    onChange={(e) => setBolus(e.target.value)}
                    className="input-field"
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="input-group">
                <label className="input-label">Carb-to-Insulin Ratio (U/g)</label>
                <div className="input-wrapper">
                  <input
                    type="number"
                    step="0.1"
                    value={cir}
                    onChange={(e) => setCir(e.target.value)}
                    className="input-field"
                    placeholder="0"
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

          {/* Analytics Section */}
          {pred && analytics && (
            <div className="rounded-3xl border border-emerald-100 bg-white/90 p-6 md:p-8 shadow-lg backdrop-blur-sm mb-8">
              <h2 className="text-xl font-bold text-emerald-900 mb-6">📊 Simulation Metrics</h2>
              
              <div className="space-y-6">
                {/* Key BG Metrics */}
                <div>
                  <h3 className="text-sm font-bold text-emerald-800 mb-3 uppercase tracking-wide">Blood Glucose</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                      <p className="text-xs text-emerald-600 font-semibold">Starting BG:</p>
                      <p className="text-lg font-bold text-emerald-900">{analytics.startingBG} mg/dL</p>
                    </div>
                    <div className="bg-teal-50 p-3 rounded-xl border border-teal-100">
                      <p className="text-xs text-teal-600 font-semibold">Peak BG:</p>
                      <p className="text-lg font-bold text-teal-900">{Math.round(analytics.peakBG)} mg/dL <span className="text-xs text-teal-600">@ {analytics.peakTime} min</span></p>
                    </div>
                    <div className="bg-blue-50 p-3 rounded-xl border border-blue-100">
                      <p className="text-xs text-blue-600 font-semibold">Final BG (3h):</p>
                      <p className="text-lg font-bold text-blue-900">{Math.round(analytics.finalBG)} mg/dL</p>
                    </div>
                  </div>
                </div>

                {/* ICR/ISF Section */}
                <div>
                  <h3 className="text-sm font-bold text-emerald-800 mb-3 uppercase tracking-wide">ICR/ISF</h3>
                  <div className="bg-amber-50 p-3 rounded-xl border border-amber-100">
                    <p className="text-xs text-amber-700 font-semibold mb-1">Derived ISF:</p>
                    <p className="text-base font-bold text-amber-900">{analytics.derivedISF.toFixed(1)} mg/dL per unit</p>
                  </div>
                </div>

                {/* Dose Information */}
                <div>
                  <h3 className="text-sm font-bold text-emerald-800 mb-3 uppercase tracking-wide">Insulin Dosing</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="bg-purple-50 p-3 rounded-xl border border-purple-100">
                      <p className="text-xs text-purple-600 font-semibold">Carbs:</p>
                      <p className="text-lg font-bold text-purple-900">{analytics.carbs} g</p>
                    </div>
                    <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-100">
                      <p className="text-xs text-indigo-600 font-semibold">Given Dose:</p>
                      <p className="text-lg font-bold text-indigo-900">{analytics.givenDose.toFixed(1)} U</p>
                    </div>
                    <div className="bg-pink-50 p-3 rounded-xl border border-pink-100">
                      <p className="text-xs text-pink-600 font-semibold">Mismatch:</p>
                      <p className="text-lg font-bold text-pink-900">{analytics.mismatch.toFixed(1)} U</p>
                    </div>
                  </div>
                </div>

                {/* Physiological Effects */}
                <div>
                  <h3 className="text-sm font-bold text-emerald-800 mb-3 uppercase tracking-wide">⚡ Physiological Effects</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-green-50 p-3 rounded-xl border border-green-100">
                      <p className="text-xs text-green-600 font-semibold">Total Carb Effect:</p>
                      <p className="text-lg font-bold text-green-900">+{Math.round(analytics.totalCarbEffect)} mg/dL</p>
                    </div>
                    <div className="bg-red-50 p-3 rounded-xl border border-red-100">
                      <p className="text-xs text-red-600 font-semibold">Total Insulin Effect:</p>
                      <p className="text-lg font-bold text-red-900">-{Math.round(analytics.totalInsulinEffect)} mg/dL</p>
                    </div>
                    <div className={`p-3 rounded-xl border ${analytics.netEffect >= 0 ? 'bg-orange-50 border-orange-100' : 'bg-cyan-50 border-cyan-100'}`}>
                      <p className={`text-xs font-semibold ${analytics.netEffect >= 0 ? 'text-orange-600' : 'text-cyan-600'}`}>Net Effect:</p>
                      <p className={`text-lg font-bold ${analytics.netEffect >= 0 ? 'text-orange-900' : 'text-cyan-900'}`}>
                        {analytics.netEffect >= 0 ? '+' : ''}{analytics.netEffect} mg/dL
                      </p>
                    </div>
                  </div>
                </div>

                {/* Warning if peak is high */}
                {analytics.peakBG > 220 && (
                  <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
                    <p className="text-sm font-bold text-red-800 flex items-center gap-2">
                      <span className="text-lg">⚠️</span>
                      HIGH PEAK: {Math.round(analytics.peakBG)} mg/dL
                    </p>
                    <p className="text-xs text-red-700 mt-1">Consider pre-bolusing 15-20 min before meal</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Chart Card */}
          {pred && (
            <div className="rounded-3xl border border-emerald-100 bg-white/90 p-6 md:p-8 shadow-lg backdrop-blur-sm mb-8">
              <h2 className="text-xl font-bold text-emerald-900 mb-6">Predicted Glucose Trend</h2>
              <SimpleLineChart data={pred} totalTime={totalTime} minPred={minPred} maxPred={maxPred} startTime={startTime} />

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


function SimpleLineChart({ data, maxPred, startTime }: { data: number[]; totalTime?: number; minPred: number; maxPred: number; startTime?: Date }) {
  const [hoveredPoint, setHoveredPoint] = React.useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = React.useState<{x: number, y: number} | null>(null);
  
  const baseTime = startTime || new Date();
  
  // Mobile-optimized: compact spacing for less scrolling
  const pointSpacing = 12; // pixels between each data point (more compact)
  const width = data.length * pointSpacing;
  const height = 400;
  const padding = { top: 40, bottom: 70, left: 60, right: 40 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Calculate coordinates
  const xs = data.map((_, i) => padding.left + (i / Math.max(1, data.length - 1)) * chartWidth);
  // Dynamic Y-axis range based on data
  const dataMin = Math.min(...data);
  const dataMax = Math.max(...data);
  const yMin = Math.max(40, Math.floor(dataMin / 10) * 10 - 10); // At least 40, rounded down with 10 buffer
  const yMax = Math.max(225, Math.ceil(dataMax / 10) * 10 + 10); // At least 225, rounded up with 10 buffer
  const range = yMax - yMin;
  const ys = data.map(v => padding.top + (1 - (v - yMin) / range) * chartHeight);

  // SVG path for the line - use 4 decimal precision to preserve noise
  const path = xs.map((x, i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(4)} ${ys[i].toFixed(4)}`).join(' ');

  // Y-axis labels (grid with glucose values) - reversed to show high to low
  const yTicks = 4;
  const yLabels = Array.from({ length: yTicks + 1 }, (_, i) => {
    const t = i / yTicks;
    return yMax - t * range; // reversed: start from max, go down to min
  });

  // X-axis labels - show every 6th point for less clutter, format as clock time
  const xLabels = data
    .map((_, i) => {
      const timeOffset = i * 5; // minutes
      const pointTime = new Date(baseTime.getTime() + timeOffset * 60000);
      const hours = pointTime.getHours();
      const minutes = pointTime.getMinutes();
      const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      return { idx: i, time: timeOffset, timeStr };
    })
    .filter((_, i) => i % 6 === 0);

  return (
    <div className="simple-line-chart" style={{ overflowX: 'auto', overflowY: 'hidden', maxWidth: '100%' }}>
      <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} className="chart-svg" style={{ minWidth: '100%' }}>
        {/* Background zones */}
        {(() => {
          const zones = [];
          
          // Only show zones if thresholds are within visible range
          if (70 >= yMin && 70 <= yMax) {
            const hypoY = padding.top + (1 - (70 - yMin) / range) * chartHeight;
            // Hypoglycemia zone (below 70) - red
            zones.push(
              <rect
                key="hypo-zone"
                x={padding.left}
                y={hypoY}
                width={chartWidth}
                height={Math.max(0, height - padding.bottom - hypoY)}
                fill="#fca5a5"
                opacity="0.3"
              />
            );
          }
          
          if (180 >= yMin && 180 <= yMax) {
            const hyperY = padding.top + (1 - (180 - yMin) / range) * chartHeight;
            // Hyperglycemia zone (above 180) - yellow/orange
            zones.push(
              <rect
                key="hyper-zone"
                x={padding.left}
                y={padding.top}
                width={chartWidth}
                height={Math.max(0, hyperY - padding.top)}
                fill="#fde68a"
                opacity="0.3"
              />
            );
            
            // Normal range (70-180) - green tint (only if both thresholds visible)
            if (70 >= yMin && 70 <= yMax) {
              const hypoY = padding.top + (1 - (70 - yMin) / range) * chartHeight;
              zones.push(
                <rect
                  key="normal-zone"
                  x={padding.left}
                  y={hyperY}
                  width={chartWidth}
                  height={Math.max(0, hypoY - hyperY)}
                  fill="#bbf7d0"
                  opacity="0.2"
                />
              );
            }
          }
          
          return <>{zones}</>;
        })()}
        
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
        <path d={path} fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />

        {/* Data point dots */}
        {xs.map((x, i) => (
          <circle 
            key={`dot-${i}`} 
            cx={x} 
            cy={ys[i]} 
            r={hoveredPoint === i ? 7 : 5} 
            fill="#3b82f6" 
            stroke="white" 
            strokeWidth="2"
            style={{ cursor: 'pointer' }}
            onMouseEnter={() => {
              setHoveredPoint(i);
              setTooltipPos({ x, y: ys[i] });
            }}
            onMouseLeave={() => {
              setHoveredPoint(null);
              setTooltipPos(null);
            }}
            onClick={() => {
              setHoveredPoint(i);
              setTooltipPos({ x, y: ys[i] });
            }}
          />
        ))}
        
        {/* Peak star marker */}
        {(() => {
          const peakIdx = data.indexOf(maxPred);
          const peakX = xs[peakIdx];
          const peakY = ys[peakIdx];
          return (
            <g>
              {/* Star shape */}
              <path
                d={`M ${peakX} ${peakY - 12} L ${peakX + 3.5} ${peakY - 3.5} L ${peakX + 12} ${peakY - 3.5} L ${peakX + 5} ${peakY + 2} L ${peakX + 7.5} ${peakY + 11} L ${peakX} ${peakY + 6} L ${peakX - 7.5} ${peakY + 11} L ${peakX - 5} ${peakY + 2} L ${peakX - 12} ${peakY - 3.5} L ${peakX - 3.5} ${peakY - 3.5} Z`}
                fill="#dc2626"
                stroke="white"
                strokeWidth="1.5"
              />
            </g>
          );
        })()}
        
        {/* Tooltip */}
        {hoveredPoint !== null && tooltipPos && (
          <g>
            <rect
              x={tooltipPos.x - 50}
              y={tooltipPos.y - 50}
              width="100"
              height="40"
              fill="white"
              stroke="#3b82f6"
              strokeWidth="2"
              rx="6"
              opacity="0.95"
            />
            <text
              x={tooltipPos.x}
              y={tooltipPos.y - 32}
              textAnchor="middle"
              fontSize="12"
              fontWeight="600"
              fill="#374151"
            >
              {data[hoveredPoint].toFixed(1)} mg/dL
            </text>
            <text
              x={tooltipPos.x}
              y={tooltipPos.y - 18}
              textAnchor="middle"
              fontSize="11"
              fill="#6b7280"
            >
              {(() => {
                const pointTime = new Date(baseTime.getTime() + hoveredPoint * 5 * 60000);
                const hours = pointTime.getHours();
                const minutes = pointTime.getMinutes();
                return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
              })()}
            </text>
          </g>
        )}

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

        {/* Threshold lines */}
        {(() => {
          const lines = [];
          
          // Only show threshold line if value is within visible range
          if (70 >= yMin && 70 <= yMax) {
            const hypoY = padding.top + (1 - (70 - yMin) / range) * chartHeight;
            lines.push(
              <line key="hypo-line" x1={padding.left} x2={width - padding.right} y1={hypoY} y2={hypoY} stroke="#dc2626" strokeWidth="1.5" strokeDasharray="5,5" />
            );
          }
          
          if (180 >= yMin && 180 <= yMax) {
            const hyperY = padding.top + (1 - (180 - yMin) / range) * chartHeight;
            lines.push(
              <line key="hyper-line" x1={padding.left} x2={width - padding.right} y1={hyperY} y2={hyperY} stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="5,5" />
            );
          }
          
          return <>{lines}</>;
        })()}

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
              {label.timeStr}
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
