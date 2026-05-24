import React, { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles,
  RefreshCw,
  HelpCircle,
  Play,
  Pause,
  RotateCcw,
  BookOpen,
  Sliders,
  ChevronDown,
  BarChart4,
  Target,
  Compass,
  CheckCircle,
  AlertCircle,
  HelpCircle as TooltipIcon,
  Minimize2,
  Maximize2,
  ListRestart,
  Download,
  Table
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  ReferenceLine,
  ComposedChart,
  ReferenceArea
} from "recharts";
import { DistributionType, DistributionInfo, RealWorldExample, ExperimentPreset } from "./types";
import { distributions } from "./utils/distributionData";
import { PDFMap, CDFMap, sampleDistribution, logBeta } from "./utils/mathFunctions";
import AICopilot from "./components/AICopilot";
import html2canvas from "html2canvas";
import { MathLaTeX, MathText } from "./components/MathLaTeX";

// Helper functions for exporting charts with transparent backgrounds
const exportPng = async (elementId: string, filename: string) => {
  const element = document.getElementById(elementId);
  if (!element) return;
  
  try {
    const canvas = await html2canvas(element, {
      backgroundColor: null,
      logging: false,
      useCORS: true,
      scale: 2, // 2x high resolution
      onclone: (clonedDocument) => {
        // Hide button group
        const clonedBtnGroup = clonedDocument.querySelector(`#btn-group-${elementId}`);
        if (clonedBtnGroup instanceof HTMLElement) {
          clonedBtnGroup.style.display = 'none';
        }
        // Make card background, border, shadow transparent
        const targetClonedElement = clonedDocument.getElementById(elementId);
        if (targetClonedElement) {
          targetClonedElement.style.backgroundColor = 'transparent';
          targetClonedElement.style.backgroundImage = 'none';
          targetClonedElement.style.boxShadow = 'none';
          targetClonedElement.style.border = 'none';
        }
      }
    });
    
    const dataUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.download = `${filename}.png`;
    link.href = dataUrl;
    link.click();
  } catch (error) {
    console.error("Failed to export PNG:", error);
  }
};

const exportSvg = (elementId: string, filename: string) => {
  const element = document.getElementById(elementId);
  if (!element) return;
  const svgElement = element.querySelector("svg");
  if (!svgElement) return;

  try {
    const clonedSvg = svgElement.cloneNode(true) as SVGElement;
    if (!clonedSvg.getAttribute("xmlns")) {
      clonedSvg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    }
    
    clonedSvg.style.backgroundColor = "transparent";
    clonedSvg.style.fontFamily = "Inter, -apple-system, sans-serif";

    const rect = svgElement.getBoundingClientRect();
    clonedSvg.setAttribute("width", rect.width.toString());
    clonedSvg.setAttribute("height", rect.height.toString());
    if (!clonedSvg.getAttribute("viewBox")) {
      clonedSvg.setAttribute("viewBox", `0 0 ${rect.width} ${rect.height}`);
    }

    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(clonedSvg);
    const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.download = `${filename}.svg`;
    link.href = url;
    link.click();
    
    setTimeout(() => URL.revokeObjectURL(url), 100);
  } catch (error) {
    console.error("Failed to export SVG:", error);
  }
};

const formatNumber = (val: number | undefined | null, precision = 4): string => {
  if (val === undefined || val === null || isNaN(val)) return "—";
  return val.toFixed(precision);
};

const CustomQQTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl p-3.5 shadow-2xl text-[10px] leading-relaxed max-w-xs font-mono">
        <p className="font-sans font-black text-[#60a5fa] border-b border-slate-800 pb-1 mb-1.5 flex items-center gap-1.5 uppercase tracking-wider">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
          Q-Q 分位数观察点
        </p>
        <p>分位数概率 (p): <span className="text-purple-300 font-bold">{(data.p * 100).toFixed(1)}%</span></p>
        <p>理论期望值 (X): <span className="text-slate-300 font-bold">{data.theoretical.toFixed(4)}</span></p>
        <p>均值实测值 (Y): <span className="text-indigo-400 font-bold">{data.empirical.toFixed(4)}</span></p>
        <p className="border-t border-slate-800/80 pt-1.5 mt-1.5 text-slate-400 flex justify-between items-center">
          <span>绝对偏误 |Δ|:</span>
          <span className="text-emerald-400 font-bold">{Math.abs(data.empirical - data.theoretical).toFixed(4)}</span>
        </p>
      </div>
    );
  }
  return null;
};

const CustomHistogramTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const empirical = data.empirical ?? 0;
    const theoretical = data.theoretical ?? 0;
    const xLabel = data.xLabel;
    
    const diff = empirical - theoretical;
    const absDiff = Math.abs(diff);
    const relDiff = theoretical > 0 ? (absDiff / theoretical) * 100 : 0;
    
    let diffColor = "text-emerald-700 bg-emerald-50/95 border-emerald-200";
    let diffText = "理论与实测高度拟合 ✨";
    let signSymbol = "";
    
    if (absDiff > 0.005) {
      if (diff > 0) {
        diffColor = "text-indigo-700 bg-indigo-50/95 border-indigo-200";
        diffText = "实测密度偏高 📈";
        signSymbol = "+";
      } else {
        diffColor = "text-rose-700 bg-rose-50/95 border-rose-200";
        diffText = "实测密度偏低 📉";
        signSymbol = "-";
      }
    }

    return (
      <div className="bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-slate-200 shadow-xl max-w-[280px] text-xs space-y-3 pointer-events-none">
        <div className="border-b border-slate-100 pb-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">
            采样取值节点/区间
          </span>
          <span className="text-sm font-black text-slate-800 font-mono">
            {xLabel}
          </span>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-4 font-medium">
            <span className="text-slate-500 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-indigo-500" />
              <span>实测概率密度:</span>
            </span>
            <span className="font-mono text-indigo-600 font-bold text-xs">
              {empirical.toFixed(5)}
            </span>
          </div>

          <div className="flex items-center justify-between gap-4 font-medium">
            <span className="text-slate-500 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>理论计算密度:</span>
            </span>
            <span className="font-mono text-emerald-600 font-bold text-xs">
              {theoretical.toFixed(5)}
            </span>
          </div>
        </div>

        <div className={`p-2.5 rounded-xl border text-[11px] leading-relaxed font-semibold ${diffColor} flex flex-col gap-1`}>
          <div className="flex justify-between items-center text-[10px] opacity-90">
            <span>绝对偏差量 (Δ):</span>
            <span className="font-mono font-bold">
              {signSymbol}{diff.toFixed(5)}
            </span>
          </div>
          {theoretical > 0 && (
            <div className="flex justify-between items-center text-[10px] opacity-80">
              <span>相对偏离度:</span>
              <span className="font-mono">
                {relDiff.toFixed(2)}%
              </span>
            </div>
          )}
          <div className="text-[10px] mt-1 pt-1 border-t border-current/10 flex justify-between items-center font-bold">
            <span>偏差评定:</span>
            <span>{diffText}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export default function App() {
  // Navigation & Core States
  const [selectedDistType, setSelectedDistType] = useState<DistributionType>("Normal");
  const [activeTab, setActiveTab] = useState<"theory" | "sampling" | "montecarlo" | "knowledge" | "clt">("theory");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showCI, setShowCI] = useState<boolean>(false);

  // Retrieve current distribution metadata
  const currentDist = useMemo(() => {
    return distributions.find((d) => d.type === selectedDistType)!;
  }, [selectedDistType]);

  // Parameters State
  const [params, setParams] = useState<Record<string, number>>(() => {
    const initParams: Record<string, number> = {};
    distributions.forEach((d) => {
      d.parameters.forEach((p) => {
        if (d.type === selectedDistType) {
          initParams[p.name] = p.defaultValue;
        }
      });
    });
    return initParams;
  });

  // Re-initialize parameters when selected distributions change
  useEffect(() => {
    const initParams: Record<string, number> = {};
    currentDist.parameters.forEach((p) => {
      initParams[p.name] = p.defaultValue;
    });
    setParams(initParams);
    // Clear sampling & Monte Carlo states
    setSamples([]);
    setMCDarts([]);
    setMCIteration(0);
    setMCEstimating(false);
    setMcVisibleCount(0);
    setMcIsPlaying(false);
  }, [selectedDistType, currentDist]);

  const handleParamChange = (name: string, val: number) => {
    setParams((prev) => ({ ...prev, [name]: val }));
    // Clear Monte Carlo / sampling states because parameters changed
    setSamples([]);
    setMCDarts([]);
    setMCIteration(0);
    setMCEstimating(false);
    setMcVisibleCount(0);
    setMcIsPlaying(false);
  };

  // State: Dynamic Parameter Auto Roaming/Travel
  const [roamingParam, setRoamingParam] = useState<string | null>(null);
  const [roamingDirection, setRoamingDirection] = useState<"up" | "down">("up");

  // Stop roaming if the active tab changes or if the distribution changes
  useEffect(() => {
    setRoamingParam(null);
  }, [selectedDistType, activeTab]);

  useEffect(() => {
    if (!roamingParam) return;

    const p = currentDist.parameters.find((param) => param.name === roamingParam);
    if (!p) {
      setRoamingParam(null);
      return;
    }

    const interval = setInterval(() => {
      setParams((prev) => {
        const currentVal = prev[roamingParam] ?? p.defaultValue;
        let direction = roamingDirection;
        let nextVal = currentVal;

        // Change directions if bounds are hit
        if (currentVal >= p.max) {
          direction = "down";
          setRoamingDirection("down");
        } else if (currentVal <= p.min) {
          direction = "up";
          setRoamingDirection("up");
        }

        const step = p.step;
        if (direction === "up") {
          nextVal = Math.min(p.max, currentVal + step);
        } else {
          nextVal = Math.max(p.min, currentVal - step);
        }

        const precision = step.toString().split(".")[1]?.length ?? 0;
        nextVal = parseFloat(nextVal.toFixed(precision));

        return { ...prev, [roamingParam]: nextVal };
      });

      // Reset experimental/sampling states to avoid stale simulation data
      setSamples([]);
      setMCDarts([]);
      setMCIteration(0);
      setMCEstimating(false);
      setMcVisibleCount(0);
      setMcIsPlaying(false);
    }, 80);

    return () => clearInterval(interval);
  }, [roamingParam, roamingDirection, currentDist]);

  // State: Tail Interval Analysis (X axis [rangeA, rangeB])
  const [rangeA, setRangeA] = useState<number>(-2);
  const [rangeB, setRangeB] = useState<number>(2);

  // Coordinate interval bounds dynamically determined by distribution and parameters
  const xBounds = useMemo(() => {
    switch (currentDist.type) {
      case "Normal": {
        const mu = params.mu ?? 0;
        const sigma = params.sigma ?? 1;
        return { min: mu - 4 * sigma, max: mu + 4 * sigma, discrete: false, step: 0.1 };
      }
      case "Binomial": {
        const n = params.n ?? 20;
        return { min: 0, max: n, discrete: true, step: 1 };
      }
      case "Poisson": {
        const lambda = params.lambda ?? 4;
        const limit = Math.max(12, Math.round(lambda + 4 * Math.sqrt(lambda)));
        return { min: 0, max: limit, discrete: true, step: 1 };
      }
      case "Exponential": {
        const lambda = params.lambda ?? 1;
        return { min: 0, max: Math.ceil(5 / lambda), discrete: false, step: 0.05 };
      }
      case "Gamma": {
        const alpha = params.alpha ?? 2;
        const beta = params.beta ?? 1.5;
        const mean = alpha / beta;
        const std = Math.sqrt(alpha) / beta;
        return { min: 0, max: Math.max(5, Math.ceil(mean + 4 * std)), discrete: false, step: 0.05 };
      }
      case "Beta": {
        return { min: 0, max: 1, discrete: false, step: 0.01 };
      }
      default:
        return { min: 0, max: 10, discrete: false, step: 0.1 };
    }
  }, [currentDist, params]);

  // Update selection interval range sliders boundaries when parameters change
  useEffect(() => {
    const span = xBounds.max - xBounds.min;
    if (currentDist.type === "Beta") {
      setRangeA(0.2);
      setRangeB(0.6);
    } else if (currentDist.discrete) {
      setRangeA(Math.floor(xBounds.min + span * 0.25));
      setRangeB(Math.ceil(xBounds.min + span * 0.75));
    } else {
      setRangeA(parseFloat((xBounds.min + span * 0.35).toFixed(2)));
      setRangeB(parseFloat((xBounds.min + span * 0.65).toFixed(2)));
    }
  }, [xBounds, currentDist]);

  const statsCalculated = useMemo(() => {
    return currentDist.stats(params);
  }, [currentDist, params]);

  // Prepare standard theoretical dataset for drawing PMF/PDF and CDF curves
  const theoryData = useMemo(() => {
    const data = [];
    const min = xBounds.min;
    const max = xBounds.max;

    if (xBounds.discrete) {
      for (let x = min; x <= max; x += 1) {
        const pdfVal = PDFMap[currentDist.type](x, params);
        const cdfVal = CDFMap[currentDist.type](x, params);
        const insideRange = x >= rangeA && x <= rangeB;
        data.push({
          x,
          pdf: pdfVal,
          cdf: cdfVal,
          highlightedPdf: insideRange ? pdfVal : null,
          pdfLabel: pdfVal.toFixed(4),
          cdfLabel: cdfVal.toFixed(4),
        });
      }
    } else {
      const step = xBounds.step;
      // Add extra padding
      for (let x = min; x <= max; x += step) {
        const safeX = parseFloat(x.toFixed(3));
        const pdfVal = PDFMap[currentDist.type](safeX, params);
        const cdfVal = CDFMap[currentDist.type](safeX, params);
        const insideRange = safeX >= rangeA && safeX <= rangeB;

        // Skip boundary infinity
        const displayPdf = pdfVal === Infinity || isNaN(pdfVal) ? null : pdfVal;

        data.push({
          x: safeX,
          pdf: displayPdf,
          cdf: cdfVal,
          highlightedPdf: insideRange && displayPdf !== null ? displayPdf : null,
        });
      }
    }
    return data;
  }, [currentDist, params, xBounds, rangeA, rangeB]);

  // Exact cumulative probability calculated from index range [rangeA, rangeB]
  const exactIntervalValue = useMemo(() => {
    if (xBounds.discrete) {
      let sum = 0;
      for (let x = Math.ceil(rangeA); x <= Math.floor(rangeB); x++) {
        sum += PDFMap[currentDist.type](x, params);
      }
      return Math.min(1, sum);
    } else {
      // Numerical integration of PDF between rangeA and rangeB
      const steps = 200;
      const stepSize = (rangeB - rangeA) / steps;
      let sum = 0;
      for (let i = 0; i < steps; i++) {
        const t = rangeA + (i + 0.5) * stepSize;
        const pdfVal = PDFMap[currentDist.type](t, params);
        sum += pdfVal * stepSize;
      }
      return Math.min(1, sum);
    }
  }, [currentDist, params, rangeA, rangeB, xBounds]);

  // Confidence Interval zones calculation based on Expectation & Variance
  const ciZones = useMemo(() => {
    const mean = statsCalculated.mean;
    const variance = statsCalculated.variance;

    if (isNaN(mean) || isNaN(variance) || variance <= 0) {
      return null;
    }
    const stdDev = Math.sqrt(variance);

    return {
      mean,
      stdDev,
      sigma1Min: Math.max(xBounds.min, mean - stdDev),
      sigma1Max: Math.min(xBounds.max, mean + stdDev),
      sigma2Min: Math.max(xBounds.min, mean - 2 * stdDev),
      sigma2Max: Math.min(xBounds.max, mean + 2 * stdDev),
      sigma3Min: Math.max(xBounds.min, mean - 3 * stdDev),
      sigma3Max: Math.min(xBounds.max, mean + 3 * stdDev),
    };
  }, [statsCalculated, xBounds]);

  // Dynamic Quantiles (5%, 25%, 50%, 75%, 95%) derived from active distribution theoryData
  const quantileData = useMemo(() => {
    const targetPs = [0.05, 0.25, 0.50, 0.75, 0.95];
    const isDiscrete = currentDist.discrete;

    if (!theoryData || theoryData.length === 0) {
      return targetPs.map((p) => ({
        p,
        percentStr: `${(p * 100).toFixed(0)}%`,
        x: 0,
        label: p === 0.5 ? "中位数 (50% / Median)" : `${(p * 100).toFixed(0)}% 分位数`
      }));
    }

    return targetPs.map((p) => {
      let resultX = 0;

      if (isDiscrete) {
        // Find smallest point where cdf >= p
        const matched = theoryData.find((item) => item.cdf >= p);
        resultX = matched ? matched.x : theoryData[theoryData.length - 1].x;
      } else {
        // For continuous distributions, find the interval containing p and interpolate
        let idx = -1;
        for (let i = 0; i < theoryData.length - 1; i++) {
          if (theoryData[i].cdf <= p && theoryData[i + 1].cdf >= p) {
            idx = i;
            break;
          }
        }

        if (idx !== -1) {
          const item1 = theoryData[idx];
          const item2 = theoryData[idx + 1];
          const x1 = item1.x;
          const x2 = item2.x;
          const y1 = item1.cdf;
          const y2 = item2.cdf;

          if (Math.abs(y2 - y1) < 1e-9) {
            resultX = x1;
          } else {
            resultX = x1 + ((p - y1) / (y2 - y1)) * (x2 - x1);
          }
        } else {
          // Fallback if p is out of computed bounds
          if (p < theoryData[0].cdf) {
            resultX = theoryData[0].x;
          } else {
            resultX = theoryData[theoryData.length - 1].x;
          }
        }
      }

      return {
        p,
        percentStr: `${(p * 100).toFixed(0)}%`,
        x: parseFloat(resultX.toFixed(4)),
        label: p === 0.5 ? "中位数 (50% / Median)" : `${(p * 100).toFixed(0)}% 分位数`
      };
    });
  }, [theoryData, currentDist]);

  const exportQuantilesToCSV = () => {
    const headers = ["分位数类型 (Quantile Type)", "累积概率百分比 (Cumulative Probability %)", "对应 X 轴数值 (Critical Value X)"];
    const rows = quantileData.map((row) => [
      row.label,
      row.percentStr,
      row.x.toString()
    ]);
    
    const csvContent = [
      headers.join(","),
      ...rows.map((e) => e.join(","))
    ].join("\n");

    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${selectedDistType}_Quantiles_Calculations.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ----------------------------------------------------
  // Tab 2: Sampling Lab State Engine
  // ----------------------------------------------------
  const [samples, setSamples] = useState<number[]>([]);
  const [sampleSizeOption, setSampleSizeOption] = useState<number>(500);
  const [isSampling, setIsSampling] = useState<boolean>(false);

  // Generate dynamic random samples
  const triggerSampling = (size: number) => {
    setIsSampling(true);
    // Simulate short network delay to give a beautiful loading experience
    setTimeout(() => {
      const results: number[] = [];
      for (let i = 0; i < size; i++) {
        results.push(sampleDistribution(currentDist.type, params));
      }
      setSamples(results);
      setIsSampling(false);
    }, 400);
  };

  // Empirical stats
  const sampleStats = useMemo(() => {
    if (samples.length === 0) return null;
    const n = samples.length;
    const sum = samples.reduce((a, b) => a + b, 0);
    const mean = sum / n;
    const sqDiffSum = samples.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0);
    const variance = n > 1 ? sqDiffSum / (n - 1) : 0;
    return { mean, variance, count: n };
  }, [samples]);

  // Histogram Bin analysis for Samples
  const sampleHistogramData = useMemo(() => {
    if (samples.length === 0) return [];
    
    if (xBounds.discrete) {
      // Discrete variables: bucket by every integer
      const counts: Record<number, number> = {};
      samples.forEach((val) => {
        const r = Math.round(val);
        counts[r] = (counts[r] || 0) + 1;
      });

      const data = [];
      const min = xBounds.min;
      const max = xBounds.max;
      for (let x = min; x <= max; x++) {
        const count = counts[x] || 0;
        const empiricalDensity = count / samples.length;
        const theoreticalDensity = PDFMap[currentDist.type](x, params);
        data.push({
          xLabel: x.toString(),
          empirical: empiricalDensity,
          theoretical: theoreticalDensity,
        });
      }
      return data;
    } else {
      // Continuous variables: bucket by 15 equally spaced intervals
      const minVal = xBounds.min;
      const maxVal = xBounds.max;
      const binCount = 15;
      const binWidth = (maxVal - minVal) / binCount;
      const binCounts = new Array(binCount).fill(0);

      samples.forEach((val) => {
        if (val >= minVal && val <= maxVal) {
          const binIdx = Math.min(binCount - 1, Math.floor((val - minVal) / binWidth));
          binCounts[binIdx]++;
        }
      });

      return binCounts.map((count, idx) => {
        const midX = minVal + (idx + 0.5) * binWidth;
        const empiricalDensity = count / (samples.length * binWidth); // Area = 1 normalizing
        const theoreticalDensity = PDFMap[currentDist.type](midX, params);
        return {
          xLabel: `${midX.toFixed(1)}`,
          empirical: empiricalDensity,
          theoretical: theoreticalDensity,
        };
      });
    }
  }, [samples, xBounds, currentDist, params]);

  // Running cumulative average line (Law of Large Numbers Visualizer)
  const llnAverageCurve = useMemo(() => {
    if (samples.length === 0) return [];
    // Sample a maximum of 100 plotting points to prevent chart lag
    const maxPlotPoints = 120;
    const stride = Math.max(1, Math.floor(samples.length / maxPlotPoints));
    const data = [];
    let runningSum = 0;

    for (let i = 0; i < samples.length; i++) {
      runningSum += samples[i];
      if (i % stride === 0 || i === samples.length - 1) {
        data.push({
          index: i + 1,
          runningAverage: runningSum / (i + 1),
          truth: statsCalculated.mean,
        });
      }
    }
    return data;
  }, [samples, statsCalculated]);


  // ----------------------------------------------------
  // Tab 3: Monte Carlo Probability Estimator State Engine
  // ----------------------------------------------------
  const [mcDarts, setMCDarts] = useState<{ x: number; y: number; isUnder: boolean }[]>([]);
  const [mcTotalCount, setMCTotalCount] = useState<number>(1000);
  const [mcEstimating, setMCEstimating] = useState<boolean>(false);
  const [mcIteration, setMCIteration] = useState<number>(0);

  // Slow motion animation options
  const [mcSlowMotion, setMcSlowMotion] = useState<boolean>(true);
  const [mcVisibleCount, setMcVisibleCount] = useState<number>(0);
  const [mcIsPlaying, setMcIsPlaying] = useState<boolean>(false);
  const [mcSpeed, setMcSpeed] = useState<number>(5); // defaults to 5 darts per tick/frame

  // Maximum value of the PDF inside [rangeA, rangeB] for bounding box height
  const boundingH = useMemo(() => {
    let maxPDF = 0.1;
    // Probe points to find peak
    const probes = 50;
    const step = (rangeB - rangeA) / probes;
    for (let i = 0; i <= probes; i++) {
      const probeX = rangeA + i * step;
      const pdfVal = PDFMap[currentDist.type](probeX, params);
      if (pdfVal !== Infinity && !isNaN(pdfVal) && pdfVal > maxPDF) {
        maxPDF = pdfVal;
      }
    }
    return maxPDF * 1.15; // padding top
  }, [currentDist, params, rangeA, rangeB]);

  // Run Monte Carlo throws
  const runMonteCarloSimulation = () => {
    setMCEstimating(true);
    const count = mcTotalCount;
    const darts: { x: number; y: number; isUnder: boolean }[] = [];
    let hits = 0;

    for (let i = 0; i < count; i++) {
      const x = rangeA + Math.random() * (rangeB - rangeA);
      const y = Math.random() * boundingH;
      const actualPDF = PDFMap[currentDist.type](x, params);
      const isUnder = y <= actualPDF;
      if (isUnder) hits++;
      darts.push({ x, y, isUnder });
    }

    setMCDarts(darts);
    setMCIteration((prev) => prev + 1);

    if (mcSlowMotion) {
      setMcVisibleCount(0);
      setMcIsPlaying(true);
    } else {
      setMcVisibleCount(count);
      setMcIsPlaying(false);
      setMCEstimating(false);
    }
  };

  // Get visible subset of darts
  const mcVisibleDarts = useMemo(() => {
    return mcDarts.slice(0, mcVisibleCount);
  }, [mcDarts, mcVisibleCount]);

  // Live calculation of estimated probability using visible dart hits count
  const mcEstimatedProbability = useMemo(() => {
    if (mcVisibleDarts.length === 0) return 0;
    const hits = mcVisibleDarts.filter((d) => d.isUnder).length;
    const boxArea = (rangeB - rangeA) * boundingH;
    const successRatio = hits / mcVisibleDarts.length;
    return boxArea * successRatio;
  }, [mcVisibleDarts, rangeA, rangeB, boundingH]);

  // Effect: Incremental drop animation for Monte Carlo points
  useEffect(() => {
    if (!mcIsPlaying) return;
    if (mcDarts.length === 0) {
      setMcIsPlaying(false);
      setMCEstimating(false);
      return;
    }
    if (mcVisibleCount >= mcDarts.length) {
      setMcIsPlaying(false);
      setMCEstimating(false);
      return;
    }

    const timer = setTimeout(() => {
      setMcVisibleCount((prev) => {
        const next = prev + mcSpeed;
        if (next >= mcDarts.length) {
          setMcIsPlaying(false);
          setMCEstimating(false);
          return mcDarts.length;
        }
        return next;
      });
    }, 16);

    return () => clearTimeout(timer);
  }, [mcIsPlaying, mcDarts.length, mcVisibleCount, mcSpeed]);


  // ====================================================
  // CLT Central Limit Theorem Sandbox State & Code Engine
  // ====================================================
  const CLT_POPULATION_METADATA = useMemo(() => ({
    bimodal: {
      id: "bimodal",
      nameCH: "双峰混合分布 (Bimodal)",
      desc: "由两个正态分布 N(2, 0.5) 与 N(6, 0.8) 按权重 0.4:0.6 叠加而成。两个明显的山峰中间夹着深谷，是典型的不规则非对称分布。",
      mean: 4.4,
      variance: 4.324,
      xMin: -1,
      xMax: 10,
      pdf: (x: number) => {
        const phi = (v: number, mu: number, sig: number) => 
          Math.exp(-Math.pow(v - mu, 2) / (2 * sig * sig)) / (sig * Math.sqrt(2 * Math.PI));
        return 0.4 * phi(x, 2, 0.5) + 0.6 * phi(x, 6, 0.8);
      },
      sampler: () => {
        const phiRaw = (mu: number, sig: number) => {
          let u1 = 0, u2 = 0;
          while (u1 === 0) u1 = Math.random();
          while (u2 === 0) u2 = Math.random();
          const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
          return mu + z * sig;
        };
        return Math.random() < 0.4 ? phiRaw(2, 0.5) : phiRaw(6, 0.8);
      }
    },
    skewed_exponential: {
      id: "skewed_exponential",
      nameCH: "极度右偏指数 (Exponential)",
      desc: "指数分布 (λ = 1.25)。最大峰值堆积在左侧 X=0 处，有着极长的右偏尾部，极度偏倚、极不均匀。",
      mean: 0.8,
      variance: 0.64,
      xMin: 0,
      xMax: 6,
      pdf: (x: number) => (x >= 0 ? 1.25 * Math.exp(-1.25 * x) : 0),
      sampler: () => -Math.log(1.0 - Math.random()) / 1.25
    },
    skewed_beta: {
      id: "skewed_beta",
      nameCH: "不对称贝塔 (Skewed Beta)",
      desc: "贝塔分布 Beta(1.5, 6.0)。限定在 [0, 1] 的狭窄区间，重心极度偏向左方，呈现偏态长舌状斜坡。",
      mean: 1.5 / 7.5,
      variance: (1.5 * 6.0) / (7.5 * 7.5 * 8.5),
      xMin: 0,
      xMax: 1,
      pdf: (x: number) => {
        if (x < 0 || x > 1) return 0;
        const B = Math.exp(logBeta(1.5, 6.0));
        return Math.pow(x, 0.5) * Math.pow(1 - x, 5) / B;
      },
      sampler: () => {
        const randomGammaLocal = (alpha: number, beta: number): number => {
          if (alpha < 1) {
            return randomGammaLocal(alpha + 1, beta) * Math.pow(Math.random(), 1 / alpha);
          }
          const d = alpha - 1/3;
          const c = 1 / Math.sqrt(9 * d);
          while (true) {
            let u = Math.random();
            let u1 = 0, u2 = 0;
            while (u1 === 0) u1 = Math.random();
            while (u2 === 0) u2 = Math.random();
            const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
            let v = 1 + c * z;
            if (v <= 0) continue;
            let v3 = v * v * v;
            if (u < 1 - 0.0331 * z * z * z * z) return (d * v3) / beta;
            if (Math.log(u) < 0.5 * z * z + d * (1 - v3 + Math.log(v3))) return (d * v3) / beta;
          }
        };
        const g1 = randomGammaLocal(1.5, 1);
        const g2 = randomGammaLocal(6.0, 1);
        return g1 + g2 === 0 ? 0.2 : g1 / (g1 + g2);
      }
    },
    uniform: {
      id: "uniform",
      nameCH: "均匀盒分布 (Uniform Box)",
      desc: "均匀分布 U(1, 9)。在 [1, 9] 内是一整平坦平庸的长方形。完全没有均值的“中心尖峰”，是最直观的非正态母体之一。",
      mean: 5.0,
      variance: 64.0 / 12,
      xMin: 0,
      xMax: 10,
      pdf: (x: number) => (x >= 1 && x <= 9 ? 0.125 : 0),
      sampler: () => 1.0 + 8.0 * Math.random()
    },
    spiky_trimode: {
      id: "spiky_trimode",
      nameCH: "疯狂三峰梳齿分布 (Multimodal)",
      desc: "人为构造的怪异多峰分布，由 N(1.5, 0.4)、N(4.5, 0.35) 还有 N(7.5, 0.5) 按权重 0.3:0.35:0.35 拼接。三个尖端尖锐错落排布。",
      mean: 0.3 * 1.5 + 0.35 * 4.5 + 0.35 * 7.5,
      variance: 27.628375 - Math.pow(0.3 * 1.5 + 0.35 * 4.5 + 0.35 * 7.5, 2),
      xMin: -1,
      xMax: 10,
      pdf: (x: number) => {
        const phi = (v: number, mu: number, sig: number) => 
          Math.exp(-Math.pow(v - mu, 2) / (2 * sig * sig)) / (sig * Math.sqrt(2 * Math.PI));
        return 0.3 * phi(x, 1.5, 0.4) + 0.35 * phi(x, 4.5, 0.35) + 0.35 * phi(x, 7.5, 0.5);
      },
      sampler: () => {
        const phiRaw = (mu: number, sig: number) => {
          let u1 = 0, u2 = 0;
          while (u1 === 0) u1 = Math.random();
          while (u2 === 0) u2 = Math.random();
          const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
          return mu + z * sig;
        };
        const r = Math.random();
        if (r < 0.3) return phiRaw(1.5, 0.4);
        if (r < 0.65) return phiRaw(4.5, 0.35);
        return phiRaw(7.5, 0.5);
      }
    }
  }), []);

  const [cltPopType, setCltPopType] = useState<"bimodal" | "skewed_exponential" | "skewed_beta" | "uniform" | "spiky_trimode" >("bimodal");
  const [cltN, setCltN] = useState<number>(15);
  const [cltM, setCltM] = useState<number>(2000);
  const [cltMeans, setCltMeans] = useState<number[]>([]);
  const [cltIsSimulating, setCltIsSimulating] = useState<boolean>(false);
  const [cltWaterfallTracks, setCltWaterfallTracks] = useState<{ id: number; points: number[]; mean: number; isNew?: boolean }[]>([]);
  const [cltZoomMode, setCltZoomMode] = useState<"full" | "focus">("full");

  // Animation Play System
  const [cltIsPlaying, setCltIsPlaying] = useState<boolean>(false);
  const [cltPlaySpeed, setCltPlaySpeed] = useState<number>(300); // interval ms
  const [cltLatestAddedMean, setCltLatestAddedMean] = useState<number | null>(null);

  // Generate statistics for means with skewness and kurtosis index convergence trackers
  const cltStatsCalculated = useMemo(() => {
    if (cltMeans.length === 0) return null;
    const count = cltMeans.length;
    
    // Step 1: Mean
    const sum = cltMeans.reduce((a, b) => a + b, 0);
    const mean = sum / count;
    
    // Step 2: Sum of powers for variance (2nd), skewness (3rd) and kurtosis (4th)
    let sum2 = 0;
    let sum3 = 0;
    let sum4 = 0;
    for (let i = 0; i < count; i++) {
      const diff = cltMeans[i] - mean;
      const diff2 = diff * diff;
      sum2 += diff2;
      sum3 += diff2 * diff;
      sum4 += diff2 * diff2;
    }
    
    const variance = count > 1 ? sum2 / (count - 1) : 0;
    const stdDev = Math.sqrt(variance);
    
    // Pearson's skewness and excess kurtosis (excess = kurtosis - 3)
    let skewness = 0;
    let excessKurtosis = 0;
    if (stdDev > 0) {
      skewness = (sum3 / count) / Math.pow(stdDev, 3);
      excessKurtosis = (sum4 / count) / Math.pow(stdDev, 4) - 3;
    }
    
    return { mean, variance, stdDev, count, skewness, excessKurtosis };
  }, [cltMeans]);

  // Curve data for selected mother population distribution
  const cltPopCurveData = useMemo(() => {
    const pop = CLT_POPULATION_METADATA[cltPopType];
    const points = [];
    const minVal = pop.xMin;
    const maxVal = pop.xMax;
    const step = (maxVal - minVal) / 120;
    
    for (let i = 0; i <= 120; i++) {
      const x = minVal + i * step;
      const y = pop.pdf(x);
      points.push({ x, y });
    }
    return points;
  }, [cltPopType, CLT_POPULATION_METADATA]);

  // Histogram data for sample means
  const cltHistogramData = useMemo(() => {
    if (cltMeans.length === 0) return [];
    const pop = CLT_POPULATION_METADATA[cltPopType];
    const se = Math.sqrt(pop.variance / cltN);
    const mean = pop.mean;
    
    let minVal = pop.xMin;
    let maxVal = pop.xMax;
    
    if (cltZoomMode === "focus") {
      minVal = Math.max(pop.xMin - 0.5, mean - 3.5 * se);
      maxVal = Math.min(pop.xMax + 0.5, mean + 3.5 * se);
    }
    
    const binCount = 35;
    const binWidth = (maxVal - minVal) / binCount;
    if (binWidth <= 1e-9) return [];
    
    const binCounts = new Array(binCount).fill(0);
    
    cltMeans.forEach((v) => {
      if (v >= minVal && v <= maxVal) {
        const binIdx = Math.min(binCount - 1, Math.floor((v - minVal) / binWidth));
        binCounts[binIdx]++;
      }
    });
    
    const normalPDF = (x: number, mu: number, sigma: number) => {
      if (sigma <= 0) return 0;
      return Math.exp(-Math.pow(x - mu, 2) / (2 * sigma * sigma)) / (sigma * Math.sqrt(2 * Math.PI));
    };
    
    return binCounts.map((count, idx) => {
      const midX = minVal + (idx + 0.5) * binWidth;
      const empiricalDensity = count / (cltMeans.length * binWidth);
      const theoreticalDensity = normalPDF(midX, mean, se);
      
      return {
        x: midX,
        xLabel: midX.toFixed(2),
        empirical: empiricalDensity,
        theoretical: theoreticalDensity,
      };
    });
  }, [cltMeans, cltPopType, cltN, cltZoomMode, CLT_POPULATION_METADATA]);

  // Generate Q-Q plot quantile data
  const cltQQPlotData = useMemo(() => {
    if (cltMeans.length < 5) return [];
    
    // Quick standard normal inverse CDF approximation
    const getZScore = (p: number): number => {
      if (p <= 0 || p >= 1) return 0;
      const c = [2.515517, 0.802853, 0.010328];
      const d = [1.432788, 0.189269, 0.001308];
      const t = Math.sqrt(-2.0 * Math.log(p < 0.5 ? p : 1.0 - p));
      const val = t - ((c[2] * t + c[1]) * t + c[0]) / (((d[2] * t + d[1]) * t + d[0]) * t + 1.0);
      return p < 0.5 ? -val : val;
    };

    const sortedMeans = [...cltMeans].sort((a, b) => a - b);
    const nPoints = Math.min(45, sortedMeans.length);
    const data = [];
    
    const pop = CLT_POPULATION_METADATA[cltPopType];
    const theoreticalSE = Math.sqrt(pop.variance / cltN);
    const mu = pop.mean;
    
    for (let i = 1; i <= nPoints; i++) {
       const p = (i - 0.5) / nPoints;
       const z = getZScore(p);
       const theoreticalQ = mu + z * theoreticalSE;
       
       const empIdx = Math.min(
         sortedMeans.length - 1,
         Math.floor(p * sortedMeans.length)
       );
       const empiricalQ = sortedMeans[empIdx];
       
       data.push({
         theoretical: theoreticalQ,
         empirical: empiricalQ,
         refLine: theoreticalQ, // Base 45 deg line (ref value)
         p,
       });
    }
    return data;
  }, [cltMeans, cltPopType, cltN]);

  // Draw exactly 1 single trial of size N and append
  const drawOneCltSample = () => {
    const pop = CLT_POPULATION_METADATA[cltPopType];
    const points: number[] = [];
    let sum = 0;
    for (let i = 0; i < cltN; i++) {
      const val = pop.sampler();
      points.push(val);
      sum += val;
    }
    const meanVal = sum / cltN;

    setCltMeans((prev) => {
      const updated = [...prev, meanVal];
      if (updated.length > 25000) {
        return updated.slice(updated.length - 25000);
      }
      return updated;
    });

    setCltLatestAddedMean(meanVal);

    setCltWaterfallTracks((prev) => {
      const newTrack = {
        id: Math.random() + Date.now(),
        points,
        mean: meanVal,
        isNew: true
      };
      return [newTrack, ...prev.map(t => ({ ...t, isNew: false }))].slice(0, 5);
    });
  };

  // Run a single full CLT simulation
  const runCLTSimulation = () => {
    setCltIsSimulating(true);
    const pop = CLT_POPULATION_METADATA[cltPopType];
    const means: number[] = [];
    const tracks: { id: number; points: number[]; mean: number }[] = [];
    
    for (let trial = 0; trial < cltM; trial++) {
      let sum = 0;
      const points: number[] = [];
      for (let i = 0; i < cltN; i++) {
        const val = pop.sampler();
        sum += val;
        if (trial < 5) {
          points.push(val);
        }
      }
      const meanVal = sum / cltN;
      means.push(meanVal);
      
      if (trial < 5) {
        tracks.push({
          id: trial + 1,
          points: points,
          mean: meanVal
        });
      }
    }
    
    setCltMeans(means);
    setCltWaterfallTracks(tracks.reverse());
    
    setTimeout(() => {
      setCltIsSimulating(false);
    }, 120);
  };

  // Automatic live sampling interval
  useEffect(() => {
    if (!cltIsPlaying) return;
    const intervalId = setInterval(() => {
      drawOneCltSample();
    }, cltPlaySpeed);
    return () => clearInterval(intervalId);
  }, [cltIsPlaying, cltPlaySpeed, cltPopType, cltN]);

  // Synchronize simulation on change or tab select
  useEffect(() => {
    if (activeTab === "clt") {
      runCLTSimulation();
    } else {
      setCltIsPlaying(false);
    }
  }, [cltPopType, cltN, cltM, activeTab]);


  // Apply preset handler
  const handleApplyPreset = (preset: ExperimentPreset) => {
    setParams({ ...preset.params });
  };

  const handleApplyDistributionFromAI = (type: DistributionType, newParams: Record<string, number>) => {
    setSelectedDistType(type);
    setParams(newParams);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 font-sans text-slate-800">
      
      {/* LEFT CONTENT AREA (Sidebar / Dashboard master controller + Tabbed visualizer workspace) */}
      <div className="flex flex-1 flex-col overflow-hidden">
        
        {/* Top Header navbar with premium branding and controls */}
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-8 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 shadow-sm shadow-indigo-600/20">
              <Compass className="h-5 w-5 text-white animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight text-slate-900">
                  概率分布画廊 <span className="text-indigo-600 font-bold italic text-base">Gallery</span>
                </h1>
                <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-600 border border-indigo-100/80">
                  Interactive Stats Lab
                </span>
              </div>
            </div>
          </div>

          {/* Core Menu Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-full">
            <button
              onClick={() => setActiveTab("theory")}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                activeTab === "theory"
                  ? "bg-white text-indigo-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Sliders className="h-3.5 w-3.5" />
              <span>理论函数图谱</span>
            </button>
            <button
              onClick={() => setActiveTab("sampling")}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                activeTab === "sampling"
                  ? "bg-white text-indigo-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <BarChart4 className="h-3.5 w-3.5" />
              <span>随机采样实验室</span>
            </button>
            <button
              onClick={() => setActiveTab("montecarlo")}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                activeTab === "montecarlo"
                  ? "bg-white text-indigo-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Target className="h-3.5 w-3.5" />
              <span>蒙特卡洛积分实验</span>
            </button>
            <button
              onClick={() => setActiveTab("clt")}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                activeTab === "clt"
                  ? "bg-white text-indigo-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Sparkles className="h-3.5 w-3.5 text-indigo-500 animate-pulse" />
              <span>CLT 渐进沙盒</span>
            </button>
            <button
              onClick={() => setActiveTab("knowledge")}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                activeTab === "knowledge"
                  ? "bg-white text-indigo-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span>知识学堂</span>
            </button>
          </div>

          {/* AI Toggle option */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen((prev) => !prev)}
              className="flex items-center gap-3 bg-slate-100 p-1.5 px-3 rounded-full hover:bg-slate-200/80 transition-colors"
            >
              <div className="flex items-center gap-1.5">
                <Sparkles className={`h-3.5 w-3.5 ${isSidebarOpen ? 'text-indigo-600' : 'text-slate-400'}`} />
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">AI 私教</span>
              </div>
              <div className={`w-9 h-5 rounded-full relative transition-colors duration-200 ${isSidebarOpen ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all duration-200 ${isSidebarOpen ? 'right-1' : 'left-1'}`}></div>
              </div>
            </button>
          </div>
        </header>

        {/* Dashboard Panels Work space */}
        <div className="flex flex-1 overflow-hidden">
          
          {/* Master Controller Left column */}
          <aside className="w-80 border-r border-slate-200 bg-white p-5 overflow-y-auto space-y-6 shrink-0 flex flex-col justify-between">
            
            <div className="space-y-6">
              {/* Distribution Selector Segment */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                  选择研究的随机模型
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {distributions.map((dist) => (
                    <button
                      key={dist.type}
                      onClick={() => setSelectedDistType(dist.type)}
                      className={`relative flex flex-col text-left p-3 rounded-xl border text-xs transition-all duration-200 ${
                        selectedDistType === dist.type
                          ? "bg-indigo-50 border-indigo-200 text-indigo-700 font-bold shadow-sm"
                          : "bg-slate-50 border-transparent hover:bg-slate-100 text-slate-600"
                      }`}
                    >
                      <span className="font-bold block mb-1 text-[13px]">{dist.nameCH.split(" ")[0]}</span>
                      <span className="text-[9px] text-slate-400 font-mono block lowercase mt-1 text-right w-full">
                        {dist.typeCH}
                      </span>
                      {selectedDistType === dist.type && (
                        <span className="absolute top-2 right-2 flex h-1.5 w-1.5 rounded-full bg-indigo-600" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Slider Controller Module */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                  <h3 className="text-xs font-bold text-slate-500 tracking-wider uppercase">调节分布内部参数</h3>
                  <Sliders className="h-3 w-3 text-slate-400" />
                </div>
                
                <div className="space-y-4 text-xs">
                  {currentDist.parameters.map((p) => {
                    const currentVal = params[p.name] ?? p.defaultValue;
                    const isRoaming = roamingParam === p.name;
                    return (
                      <div key={p.name} className="space-y-1.5 p-1 rounded-xl">
                        <div className="flex justify-between items-center text-[12px]">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-slate-600">{p.label}</span>
                            <button
                              onClick={() => {
                                if (isRoaming) {
                                  setRoamingParam(null);
                                } else {
                                  setRoamingParam(p.name);
                                  setRoamingDirection("up");
                                }
                              }}
                              className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold tracking-wider transition-all border shrink-0 flex items-center gap-0.5 cursor-pointer select-none active:scale-95 ${
                                isRoaming
                                  ? "bg-rose-50 text-rose-600 border-rose-200 animate-pulse"
                                  : "bg-white hover:bg-slate-100 text-slate-500 border-slate-200/80"
                              }`}
                              title={isRoaming ? "停止漫游" : "开启参数自动漫游飞行"}
                            >
                              {isRoaming ? (
                                <>
                                  <Pause className="h-2.5 w-2.5 text-rose-600 fill-current" />
                                  <span>停止</span>
                                </>
                              ) : (
                                <>
                                  <Play className="h-2.5 w-2.5 text-slate-500 fill-current" />
                                  <span>漫游</span>
                                </>
                              )}
                            </button>
                          </div>
                          <span className="font-mono text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full text-[11px] font-bold">
                            {currentVal}
                          </span>
                        </div>
                        <input
                          type="range"
                          min={p.min}
                          max={p.max}
                          step={p.step}
                          value={currentVal}
                          disabled={isRoaming}
                          onChange={(e) => handleParamChange(p.name, parseFloat(e.target.value))}
                          className={`w-full h-1.5 rounded-full appearance-none accent-indigo-600 ${
                            isRoaming ? "bg-indigo-100 opacity-60 cursor-not-allowed" : "bg-slate-200 cursor-pointer"
                          }`}
                        />
                        <p className="text-[10px] text-slate-400 italic leading-snug">{p.description}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Interval Analysis highlighters */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 tracking-wider uppercase block">概率区间选择器</span>
                  <TooltipIcon className="h-3.5 w-3.5 text-slate-400" />
                </div>
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  拉动指针选定区间底界 <MathLaTeX math="[a, b]" />，计算累积概率 <MathLaTeX math="P(a \le X \le b)" />
                </p>

                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-[11px] mb-1 font-mono text-slate-500 font-bold">
                      <span>区间起点 (a):</span>
                      <span className="text-indigo-600">{rangeA}</span>
                    </div>
                    <input
                      type="range"
                      min={xBounds.min}
                      max={rangeB}
                      step={xBounds.discrete ? 1 : 0.05}
                      value={rangeA}
                      onChange={(e) => setRangeA(parseFloat(parseFloat(e.target.value).toFixed(2)))}
                      className="w-full h-1.5 bg-slate-200 rounded-full appearance-none cursor-pointer accent-emerald-500"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-[11px] mb-1 font-mono text-slate-500 font-bold">
                      <span>区间终点 (b):</span>
                      <span className="text-indigo-600">{rangeB}</span>
                    </div>
                    <input
                      type="range"
                      min={rangeA}
                      max={xBounds.max}
                      step={xBounds.discrete ? 1 : 0.05}
                      value={rangeB}
                      onChange={(e) => setRangeB(parseFloat(parseFloat(e.target.value).toFixed(2)))}
                      className="w-full h-1.5 bg-slate-200 rounded-full appearance-none cursor-pointer accent-emerald-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Micro mathematical properties panel info at sidebar footer */}
            <div className="pt-4 border-t border-slate-200 space-y-2 mt-4">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                理论特征数 (Theoretical Stats)
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col justify-between">
                  <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">期望均值 E(X)</span>
                  <span className="text-slate-900 font-mono text-sm font-bold mt-1">{formatNumber(statsCalculated.mean, 4)}</span>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col justify-between">
                  <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">方差 Var(X)</span>
                  <span className="text-slate-900 font-mono text-sm font-bold mt-1">{formatNumber(statsCalculated.variance, 4)}</span>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col justify-between">
                  <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">偏度 Skewness</span>
                  <span className="text-slate-900 font-mono text-sm font-bold mt-1">{formatNumber(statsCalculated.skewness, 4)}</span>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col justify-between">
                  <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">峰度 Kurtosis</span>
                  <span className="text-slate-900 font-mono text-sm font-bold mt-1">{formatNumber(statsCalculated.kurtosis, 4)}</span>
                </div>
              </div>
            </div>

          </aside>

          {/* MAIN VISUAL WORKSPACE PANEL */}
          <main className="flex-1 overflow-y-auto p-6 bg-slate-50 space-y-6">

            {/* Quick overview of selected distribution */}
            <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 p-5 flex items-start justify-between flex-wrap gap-4 shadow-lg shadow-indigo-950/20">
              <div className="max-w-2xl space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                    currentDist.typeCH === "离散型" ? "bg-amber-400/10 text-amber-400 border border-amber-400/20" : "bg-cyan-400/10 text-cyan-400 border border-cyan-400/20"
                  }`}>
                    {currentDist.typeCH}
                  </span>
                  <h2 className="text-lg font-bold text-white tracking-tight">{currentDist.nameCH}</h2>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed font-normal">{currentDist.description}</p>
              </div>

              {/* Dynamic probability area math card */}
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/40 p-4 min-w-[200px] flex flex-col justify-center text-center">
                <span className="text-[10px] font-bold tracking-wider text-emerald-400 uppercase block mb-1">
                  区间概率累计值
                </span>
                <span className="text-xs text-slate-300 block">
                  <MathLaTeX math={`P(${rangeA} \\le X \\le ${rangeB})`} />
                </span>
                <span className="text-2xl font-black text-emerald-300 font-mono tracking-tight mt-1">
                  {(exactIntervalValue * 100).toFixed(2)}%
                </span>
                <span className="text-[9px] text-slate-400 block mt-1 font-mono">
                  ( 包含于绿色高亮区间 )
                </span>
              </div>
            </div>

            {/* TAB INTERFACES */}

            {/* Tab 1: Theory function drawing curves */}
            {activeTab === "theory" && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fadeIn">
                
                {/* PDF/PMF Chart */}
                <div id="pdf-chart-card" className="rounded-3xl border border-slate-200 bg-white p-6 flex flex-col h-[400px] shadow-sm relative">
                  <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                    <div>
                      <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-indigo-600" />
                        {currentDist.pdfLabel} 曲线
                      </h3>
                      <p className="text-[10px] text-slate-400">直观展示期望在 X 轴上的瞬间概率高度 (a到b区域呈绿色高亮)</p>
                    </div>
                    
                    {/* Right action aligned panel */}
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <div id="btn-group-pdf-chart-card" className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-200/60 animate-fadeIn">
                        <button
                          onClick={() => setShowCI(!showCI)}
                          title="在图表中显示或隐藏 1σ, 2σ, 3σ 置信区间阴影"
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all border shadow-sm cursor-pointer select-none active:scale-95 ${
                            showCI
                              ? "bg-indigo-600 border-indigo-600 text-white hover:bg-indigo-700"
                              : "bg-white border-slate-200/60 text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${showCI ? "bg-white animate-pulse" : "bg-slate-400"}`} />
                          <span>置信区间 (±kσ)</span>
                        </button>
                        <button
                          onClick={() => exportPng("pdf-chart-card", `${selectedDistType}_PDF_Curve_Transparent`)}
                          title="导出透明背景 PNG 截图"
                          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold text-indigo-600 bg-white border border-indigo-100/60 hover:bg-slate-100 hover:text-indigo-700 active:scale-95 transition-all shadow-sm cursor-pointer"
                        >
                          <Download className="h-3 w-3" />
                          <span>PNG (透明)</span>
                        </button>
                        <button
                          onClick={() => exportSvg("pdf-chart-card", `${selectedDistType}_PDF_Curve_Vector`)}
                          title="导出无损静态矢量 SVG"
                          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold text-slate-600 bg-white border border-slate-200/60 hover:bg-slate-100 active:scale-95 transition-all shadow-sm cursor-pointer"
                        >
                          <Download className="h-3 w-3" />
                          <span>SVG (矢量)</span>
                        </button>
                      </div>

                      {/* formula display */}
                      <div className="bg-indigo-50/60 rounded-lg px-2.5 py-1 text-xs border border-indigo-100/40 text-slate-700 flex items-center justify-center">
                        <MathLaTeX math={currentDist.formulaPDF} />
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 w-full min-h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={theoryData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorPdf" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                          </linearGradient>
                          <linearGradient id="colorHighlight" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis
                          dataKey="x"
                          type="number"
                          domain={[xBounds.min, xBounds.max]}
                          tick={{ fill: "#475569", fontSize: 10 }}
                          tickLine={{ stroke: "#cbd5e1" }}
                        />
                        <YAxis tick={{ fill: "#475569", fontSize: 10 }} tickLine={{ stroke: "#cbd5e1" }} />
                        <RechartsTooltip
                          contentStyle={{ backgroundColor: "#ffffff", borderColor: "#cbd5e1", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
                          labelStyle={{ color: "#1e293b", fontSize: "11px", fontWeight: "bold" }}
                          itemStyle={{ fontSize: "11px", color: "#475569" }}
                        />

                        {/* Shaded Confidence Intervals */}
                        {showCI && ciZones && (
                          <ReferenceArea
                            x1={ciZones.sigma3Min}
                            x2={ciZones.sigma3Max}
                            {...({
                              fill: "#ec4899",
                              fillOpacity: 0.03,
                              stroke: "none"
                            } as any)}
                            label={{ value: "3σ (99.7%)", position: "insideBottomRight", fill: "#db2777", fontSize: 8, opacity: 0.6 }}
                          />
                        )}
                        {showCI && ciZones && (
                          <ReferenceArea
                            x1={ciZones.sigma2Min}
                            x2={ciZones.sigma2Max}
                            {...({
                              fill: "#8b5cf6",
                              fillOpacity: 0.05,
                              stroke: "none"
                            } as any)}
                            label={{ value: "2σ (95.4%)", position: "insideBottomRight", fill: "#7c3aed", fontSize: 8, opacity: 0.7 }}
                          />
                        )}
                        {showCI && ciZones && (
                          <ReferenceArea
                            x1={ciZones.sigma1Min}
                            x2={ciZones.sigma1Max}
                            {...({
                              fill: "#3b82f6",
                              fillOpacity: 0.09,
                              stroke: "none"
                            } as any)}
                            label={{ value: "1σ (68.3%)", position: "insideBottomRight", fill: "#2563eb", fontSize: 8, opacity: 0.8 }}
                          />
                        )}
                        {showCI && ciZones && (
                          <ReferenceLine
                            x={ciZones.mean}
                            stroke="#4338ca"
                            strokeWidth={1.5}
                            strokeDasharray="4 4"
                            label={{ value: `E(X)=${ciZones.mean.toFixed(2)}`, position: "top", fill: "#4338ca", fontSize: 9, fontWeight: "bold" }}
                          />
                        )}

                        {/* Base Area Under the Curve */}
                        <Area
                          type={xBounds.discrete ? "step" : "monotone"}
                          dataKey="pdf"
                          stroke="#6366f1"
                          strokeWidth={2.5}
                          fill="url(#colorPdf)"
                          dot={false}
                          name={currentDist.pdfLabel}
                        />
                        {/* Highlighted Interval area overlay */}
                        <Area
                          type={xBounds.discrete ? "step" : "monotone"}
                          dataKey="highlightedPdf"
                          stroke="#10b981"
                          strokeWidth={0}
                          fill="url(#colorHighlight)"
                          dot={false}
                          name="选定区间 PDF"
                        />
                        <ReferenceLine x={rangeA} stroke="#10b981" strokeDasharray="3 3" />
                        <ReferenceLine x={rangeB} stroke="#10b981" strokeDasharray="3 3" />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* CDF Curve */}
                <div id="cdf-chart-card" className="rounded-3xl border border-slate-200 bg-white p-6 flex flex-col h-[400px] shadow-sm relative">
                  <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                    <div>
                      <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-violet-600" />
                        累积分布函数 (CDF) 曲线
                      </h3>
                      <p className="text-[10px] text-slate-400">累计积分累加概率，$F(x) = P(X \le x)$，随 X 向右单调递增至 1</p>
                    </div>

                    {/* Right action aligned panel */}
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <div id="btn-group-cdf-chart-card" className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-200/60 animate-fadeIn">
                        <button
                          onClick={() => setShowCI(!showCI)}
                          title="在图表中显示或隐藏 1σ, 2σ, 3σ 置信区间阴影"
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all border shadow-sm cursor-pointer select-none active:scale-95 ${
                            showCI
                              ? "bg-violet-600 border-violet-600 text-white hover:bg-violet-700"
                              : "bg-white border-slate-200/60 text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${showCI ? "bg-white animate-pulse" : "bg-slate-400"}`} />
                          <span>置信区间 (±kσ)</span>
                        </button>
                        <button
                          onClick={() => exportPng("cdf-chart-card", `${selectedDistType}_CDF_Curve_Transparent`)}
                          title="导出透明背景 PNG 截图"
                          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold text-violet-600 bg-white border border-violet-100/60 hover:bg-slate-100 hover:text-violet-700 active:scale-95 transition-all shadow-sm cursor-pointer"
                        >
                          <Download className="h-3 w-3" />
                          <span>PNG (透明)</span>
                        </button>
                        <button
                          onClick={() => exportSvg("cdf-chart-card", `${selectedDistType}_CDF_Curve_Vector`)}
                          title="导出无损静态矢量 SVG"
                          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold text-slate-600 bg-white border border-slate-200/60 hover:bg-slate-100 active:scale-95 transition-all shadow-sm cursor-pointer"
                        >
                          <Download className="h-3 w-3" />
                          <span>SVG (矢量)</span>
                        </button>
                      </div>

                      {/* formula display */}
                      <div className="bg-violet-50/60 rounded-lg px-2.5 py-1 text-xs border border-violet-100/40 text-slate-700 flex items-center justify-center">
                        <MathLaTeX math={currentDist.formulaCDF} />
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 w-full min-h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={theoryData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorCdf" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis
                          dataKey="x"
                          type="number"
                          domain={[xBounds.min, xBounds.max]}
                          tick={{ fill: "#475569", fontSize: 10 }}
                          tickLine={{ stroke: "#cbd5e1" }}
                        />
                        <YAxis domain={[0, 1]} tick={{ fill: "#475569", fontSize: 10 }} tickLine={{ stroke: "#cbd5e1" }} />
                        <RechartsTooltip
                          contentStyle={{ backgroundColor: "#ffffff", borderColor: "#cbd5e1", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
                          labelStyle={{ color: "#1e293b", fontSize: "11px", fontWeight: "bold" }}
                          itemStyle={{ fontSize: "11px", color: "#475569" }}
                        />

                        {/* Shaded Confidence Intervals */}
                        {showCI && ciZones && (
                          <ReferenceArea
                            x1={ciZones.sigma3Min}
                            x2={ciZones.sigma3Max}
                            {...({
                              fill: "#ec4899",
                              fillOpacity: 0.02,
                              stroke: "none"
                            } as any)}
                          />
                        )}
                        {showCI && ciZones && (
                          <ReferenceArea
                            x1={ciZones.sigma2Min}
                            x2={ciZones.sigma2Max}
                            {...({
                              fill: "#8b5cf6",
                              fillOpacity: 0.04,
                              stroke: "none"
                            } as any)}
                          />
                        )}
                        {showCI && ciZones && (
                          <ReferenceArea
                            x1={ciZones.sigma1Min}
                            x2={ciZones.sigma1Max}
                            {...({
                              fill: "#3b82f6",
                              fillOpacity: 0.07,
                              stroke: "none"
                            } as any)}
                          />
                        )}
                        {showCI && ciZones && (
                          <ReferenceLine
                            x={ciZones.mean}
                            stroke="#7c3aed"
                            strokeWidth={1.5}
                            strokeDasharray="4 4"
                            label={{ value: `E(X)=${ciZones.mean.toFixed(2)}`, position: "top", fill: "#7c3aed", fontSize: 9, fontWeight: "bold" }}
                          />
                        )}

                        <Area
                          type={xBounds.discrete ? "step" : "monotone"}
                          dataKey="cdf"
                          stroke="#8b5cf6"
                          strokeWidth={2.5}
                          fill="url(#colorCdf)"
                          dot={false}
                          name="累积函数 CDF"
                        />
                        <ReferenceLine x={rangeA} stroke="#10b981" strokeDasharray="3 3" />
                        <ReferenceLine x={rangeB} stroke="#10b981" strokeDasharray="3 3" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Quantile Critical Value Table */}
                <div className="rounded-3xl border border-slate-200 bg-white p-6 lg:col-span-2 shadow-sm space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <Table className="h-4 w-4 text-emerald-600" />
                        <span>特定分位数临界值表 (Quantile Thresholds)</span>
                      </h4>
                      <p className="text-[10px] text-slate-400 mt-1">展示当前参数下，累积分布概率计算 P(X ≤ x) = p 对应的 X 轴临界数值</p>
                    </div>

                    <button
                      onClick={exportQuantilesToCSV}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/60 hover:bg-emerald-100 active:scale-95 transition-all shadow-sm cursor-pointer"
                      title="导出此分位数计算表为 CSV 文件"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>导出分位数 CSV</span>
                    </button>
                  </div>

                  <div className="overflow-x-auto rounded-2xl border border-slate-200/60">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-600 border-b border-slate-200/60 text-[11px] font-bold uppercase tracking-wider">
                          <th className="px-4 py-3">累积百分比 (p)</th>
                          <th className="px-4 py-3">分位数类型</th>
                          <th className="px-4 py-3 text-right">临界数值 (X轴坐标)</th>
                          <th className="px-4 py-3 text-right">数学概率含义</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                        {quantileData.map((row) => {
                          const isMedian = row.p === 0.5;
                          return (
                            <tr
                              key={row.p}
                              className={`transition-colors hover:bg-slate-50/80 ${
                                isMedian ? "bg-violet-50/20 font-medium text-violet-900" : ""
                              }`}
                            >
                              <td className="px-4 py-2.5 font-mono font-bold text-slate-600">
                                <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] ${
                                  isMedian ? "bg-violet-100/80 text-violet-800" : "bg-slate-100 text-slate-700"
                                }`}>
                                  {row.percentStr}
                                </span>
                              </td>
                              <td className="px-4 py-2.5">
                                <span className={isMedian ? "font-bold text-violet-700" : "text-slate-600"}>
                                  {row.label}
                                </span>
                              </td>
                              <td className="px-4 py-2.5 text-right font-mono text-[13px] font-bold text-slate-800">
                                {row.x}
                              </td>
                              <td className="px-4 py-2.5 text-right text-[10px] text-slate-400 italic">
                                P(X ≤ {row.x}) ≈ {row.p * 100}%
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Experimental note info */}
                <div className="rounded-3xl border border-slate-200 bg-white p-6 lg:col-span-2 shadow-sm">
                  <h4 className="text-xs font-bold uppercase text-slate-700 mb-2.5 flex items-center gap-1.5">
                    <AlertCircle className="h-4 w-4 text-indigo-600" />
                    统计物理意义指南：
                  </h4>
                  <ul className="text-xs text-slate-500 space-y-2 list-disc ml-5 leading-relaxed font-medium">
                    <li>期望是在长期无限次随机抽取中稳定的平均倾向（如改变参数可以直接调整图形的中心位置）。</li>
                    <li>方差变大说明曲线整体将“扁平化”展开，数据散乱；标准差或方差收缩时，密度高度聚集在均值附近。</li>
                    <li>连续分布中，特定点的瞬间概率等于 0。物理上真正有实用意义的是特定区间的概率面积（即 CDF 变动差值）。</li>
                  </ul>
                </div>

              </div>
            )}

            {/* Tab 2: Sampling Convergence Lab (Law of Large Numbers) */}
            {activeTab === "sampling" && (
              <div className="space-y-6 animate-fadeIn">
                
                {/* Sampling config controls */}
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm flex flex-wrap gap-4 items-center justify-between">
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-slate-900">大数定律与随机模拟收敛试验</h3>
                    <p className="text-xs text-slate-500">
                      通过模拟计算机掷骰，采样出样本，观察实际发生的直方图与数学公式理论密度的趋同，验证极限定理！
                    </p>
                  </div>

                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                      <span>单次生成样本数:</span>
                      <select
                        value={sampleSizeOption}
                        onChange={(e) => setSampleSizeOption(parseInt(e.target.value))}
                        className="rounded-xl bg-slate-50 border border-slate-200 text-slate-800 px-3 py-1.5 text-xs focus:ring-1 focus:ring-indigo-500 font-bold"
                      >
                        <option value={50}>50 (小样本，噪音大)</option>
                        <option value={200}>200 (中等)</option>
                        <option value={1000}>1000 (极强稳定性)</option>
                        <option value={5000}>5000 (大数收敛级别)</option>
                      </select>
                    </div>

                    <button
                      onClick={() => triggerSampling(sampleSizeOption)}
                      disabled={isSampling}
                      className="rounded-full bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-bold px-5 py-2 transition-all flex items-center gap-1.5 shadow-sm shadow-indigo-100 disabled:opacity-50"
                    >
                      {isSampling ? (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Play className="h-3.5 w-3.5" />
                      )}
                      <span>开始抽取随机样本</span>
                    </button>

                    {samples.length > 0 && (
                      <button
                        onClick={() => {
                          setSamples([]);
                        }}
                        className="rounded-full border border-slate-200 bg-white hover:bg-slate-50 px-4 py-2 text-xs font-bold text-slate-600 flex items-center gap-1 shadow-sm active:scale-95 transition-all"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        <span>重置</span>
                      </button>
                    )}
                  </div>
                </div>

                {samples.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-16 text-center text-slate-400 font-medium">
                    <BarChart4 className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                    <p className="text-xs">暂无实验样本。请在上方选择采样数，然后点击“开始抽取随机样本”按钮模拟随机过程。</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Left: Samples stats comparative panel */}
                    <div className="rounded-3xl border border-slate-200 bg-white p-6 space-y-4 shadow-sm">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        样本与理论对照 (Law of Large Numbers)
                      </h4>

                      <div className="space-y-3">
                        <div className="rounded-2xl bg-indigo-50/50 p-4 border border-indigo-50">
                          <span className="text-[10px] text-indigo-700 block uppercase font-bold tracking-wider">样本总量 (Sample Size)</span>
                          <span className="text-2xl font-black font-mono text-indigo-600">{samples.length}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex flex-col justify-between">
                            <span className="text-slate-400 text-[10px] uppercase font-bold">样本均值 (Empirical)</span>
                            <span className="text-slate-800 font-mono text-sm font-bold mt-1">
                              {formatNumber(sampleStats?.mean, 4)}
                            </span>
                          </div>
                          <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex flex-col justify-between">
                            <span className="text-slate-400 text-[10px] uppercase font-bold">理论均值 (Expected)</span>
                            <span className="text-emerald-600 font-mono text-sm font-bold mt-1">
                              {formatNumber(statsCalculated.mean, 4)}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex flex-col justify-between">
                            <span className="text-slate-400 text-[10px] uppercase font-bold">样本方差 (Empirical)</span>
                            <span className="text-slate-800 font-mono text-sm font-bold mt-1">
                              {formatNumber(sampleStats?.variance, 4)}
                            </span>
                          </div>
                          <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex flex-col justify-between">
                            <span className="text-slate-400 text-[10px] uppercase font-bold">理论方差 (Expected)</span>
                            <span className="text-emerald-600 font-mono text-sm font-bold mt-1">
                              {formatNumber(statsCalculated.variance, 4)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Diagnostic Alert banner */}
                      <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4 text-[11px] leading-relaxed text-slate-600 font-medium">
                        <span className="font-bold text-indigo-800 block mb-1">💡 实验教学观察点：</span>
                        <span>
                          当采样量仅为 50 时，样本期望偏差可能较高（随机噪声很大）；一旦您将样本数提到 5000，样本均值与方差会出奇精准地与理论期望保持一致！大自然隐藏在混乱背后的秩序，这就是大数定律。
                        </span>
                      </div>
                    </div>

                    {/* Chart: Empirical Histogram Overlay Theory Curve */}
                    <div className="rounded-3xl border border-slate-200 bg-white p-6 lg:col-span-2 flex flex-col h-[350px] shadow-sm">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-indigo-600" />
                        样本直方图对照理论密度分布 (Empirical Overlay)
                      </h4>

                      <div className="flex-1 w-full min-h-[220px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <ComposedChart data={sampleHistogramData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="xLabel" tick={{ fill: "#475569", fontSize: 10 }} />
                            <YAxis tick={{ fill: "#475569", fontSize: 10 }} />
                            <RechartsTooltip content={<CustomHistogramTooltip />} />
                            {/* Histogram Area of Sample data */}
                            <Bar dataKey="empirical" fill="#6366f1" fillOpacity={0.35} stroke="#6366f1" strokeWidth={1} name="样本频率密度 (Empirical)" />
                            {/* Line of theory data */}
                            <Line type="monotone" dataKey="theoretical" stroke="#10b981" strokeWidth={2.5} dot={false} name="理论密度 (Theoretical)" />
                          </ComposedChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Law of Large Numbers Convergence Plot */}
                    <div className="rounded-3xl border border-slate-200 bg-white p-6 lg:col-span-3 flex flex-col h-[280px] shadow-sm">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 block">
                        大数定理动态轨迹图：样本均值的收敛历史 (Running Cumulative Average)
                      </h4>
                      <p className="text-[10px] text-slate-500 mb-3">
                        展示随第1个样本到第N个样本不断追加，它的期望平均值如何逐渐过滤掉随机噪声，最终牢占理论均值（虚线）的过程。
                      </p>

                      <div className="flex-1 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={llnAverageCurve} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="index" tick={{ fill: "#475569", fontSize: 9 }} name="样本序列数量" />
                            <YAxis domain={["auto", "auto"]} tick={{ fill: "#475569", fontSize: 9 }} />
                            <RechartsTooltip
                              contentStyle={{ backgroundColor: "#ffffff", borderColor: "#cbd5e1", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
                              itemStyle={{ fontSize: "11px", color: "#475569" }}
                            />
                            <Line type="monotone" dataKey="runningAverage" stroke="#0284c7" strokeWidth={2} dot={false} name="随机累计当前平均" />
                            <ReferenceLine y={statsCalculated.mean} stroke="#10b981" strokeWidth={2.5} strokeDasharray="5 5" name="常数期望" label={{ value: "理论均值", position: "insideTopRight", fill: "#10b981", fontSize: 10, fontWeight: "bold" }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                  </div>
                )}

              </div>
            )}

            {/* Tab 3: Monte Carlo simulation integration */}
            {activeTab === "montecarlo" && (
              <div className="space-y-6 animate-fadeIn">
                
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm flex flex-wrap gap-4 items-center justify-between">
                  <div className="space-y-1 max-w-xl">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Target className="h-4 w-4 text-emerald-600" />
                      <span>蒙特卡洛 (Monte Carlo) Darts 区域估计</span>
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      通过随机构建一个包含选定区间 <MathLaTeX math={`${rangeA} \\le X \\le ${rangeB}`} />、高为 PDF 在该区间内最大值的二维坐标框，在其中投入大量的随机“飞镖” (Darts)。利用落在 PDF 下方的比例，计算出该段的概率！
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                      <span>单次模拟投镖数 (N):</span>
                      <select
                        value={mcTotalCount}
                        onChange={(e) => setMCTotalCount(parseInt(e.target.value))}
                        className="rounded-xl bg-slate-50 border border-slate-200 text-slate-800 px-3 py-1.5 text-xs font-bold"
                      >
                        <option value={200}>200</option>
                        <option value={600}>600</option>
                        <option value={1500}>1500 (高精确近似)</option>
                      </select>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 border-l border-slate-200 pl-4">
                      <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={mcSlowMotion}
                          onChange={(e) => setMcSlowMotion(e.target.checked)}
                          className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer h-4 w-4 bg-slate-50 border-slate-300 transition-all"
                        />
                        <span className="flex items-center gap-1">慢放投点动画 🚀</span>
                      </label>

                      {mcSlowMotion && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                          <span>投点速度:</span>
                          <select
                            value={mcSpeed}
                            onChange={(e) => setMcSpeed(parseInt(e.target.value))}
                            className="rounded-xl bg-slate-50 border border-slate-200 text-slate-800 px-2 py-1 text-xs font-bold font-mono"
                          >
                            <option value={1}>1 镖/帧 (极慢)</option>
                            <option value={5}>5 镖/帧 (标准)</option>
                            <option value={15}>15 镖/帧 (中速)</option>
                            <option value={45}>45 镖/帧 (极速)</option>
                          </select>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={runMonteCarloSimulation}
                      className="rounded-full bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold px-5 py-2 transition-all flex items-center gap-1.5 shadow-sm shadow-emerald-100 disabled:opacity-50"
                    >
                      <Target className="h-4 w-4 text-emerald-100" />
                      <span>{mcIsPlaying ? "重新投点" : "投掷蒙特卡洛飞镖"}</span>
                    </button>
                  </div>
                </div>

                {mcDarts.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-16 text-center text-slate-400 font-medium">
                    <Target className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                    <p className="text-xs">暂无随机飞镖。请在上方输入单次飞镖数量，并点击“投掷蒙特卡洛飞镖”开启空间区域模拟！</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Simulation graphics */}
                    <div className="rounded-3xl border border-slate-200 bg-white p-6 lg:col-span-2 flex flex-col items-center shadow-sm">
                      <div className="w-full flex justify-between items-center mb-4 text-xs font-medium text-slate-500">
                        <span className="font-bold text-slate-700">飞镖落面分布 (Monte Carlo Layout Board)</span>
                        <div className="flex gap-4">
                          <span className="flex items-center gap-1.5">
                            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> 落在曲线下方 (Hit/成功)
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className="h-2.5 w-2.5 rounded-full bg-rose-500" /> 落在曲线外侧 (Miss/失败)
                          </span>
                        </div>
                      </div>

                      {/* Whiteboard Canvas representing the dartboard */}
                      <div className="w-full max-w-xl aspect-[1.8/1] rounded-2xl border border-slate-200 bg-slate-50 p-2.5 relative shadow-inner">
                        <canvas
                          ref={(canvas) => {
                            if (!canvas) return;
                            const ctx = canvas.getContext("2d");
                            if (!ctx) return;
                            // Reset canvas size based on container bounding
                            const w = canvas.clientWidth;
                            const h = canvas.clientHeight;
                            canvas.width = w * window.devicePixelRatio;
                            canvas.height = h * window.devicePixelRatio;
                            ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

                            // Clean canvas
                            ctx.clearRect(0, 0, w, h);

                            // Draw grid
                            ctx.strokeStyle = "#e2e8f0";
                            ctx.lineWidth = 0.5;
                            for (let gridX = 0; gridX < w; gridX += w / 10) {
                              ctx.beginPath();
                              ctx.moveTo(gridX, 0);
                              ctx.lineTo(gridX, h);
                              ctx.stroke();
                            }
                            for (let gridY = 0; gridY < h; gridY += h / 6) {
                              ctx.beginPath();
                              ctx.moveTo(0, gridY);
                              ctx.lineTo(w, gridY);
                              ctx.stroke();
                            }

                            // Math mapping variables
                            const marginY = 15;
                            const marginX = 20;
                            const plotW = w - 2 * marginX;
                            const plotH = h - 2 * marginY;

                            // Draw PDF Boundary curve
                            ctx.beginPath();
                            ctx.strokeStyle = "#4f46e5";
                            ctx.lineWidth = 3;
                            let first = true;
                            const pointsCount = 150;
                            const stepSizeVal = (rangeB - rangeA) / pointsCount;
                            for (let k = 0; k <= pointsCount; k++) {
                              const curveX = rangeA + k * stepSizeVal;
                              const pdfVal = PDFMap[currentDist.type](curveX, params);

                              // map world x,y to canvas coordinates
                              const cx = marginX + ((curveX - rangeA) / (rangeB - rangeA)) * plotW;
                              const cy = h - marginY - (pdfVal / boundingH) * plotH;

                              if (first) {
                                  ctx.moveTo(cx, cy);
                                  first = false;
                              } else {
                                  ctx.lineTo(cx, cy);
                              }
                            }
                            ctx.stroke();

                            // Draw darts (only visible ones)
                            mcVisibleDarts.forEach((dart) => {
                              const cx = marginX + ((dart.x - rangeA) / (rangeB - rangeA)) * plotW;
                              const cy = h - marginY - (dart.y / boundingH) * plotH;
                              ctx.beginPath();
                              ctx.arc(cx, cy, 2.2, 0, 2 * Math.PI);
                              ctx.fillStyle = dart.isUnder ? "#10b981" : "#f43f5e";
                              ctx.fill();
                            });
                          }}
                          className="w-full h-full block"
                        />
                      </div>

                      {/* Animation controller buttons */}
                      {mcSlowMotion && mcDarts.length > 0 && (
                        <div className="flex flex-wrap gap-3 items-center mt-4 border border-slate-100 bg-slate-50/50 rounded-2xl px-5 py-3.5 w-full max-w-xl">
                          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider shrink-0 mr-1">
                            {mcVisibleCount >= mcDarts.length ? "✨ 投点已完成" : "⚡ 慢放动画中"}
                          </span>

                          <div className="flex items-center gap-2 flex-1">
                            {mcIsPlaying ? (
                              <button
                                onClick={() => setMcIsPlaying(false)}
                                className="rounded-xl bg-amber-500 hover:bg-amber-600 font-bold text-xs text-white px-3.5 py-1.5 transition-all flex items-center gap-1 shadow-sm active:scale-95"
                              >
                                <Pause className="h-3 w-3 fill-current" />
                                <span>暂停</span>
                              </button>
                            ) : mcVisibleCount < mcDarts.length ? (
                              <button
                                onClick={() => setMcIsPlaying(true)}
                                className="rounded-xl bg-indigo-600 hover:bg-indigo-500 font-bold text-xs text-white px-3.5 py-1.5 transition-all flex items-center gap-1 shadow-sm active:scale-95"
                              >
                                <Play className="h-3 w-3 fill-current" />
                                <span>继续投点</span>
                              </button>
                            ) : (
                              <button
                                onClick={runMonteCarloSimulation}
                                className="rounded-xl bg-slate-600 hover:bg-slate-500 font-bold text-xs text-white px-3.5 py-1.5 transition-all flex items-center gap-1 shadow-sm active:scale-95"
                              >
                                <ListRestart className="h-3 w-3" />
                                <span>再投一次</span>
                              </button>
                            )}

                            {mcVisibleCount < mcDarts.length && (
                              <button
                                onClick={() => {
                                  setMcIsPlaying(false);
                                  setMcVisibleCount(mcDarts.length);
                                  setMCEstimating(false);
                                }}
                                className="rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold text-xs px-3.5 py-1.5 transition-all active:scale-95 ml-auto"
                              >
                                <span>直接填满 (跳过慢放)</span>
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right summary math board */}
                    <div className="rounded-3xl border border-slate-200 bg-white p-6 space-y-4 shadow-sm">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        飞镖概率推导面板
                      </h4>

                      <div className="space-y-3">
                        <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 space-y-2.5 font-medium text-slate-600">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-400 font-bold">理论真实积分：</span>
                            <span className="font-mono text-slate-800 text-sm font-bold">
                              {(exactIntervalValue * 100).toFixed(4)}%
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-400 font-bold">投镖规模 (当前/总数)：</span>
                            <span className="font-mono text-slate-800 font-bold flex items-center gap-1.5">
                              <span className="text-emerald-600 font-extrabold">{mcVisibleDarts.length}</span>
                              <span className="text-slate-300">/</span>
                              <span>{mcDarts.length}</span>
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-indigo-600 font-bold">落在曲线内飞镖：</span>
                            <span className="font-mono text-indigo-600 font-black">
                              {mcVisibleDarts.filter((d) => d.isUnder).length}
                            </span>
                          </div>
                        </div>

                        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-5 text-center shadow-sm">
                          <span className="text-[10px] text-emerald-800 font-bold block tracking-widest uppercase">
                            蒙特卡洛积分估计概率：
                          </span>
                          <span className="text-3xl font-black text-emerald-600 font-mono tracking-tight mt-1.5 block">
                            {(mcEstimatedProbability * 100).toFixed(2)}%
                          </span>
                          <p className="text-[9px] text-slate-400 italic mt-1.5 leading-snug">
                            估算公式: BoundingBox面积 × (内侧镖数 / 总镖数)
                          </p>
                        </div>
                      </div>

                      <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 text-[11px] text-slate-500 leading-relaxed font-medium">
                        <span className="font-bold text-slate-700 block mb-1">🔬 蒙特卡洛区域原理：</span>
                        <span>
                          概率的本质是某种测度面积。在规则几何外框下，投镖是随机撒点的物理过程。当样本量越大，其密度比值精确收敛于底层公式，展现了极其迷人的随机逼近能力！
                        </span>
                      </div>
                    </div>

                  </div>
                )}

              </div>
            )}

            {/* CLT Central Limit Theorem Sandbox Tab */}
            {activeTab === "clt" && (
              <div className="space-y-6 animate-fadeIn pb-12">
                
                {/* Descriptive banner header */}
                <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/20 p-6 md:p-8 text-white relative overflow-hidden shadow-xl">
                  <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
                  <div className="absolute left-1/3 bottom-0 w-80 h-32 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
                  
                  <div className="relative flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
                    <div className="space-y-2 max-w-4xl">
                      <div className="flex items-center gap-2">
                        <span className="bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                          定理实验室 Presets
                        </span>
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-emerald-300 text-[10px] font-bold">已启用大样本量渐进估计</span>
                      </div>
                      <h2 className="text-xl md:text-2xl font-black tracking-tight flex items-center gap-2 bg-gradient-to-r from-white via-indigo-100 to-indigo-200 bg-clip-text text-transparent">
                        中心极限定理 (CLT) 渐进沙盒
                      </h2>
                      <p className="text-xs text-slate-300 leading-relaxed font-normal">
                        <strong>核心黄金原理：</strong> 无论母体分布 (Population) 服从何种极其偏态、双峰甚至极度非对称的不规则形式，只要我们在其中连续、独立进行 
                        <span className="text-indigo-300 font-bold mx-1">N 独立同分布采样</span>，其算术样本均值 
                        <span className="text-emerald-300 font-bold mx-1">X̄</span> 
                        的概率分布在采样量 <span className="text-indigo-300 font-mono font-bold">N</span> 较大时，都会<strong>魔术般地、渐进地收敛服从完美对称的正态分布 (Bell Curve)</strong>。
                      </p>
                    </div>
                    
                    <button
                      onClick={runCLTSimulation}
                      className="bg-indigo-600 hover:bg-indigo-500 border border-indigo-400/20 text-white text-xs font-black px-5 py-3 rounded-2xl flex items-center gap-2 shadow-lg hover:shadow-indigo-500/20 transition-all shrink-0 active:scale-95 cursor-pointer"
                    >
                      <RefreshCw className={`h-4 w-4 ${cltIsSimulating ? "animate-spin" : ""}`} />
                      <span>极限洗牌 重新模拟</span>
                    </button>
                  </div>
                </div>

                {/* Main Bento Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  
                  {/* Left Column Controls */}
                  <div className="lg:col-span-4 space-y-6">
                    
                    {/* Pop Selection Card */}
                    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                      <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                        <div className="h-2 w-2 rounded-full bg-rose-500" />
                        <h3 className="text-sm font-extrabold text-slate-800">1. 母体非正态分布定制</h3>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-[11px] text-slate-400 font-bold block uppercase tracking-wider">选择一个极其怪异的母体形式：</label>
                        <div className="grid grid-cols-1 gap-1.5">
                          {(Object.values(CLT_POPULATION_METADATA) as any[]).map((pop) => (
                            <button
                              key={pop.id}
                              onClick={() => setCltPopType(pop.id as any)}
                              className={`w-full text-left px-4 py-3 rounded-xl border text-xs font-semibold transition-all flex flex-col gap-1 cursor-pointer ${
                                cltPopType === pop.id
                                  ? "bg-indigo-50 border-indigo-300 text-indigo-800 shadow-sm shadow-indigo-100"
                                  : "bg-slate-50/50 border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800"
                              }`}
                            >
                              <div className="flex justify-between items-center w-full">
                                <span>{pop.nameCH}</span>
                                {cltPopType === pop.id && <span className="h-1.5 w-1.5 rounded-full bg-indigo-600 animate-pulse" />}
                              </div>
                              <span className="text-[10px] text-slate-400 opacity-90 font-normal leading-normal">{pop.desc}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* True parameters panel */}
                      <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4.5 space-y-2.5">
                        <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest block">母体理论真实属性：</span>
                        
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className="bg-white border border-slate-100 rounded-xl p-2 flex flex-col justify-between shadow-xs">
                            <span className="text-[9px] text-slate-400 font-bold">期望均值 μ</span>
                            <span className="text-xs font-mono font-extrabold text-slate-900 mt-1">
                              {CLT_POPULATION_METADATA[cltPopType].mean.toFixed(4)}
                            </span>
                          </div>
                          <div className="bg-white border border-slate-100 rounded-xl p-2 flex flex-col justify-between shadow-xs">
                            <span className="text-[9px] text-slate-400 font-bold">方差 σ²</span>
                            <span className="text-xs font-mono font-extrabold text-slate-900 mt-1">
                              {CLT_POPULATION_METADATA[cltPopType].variance.toFixed(4)}
                            </span>
                          </div>
                          <div className="bg-white border border-slate-100 rounded-xl p-2 flex flex-col justify-between shadow-xs">
                            <span className="text-[9px] text-slate-400 font-bold">标准差 σ</span>
                            <span className="text-xs font-mono font-extrabold text-slate-900 mt-1">
                              {Math.sqrt(CLT_POPULATION_METADATA[cltPopType].variance).toFixed(4)}
                            </span>
                          </div>
                        </div>
                      </div>

                    </div>

                    {/* Simulation Parameters Sliders */}
                    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
                      <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                        <div className="h-2 w-2 rounded-full bg-indigo-500" />
                        <h3 className="text-sm font-extrabold text-slate-800">2. 采样与模拟参数控制</h3>
                      </div>

                      {/* Slider for N */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-600 font-bold flex items-center gap-1">
                            <span>单次采样均值点数</span>
                            <span className="text-indigo-600 font-bold font-mono">N</span>
                          </span>
                          <span className="font-mono text-base font-black text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-lg border border-indigo-100">
                            {cltN}
                          </span>
                        </div>
                        
                        <input
                          type="range"
                          min="2"
                          max="120"
                          value={cltN}
                          onChange={(e) => setCltN(parseInt(e.target.value))}
                          className="w-full h-1.5 bg-slate-150 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                        />
                        
                        {/* Quick preset buttons */}
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {[2, 5, 15, 30, 60, 100].map((v) => (
                            <button
                              key={v}
                              onClick={() => setCltN(v)}
                              className={`px-2 py-0.5 rounded-md text-[10px] font-black transition-all cursor-pointer ${
                                cltN === v
                                  ? "bg-indigo-600 text-white"
                                  : "bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-805"
                              }`}
                            >
                              N = {v}
                            </button>
                          ))}
                        </div>
                        <p className="text-[10px] text-slate-400 leading-relaxed pt-1.5">
                          * <strong>滑动感受极极限效应：</strong> 仔细观察！随着抽样数 <strong>N</strong> 逐渐增加，底下的直方图会以不可思议的速度向中心挤压汇聚！
                        </p>
                      </div>

                      {/* Slider for M */}
                      <div className="space-y-2 border-t border-slate-100 pt-4">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-600 font-bold flex items-center gap-1">
                            <span>重复抽样试验次数</span>
                            <span className="text-indigo-600 font-bold font-mono">M</span>
                          </span>
                          <span className="font-mono text-sm font-bold text-indigo-600">
                            {cltM}
                          </span>
                        </div>
                        
                        <input
                          type="range"
                          min="100"
                          max="8000"
                          step="100"
                          value={cltM}
                          onChange={(e) => setCltM(parseInt(e.target.value))}
                          className="w-full h-1.5 bg-slate-150 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                        />
                        
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {[500, 1000, 2000, 5000, 8000].map((v) => (
                            <button
                              key={v}
                              onClick={() => setCltM(v)}
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                                cltM === v
                                  ? "bg-indigo-600 text-white"
                                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                              }`}
                            >
                              M = {v}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Zoom mode selection */}
                      <div className="space-y-2 border-t border-slate-100 pt-4">
                        <label className="text-[11px] text-slate-400 font-bold block uppercase tracking-wider">X轴直方图视界对焦：</label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => setCltZoomMode("full")}
                            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                              cltZoomMode === "full"
                                ? "bg-indigo-50 border-indigo-200 text-indigo-700 font-extrabold"
                                : "bg-white border-slate-200 text-slate-505"
                            }`}
                          >
                            🌍 全局母体范围
                          </button>
                          <button
                            onClick={() => setCltZoomMode("focus")}
                            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                              cltZoomMode === "focus"
                                ? "bg-indigo-50 border-indigo-200 text-indigo-700 font-extrabold"
                                : "bg-white border-slate-200 text-slate-505"
                            }`}
                          >
                            🔍 聚集对焦 X̄
                          </button>
                        </div>
                        <p className="text-[9px] text-slate-400 leading-snug">
                          * <strong>聚集对焦：</strong> 随着N增大, 均值波动极小。“聚集对焦”会把视焦拉近，凸显即便是非常微小的样本，均值也完美贴合正态形状。
                        </p>
                      </div>

                    </div>

                    {/* Live Animation Controller Card */}
                    <motion.div 
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4"
                    >
                      <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                        <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                        <h3 className="text-sm font-extrabold text-slate-800">3. 渐进收敛 实时动画演练</h3>
                      </div>

                      <div className="space-y-3">
                        <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">
                          动画步化抽样控制：
                        </span>

                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => setCltIsPlaying(!cltIsPlaying)}
                            className={`flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl text-xs font-black transition-all cursor-pointer shadow-sm ${
                              cltIsPlaying 
                                ? "bg-amber-500 hover:bg-amber-650 text-white shadow-amber-200" 
                                : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-250"
                            }`}
                          >
                            {cltIsPlaying ? (
                              <>
                                <Pause className="h-4 w-4 animate-bounce" />
                                <span>暂停演练</span>
                              </>
                            ) : (
                              <>
                                <Play className="h-4 w-4" />
                                <span>开始连续抽样</span>
                              </>
                            )}
                          </button>

                          <button
                            onClick={drawOneCltSample}
                            disabled={cltIsPlaying}
                            className="flex items-center justify-center gap-1.5 px-4 py-3 border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/20 text-slate-700 hover:text-indigo-700 rounded-xl text-xs font-black transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
                          >
                            <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                            <span>单步抽样</span>
                          </button>
                        </div>

                        {/* Speed Controls */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">
                            频率/采样速度：
                          </label>
                          <div className="grid grid-cols-3 gap-1.5">
                            {[
                              { label: "慢速 800ms", value: 800 },
                              { label: "常速 300ms", value: 300 },
                              { label: "极限 80ms", value: 80 }
                            ].map((speed) => (
                              <button
                                key={speed.value}
                                onClick={() => setCltPlaySpeed(speed.value)}
                                className={`py-1.5 rounded-lg text-[10px] font-bold transition-all border cursor-pointer text-center ${
                                  cltPlaySpeed === speed.value
                                    ? "bg-indigo-50 border-indigo-200 text-indigo-700 font-black"
                                    : "bg-slate-50 border-slate-150 text-slate-500 hover:bg-slate-100"
                                }`}
                              >
                                {speed.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Reset / Instant Fill Buttons */}
                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                          <button
                            onClick={() => {
                              setCltIsPlaying(false);
                              setCltMeans([]);
                              setCltWaterfallTracks([]);
                              setCltLatestAddedMean(null);
                            }}
                            className="px-3 py-2 border border-rose-100 bg-rose-50/50 hover:bg-rose-50 text-rose-700 rounded-xl text-[11px] font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            <RotateCcw className="h-3 w-3" />
                            <span>清空累积</span>
                          </button>

                          <button
                            onClick={() => {
                              setCltIsPlaying(false);
                              runCLTSimulation();
                            }}
                            className="px-3 py-2 border border-slate-205 bg-slate-50 hover:bg-slate-100 text-slate-755 rounded-xl text-[11px] font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            <ListRestart className="h-3 w-3" />
                            <span>一次注满 {cltM} 份</span>
                          </button>
                        </div>

                        {/* Streaming Status details */}
                        <div className="bg-slate-50 border border-slate-200/50 rounded-2xl p-4.5 space-y-1.5 mt-2">
                          <span className="text-[9px] text-slate-400 font-black uppercase tracking-wider block">累积演练进度板：</span>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-500 font-medium">当前已吸纳样本数 (M_live)：</span>
                            <span className="font-mono text-indigo-700 font-black bg-indigo-50 border border-indigo-100/50 px-2 py-0.5 rounded-md text-sm">
                              {cltMeans.length}
                            </span>
                          </div>
                          {cltMeans.length > 0 ? (
                            <p className="text-[10px] text-indigo-500 leading-snug pt-1">
                              👉 <strong>演练攻略：</strong> 建议点击【<strong>清空累积</strong>】按钮，然后选择【<strong>常速 300ms</strong>】并点击【<strong>开始连续抽样</strong>】，仔细看底层的实测直方图如何一根一根汇聚、最终从怪异的母体形式神奇变脸，变出来一个完美的绿色正态曲线！
                            </p>
                          ) : (
                            <p className="text-[10px] text-slate-400 leading-snug pt-1 italic">
                              * 采样箱空空如也。点击单步抽样或开始，唤醒你的样本大军吧！
                            </p>
                          )}
                        </div>

                      </div>
                    </motion.div>

                  </div>

                  {/* Right Column Visualizations */}
                  <div className="lg:col-span-8 space-y-6">
                    
                    {/* Upper View: Population PDF Curve */}
                    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col h-[220px]">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h4 className="text-xs font-extrabold text-indigo-500 uppercase tracking-widest block">A. 母体的概率密度函数 (Population PDF)</h4>
                          <p className="text-[10px] text-slate-400">这就是当前抽取出数据的母体源泉，高度扭曲且极其不对称。</p>
                        </div>
                        <div className="bg-rose-50 px-2.5 py-0.5 rounded-md text-[10px] text-rose-700 font-semibold border border-rose-100 uppercase">
                          非正态源泉
                        </div>
                      </div>

                      <div className="flex-1 w-full min-h-[120px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={cltPopCurveData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                            <defs>
                              <linearGradient id="colorCltPop" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2} />
                                <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="x" type="number" domain={[CLT_POPULATION_METADATA[cltPopType].xMin, CLT_POPULATION_METADATA[cltPopType].xMax]} tick={{ fontSize: 9 }} />
                            <YAxis tick={{ fontSize: 9 }} />
                            <Area type="monotone" dataKey="y" stroke="#f43f5e" strokeWidth={1.5} fillOpacity={1} fill="url(#colorCltPop)" />
                            <ReferenceLine x={CLT_POPULATION_METADATA[cltPopType].mean} stroke="#475569" strokeDasharray="3 3" label={{ value: `期望偏值 μ: ${CLT_POPULATION_METADATA[cltPopType].mean.toFixed(2)}`, fill: '#475569', fontSize: 10, position: 'top' }} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Middle View: Waterfall Sample Track cascade */}
                    <div className="rounded-3xl bg-slate-950 border border-slate-800 p-6 shadow-2xl text-slate-200 space-y-4">
                      <div>
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-black uppercase tracking-widest text-emerald-400 flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                            B. 样本投点流瀑布图 (Waterfall Dot Cascade)
                          </h4>
                          <span className="text-[9px] text-slate-500 font-mono">
                            显示最新 5 次抽样细节轨迹 (每次 N = {cltN})
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 leading-relaxed mt-0.5">
                          可窥见散落的淡色圆点落点高度偏好母体形状，而其汇成的算术平均均值 <strong>X̄ (绿色发光阀门)</strong> 却稳稳卡在中心期望极近。
                        </p>
                      </div>

                      <div className="space-y-4 py-2 border-t border-b border-slate-900 min-h-[290px] flex flex-col justify-start relative overflow-hidden">
                        <AnimatePresence initial={false}>
                          {cltWaterfallTracks.slice(0, 5).map((track, trackIdx) => {
                            const pop = CLT_POPULATION_METADATA[cltPopType];
                            const range = pop.xMax - pop.xMin;
                            const getPct = (val: number) => {
                              if (range <= 0) return 50;
                              const pct = ((val - pop.xMin) / range) * 100;
                              return Math.max(0, Math.min(100, pct));
                            };
                            
                            const isLatest = track.isNew || trackIdx === 0;

                            return (
                              <motion.div 
                                key={track.id}
                                layout
                                initial={{ opacity: 0, y: -25, scale: 0.95 }}
                                animate={{ 
                                  opacity: 1, 
                                  y: 0, 
                                  scale: 1,
                                  borderColor: isLatest ? "rgba(16, 185, 129, 0.45)" : "rgba(15, 23, 42, 0.4)",
                                  backgroundColor: isLatest ? "rgba(15, 23, 42, 0.95)" : "rgba(15, 23, 42, 0.6)"
                                }}
                                exit={{ opacity: 0, y: 25, scale: 0.95, transition: { duration: 0.15 } }}
                                transition={{ type: "spring", stiffness: 350, damping: 25 }}
                                className="relative h-11 rounded-xl border p-2 flex flex-col justify-end overflow-hidden shadow-sm"
                              >
                                
                                {/* Background guideline track line */}
                                <div className="absolute top-[50%] left-[5%] right-[5%] h-0.5 bg-slate-800/80 z-0" />
                                
                                {/* Horizontal track range label indicator */}
                                <div className="absolute top-1 left-2 text-[9px] text-slate-500 font-bold font-mono flex items-center gap-1.5">
                                  <span>Track (测试采样)</span>
                                  {isLatest && (
                                    <span className="bg-emerald-500/20 text-emerald-400 text-[8px] font-black px-1 rounded-sm border border-emerald-400/20 uppercase tracking-widest animate-pulse">
                                      LATEST 钻孔
                                    </span>
                                  )}
                                </div>

                                {/* SVG fine connecting lines radiating to mean */}
                                <svg className="absolute inset-0 h-full w-full pointer-events-none opacity-20 z-10">
                                  {track.points.map((pt, ptIdx) => (
                                    <line
                                      key={ptIdx}
                                      x1={`${5 + 0.9 * getPct(pt)}%`}
                                      y1="50%"
                                      x2={`${5 + 0.9 * getPct(track.mean)}%`}
                                      y2="50%"
                                      stroke={isLatest ? "#34d399" : "#10b981"}
                                      strokeWidth="1"
                                      strokeDasharray="2 3"
                                    />
                                  ))}
                                </svg>

                                {/* Scattered Sample Points Beads with staggered scales */}
                                <div className="absolute inset-x-[5%] top-[45%] h-2 z-20">
                                  {track.points.map((pt, ptIdx) => (
                                    <motion.div
                                      key={ptIdx}
                                      initial={{ scale: 0, opacity: 0 }}
                                      animate={{ scale: 1, opacity: isLatest ? 0.95 : 0.6 }}
                                      transition={{ delay: ptIdx * 0.015, type: "spring", stiffness: 220 }}
                                      className={`absolute h-2 w-2 rounded-full -translate-x-1 hover:scale-150 hover:bg-white hover:opacity-100 transition-all cursor-help ${
                                        isLatest ? "bg-amber-400 shadow-[0_0_8px_#fbbf24]" : "bg-indigo-400"
                                      }`}
                                      style={{ left: `${getPct(pt)}%` }}
                                      title={`单点落入数值: ${pt.toFixed(4)}`}
                                    />
                                  ))}
                                </div>

                                {/* Target Track Mean focal point glowing slider */}
                                <motion.div 
                                  initial={{ scale: 0.2, opacity: 0 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  transition={{ delay: track.points.length * 0.015 + 0.05, type: "spring", stiffness: 250, damping: 14 }}
                                  className="absolute top-[35%] -translate-x-1/2 z-30 flex flex-col items-center select-none"
                                  style={{ left: `${5 + 0.9 * getPct(track.mean)}%` }}
                                >
                                  <div className={`h-5 w-1 shadow-xs ${isLatest ? "bg-amber-400 shadow-[0_0_12px_#fbbf24]" : "bg-emerald-400 shadow-[0_0_10px_#10b981] animate-pulse"}`} />
                                  <div className={`font-mono font-black text-[9px] px-1.5 py-0.2 rounded-md shadow-md translate-y-0.5 ${
                                    isLatest 
                                      ? "bg-amber-400 text-slate-950 shadow-amber-400/20 font-black scale-105" 
                                      : "bg-emerald-500/90 text-slate-950 shadow-emerald-500/20"
                                  }`}>
                                    X̄={track.mean.toFixed(2)}
                                  </div>
                                </motion.div>

                              </motion.div>
                            );
                          })}
                        </AnimatePresence>
                      </div>

                      <div className="text-[10px] text-slate-500 leading-normal flex items-center justify-between">
                        <span>轴范围 [{CLT_POPULATION_METADATA[cltPopType].xMin} 到 {CLT_POPULATION_METADATA[cltPopType].xMax}]</span>
                        <span className="text-right text-emerald-400/90 flex items-center gap-1">
                          <span className="h-1 w-1 bg-emerald-400 rounded-full animate-ping" />
                          这些 X̄ 会持续倾泻入库，累积生成下方 M={cltM} 份 X̄ 直方大底
                        </span>
                      </div>
                    </div>

                    {/* D. Q-Q Plot and Higher-order Convergence Indicators */}
                    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-3">
                        <div>
                          <h4 className="text-xs font-black uppercase tracking-widest text-indigo-600 flex items-center gap-1.5">
                            C. 样本均值的正态 Q-Q 分位数检验图 与 收敛测度监测
                          </h4>
                          <p className="text-[10px] text-slate-400">
                            对照 <span className="text-slate-500 font-bold">理论分位数 (X轴)</span> 与 <span className="text-indigo-600 font-bold">实测分位数 (Y轴)</span>。散点重合于虚线表示完美正态拟合。
                          </p>
                        </div>
                        <div className="bg-indigo-50 px-2 rounded-lg py-0.5 text-[9px] text-indigo-700 font-bold border border-indigo-150 shrink-0">
                          高阶检验
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                        
                        {/* Left Column: QQ Plot Chart */}
                        <div className="h-[180px] w-full flex flex-col justify-center items-center">
                          {cltQQPlotData.length === 0 ? (
                            <div className="text-center p-4 bg-slate-50/60 rounded-2xl border border-slate-150 border-dashed w-full h-full flex flex-col justify-center items-center space-y-2">
                              <span className="text-xl">⏳</span>
                              <p className="text-[10px] text-slate-400 font-medium max-w-[240px] leading-relaxed">
                                采样累积数据不足。请在左侧点击【<strong>开始连续抽样</strong>】吸纳 5 份以上的均值样本，本检测器将自动绘制 Q-Q 分理线！
                              </p>
                            </div>
                          ) : (
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={cltQQPlotData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis 
                                  dataKey="theoretical" 
                                  type="number" 
                                  domain={["auto", "auto"]} 
                                  tick={{ fill: "#475569", fontSize: 9 }} 
                                />
                                <YAxis 
                                  type="number" 
                                  domain={["auto", "auto"]} 
                                  tick={{ fill: "#475569", fontSize: 9 }} 
                                />
                                <RechartsTooltip content={<CustomQQTooltip />} />
                                
                                {/* Base reference line where Y = X */}
                                <Line 
                                  dataKey="refLine" 
                                  stroke="#cbd5e1" 
                                  strokeWidth={1.2} 
                                  strokeDasharray="4 4" 
                                  dot={false} 
                                  activeDot={false} 
                                  name="正态对齐标准线" 
                                />
                                
                                {/* Points representing actual coordinates */}
                                <Line 
                                  dataKey="empirical" 
                                  stroke="none" 
                                  dot={{ r: 3, fill: '#6366f1', fillOpacity: 0.85 }} 
                                  activeDot={{ r: 5, fill: '#6366f1' }} 
                                  name="分位数观察点" 
                                />
                              </LineChart>
                            </ResponsiveContainer>
                          )}
                        </div>

                        {/* Right Column: High-order Moments Scoreboard */}
                        <div className="space-y-3">
                          <div className="bg-slate-50/80 border border-slate-200/50 rounded-2xl p-4.5 space-y-3 text-xs">
                            <div className="font-extrabold text-slate-700 text-[10px] border-b border-slate-100 pb-1.5 uppercase tracking-wider flex items-center justify-between">
                              <span>高阶统计特征矩 (Higher Moments)</span>
                              <span className="text-[8px] bg-indigo-100 text-indigo-700 px-1.5 py-0.2 rounded font-mono font-black">
                                M = {cltMeans.length}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-3.5">
                              {/* Skewness indicator */}
                              <div className="bg-white p-3 rounded-xl border border-slate-150/80 space-y-1 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                                <span className="text-[9px] text-slate-400 block font-bold leading-none">三阶偏度 (Skewness)</span>
                                <div className="flex items-baseline justify-between gap-1 pt-1">
                                  <strong className="font-mono text-slate-700 text-sm leading-none">
                                    {cltStatsCalculated ? cltStatsCalculated.skewness.toFixed(3) : "未采样"}
                                  </strong>
                                  <span className={`text-[8px] font-black px-1.5 py-0.2 rounded-sm leading-none ${
                                    cltStatsCalculated && Math.abs(cltStatsCalculated.skewness) < 0.15
                                      ? "bg-emerald-50 text-emerald-600 border border-emerald-150"
                                      : "bg-amber-50 text-amber-600 border border-amber-150"
                                  }`}>
                                    {cltStatsCalculated ? (Math.abs(cltStatsCalculated.skewness) < 0.15 ? "对称正态" : "非对称") : "等待"}
                                  </span>
                                </div>
                                <p className="text-[8px] text-slate-400 leading-none pt-1">
                                  父代: ~{cltPopType === "bimodal" ? "-0.4" : cltPopType === "skewed_exponential" ? "2.0" : "0.9"}
                                </p>
                              </div>

                              {/* Kurtosis indicator */}
                              <div className="bg-white p-3 rounded-xl border border-slate-150/80 space-y-1 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                                <span className="text-[9px] text-slate-400 block font-bold leading-none">超额峰度 (Kurtosis)</span>
                                <div className="flex items-baseline justify-between gap-1 pt-1">
                                  <strong className="font-mono text-slate-700 text-sm leading-none">
                                    {cltStatsCalculated ? cltStatsCalculated.excessKurtosis.toFixed(3) : "未采样"}
                                  </strong>
                                  <span className={`text-[8px] font-black px-1.5 py-0.2 rounded-sm leading-none ${
                                    cltStatsCalculated && Math.abs(cltStatsCalculated.excessKurtosis) < 0.25
                                      ? "bg-emerald-50 text-emerald-600 border border-emerald-150"
                                      : "bg-amber-50 text-amber-600 border border-amber-150"
                                  }`}>
                                    {cltStatsCalculated ? (Math.abs(cltStatsCalculated.excessKurtosis) < 0.25 ? "常峰正态" : "偏态峰") : "等待"}
                                  </span>
                                </div>
                                <p className="text-[8px] text-slate-400 leading-none pt-1">
                                  父代: ~{cltPopType === "bimodal" ? "-0.8" : cltPopType === "skewed_exponential" ? "6.0" : "1.2"}
                                </p>
                              </div>
                            </div>

                            <p className="text-[9.5px] text-slate-500 leading-relaxed font-semibold">
                              💡 <strong>收敛定理：</strong> 当 <strong>N</strong> 变大或采样量 <strong>M</strong> 递增时，原本极度不对称的母体均值高阶偏斜与突顶形态将被<strong>大数铁律强制驯服抹平</strong>，极速归向 0 轴。
                            </p>
                          </div>
                        </div>

                      </div>
                    </div>

                    {/* Bottom View: Sample Means Asymptotic Histogram */}
                    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                      
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-3">
                        <div>
                          <h4 className="text-xs font-black uppercase tracking-widest text-indigo-600 flex items-center gap-1.5">
                            D. 均值 X̄ 的渐近分布直方图 与 极限界拟合曲线对比
                          </h4>
                          <p className="text-[10px] text-slate-400">
                            柱子代表 <span className="text-indigo-600 font-bold">实测均值密度</span>。绿色实线代表 <span className="text-emerald-600 font-bold">CLT极限界 理论预测分布 N(μ, σ/vN)</span>。
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-200">
                          <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping ml-1" />
                          <span className="text-[10px] text-slate-500 font-semibold px-1 rounded">
                            N={cltN}, M={cltM} 模型拟合
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-center">
                        
                        {/* Histogram Panel */}
                        <div className="md:col-span-3 h-[300px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={cltHistogramData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                              <XAxis dataKey="xLabel" tick={{ fill: "#475569", fontSize: 9 }} />
                              <YAxis tick={{ fill: "#475569", fontSize: 9 }} />
                              <RechartsTooltip content={<CustomHistogramTooltip />} />
                              
                              {/* Measured Mean distribution bars */}
                              <Bar dataKey="empirical" fill="#6366f1" fillOpacity={0.35} stroke="#6366f1" strokeWidth={1} name="均值实测频率密度 (Empirical)" />
                              
                              {/* Predicted normal distribution (Bell Curve) curve */}
                              <Line type="monotone" dataKey="theoretical" stroke="#059669" strokeWidth={2.5} dot={false} activeDot={false} name="CLT极限界 理论预测曲线 (Normal)" />
                              
                              {/* Vertical standard line at true pop mean */}
                              <ReferenceLine x={cltHistogramData.find(d => Math.abs(d.x - CLT_POPULATION_METADATA[cltPopType].mean) < 0.25)?.xLabel} stroke="#ef4444" strokeDasharray="3 3" strokeWidth={1.5} />
                            </ComposedChart>
                          </ResponsiveContainer>
                        </div>

                        {/* Side comparison stats scoreboard */}
                        <div className="space-y-4">
                          <div className="text-xs bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-3.5">
                            <span className="text-[10px] text-slate-400 font-black tracking-widest block uppercase">精度验证面板：</span>
                            
                            {/* Mean Match verification */}
                            <div className="space-y-1">
                              <span className="text-[10px] text-slate-500 block font-bold">期望中心 (X̄ vs μ)：</span>
                              <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono leading-none">
                                <div className="bg-white p-2 rounded-lg border border-slate-150 text-slate-600 block">
                                  <span className="text-[9px] text-slate-400 block mb-0.5">母体偏心 μ</span>
                                  <strong>{CLT_POPULATION_METADATA[cltPopType].mean.toFixed(4)}</strong>
                                </div>
                                <div className="bg-white p-2 rounded-lg border border-indigo-200 text-indigo-700 block">
                                  <span className="text-[9px] text-indigo-400 block mb-0.5">实测中心 X̄</span>
                                  <strong>{cltStatsCalculated ? cltStatsCalculated.mean.toFixed(4) : "等待采样..."}</strong>
                                </div>
                              </div>
                            </div>

                            {/* Standard Error Match verification */}
                            <div className="space-y-1">
                              <span className="text-[10px] text-slate-500 block font-bold">标准误差 (SE vs SE_emp)：</span>
                              <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono leading-none">
                                <div className="bg-white p-2 rounded-lg border border-slate-150 text-slate-600 block">
                                  <span className="text-[9px] text-slate-400 block mb-0.5">理论预测 SE</span>
                                  <strong>{Math.sqrt(CLT_POPULATION_METADATA[cltPopType].variance / cltN).toFixed(4)}</strong>
                                </div>
                                <div className="bg-white p-2 rounded-lg border border-emerald-200 text-emerald-700 block">
                                  <span className="text-[9px] text-emerald-400 block mb-0.5">物理实测 SE</span>
                                  <strong>{cltStatsCalculated ? cltStatsCalculated.stdDev.toFixed(4) : "等待采样..."}</strong>
                                </div>
                              </div>
                            </div>

                            {/* Congratulatory badge */}
                            <div className="bg-indigo-50/50 p-2.5 rounded-xl border border-indigo-100/40 text-[10px] text-slate-600 leading-relaxed font-semibold">
                              {cltMeans.length > 30 ? (
                                <span>✨ <strong>惊人见证！</strong> 实测标准差与理论正态标准差 (SE = σ/√N) 完全重合拟合！这就是大数支配！</span>
                              ) : (
                                <span className="animate-pulse text-indigo-600">💡 提示：开始连续抽样，吸纳 50 例以上的均值样本，见证物理拟合值的渐进逼近！</span>
                              )}
                            </div>

                          </div>
                        </div>

                      </div>

                    </div>

                  </div>

                </div>

              </div>
            )}

            {/* Tab 4: Knowledge Library */}
            {activeTab === "knowledge" && (
              <div className="space-y-6 animate-fadeIn">
                
                {/* Visual formulas display card */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* General theory info */}
                  <div className="rounded-3xl border border-slate-200 bg-white p-6 space-y-4 flex flex-col justify-between shadow-sm">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5 mb-2">
                        <BookOpen className="h-4 w-4 text-indigo-600" />
                        数学公式与函数形式
                      </h3>
                      <p className="text-xs text-slate-500 leading-relaxed mb-4">
                        概率分布可用函数代表。连续型随机变量由概率密度函数 (PDF) 决定，区间积分表示概率；离散变量由频率质量函数 (PMF) 表达，点点相加等于概率。
                      </p>

                      <div className="space-y-2 text-xs">
                        <div className="bg-slate-50 p-3 px-4 rounded-2xl border border-slate-200/60 flex items-center justify-between gap-4">
                          <span className="text-slate-500 font-bold shrink-0">{currentDist.pdfLabel} 公式:</span>
                          <div className="text-slate-800 flex-1 text-right sm:text-left overflow-x-auto">
                            <MathLaTeX math={currentDist.formulaPDF} />
                          </div>
                        </div>
                        <div className="bg-slate-50 p-3 px-4 rounded-2xl border border-slate-200/60 flex items-center justify-between gap-4">
                          <span className="text-slate-500 font-bold shrink-0">累积 CDF 公式:</span>
                          <div className="text-slate-800 flex-1 text-right sm:text-left overflow-x-auto">
                            <MathLaTeX math={currentDist.formulaCDF} />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                      <span>分布类别: {currentDist.typeCH}</span>
                      <span>均值形态: 可变参数控制</span>
                    </div>
                  </div>

                  {/* Built-in experiment guided slices */}
                  <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5 mb-2">
                      <Sparkles className="h-4 w-4 text-indigo-600" />
                      交互式“实验指南预设” (Presets)
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed mb-4">
                      点击下述预设学者实验切片研究，分布参数和曲线将瞬间闪速滑变，展现其标志性的形态极限！
                    </p>

                    <div className="space-y-2.5">
                      {currentDist.presets.map((preset, idx) => (
                        <div
                          key={idx}
                          role="button"
                          onClick={() => handleApplyPreset(preset)}
                          className="w-full text-left rounded-2xl border border-slate-100 bg-slate-50 hover:border-indigo-300 hover:bg-indigo-50/20 p-4 transition-all text-xs group cursor-pointer"
                        >
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">
                              {preset.title}
                            </span>
                            <span className="font-mono text-[10px] text-indigo-600 font-bold bg-indigo-50 px-1.5 py-0.5 rounded-full">
                              {JSON.stringify(preset.params)}
                            </span>
                          </div>
                          <p className="text-slate-550 leading-normal text-[11px] mb-1.5">{preset.description}</p>
                          <p className="text-[10px] text-indigo-700 italic font-medium">
                            <strong>研究重点：</strong> {preset.focusExplanation}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>

                {/* Real-world Scenarios Gallery list */}
                <div className="rounded-3xl border border-slate-200 bg-white p-6 space-y-4 shadow-sm">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <CheckCircle className="h-4 w-4 text-emerald-600" />
                    现实落地应用场景案例
                  </h3>
                  <p className="text-xs text-slate-500">
                    这个经典的统计分布在现实人类社会及大自然生产运行中有什么具体的映射应用？
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {currentDist.examples.map((ex, idx) => (
                      <div key={idx} className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-5 space-y-2 text-xs">
                        <span className="font-bold text-indigo-700 block text-sm border-b border-slate-200 pb-2">
                          {ex.title}
                        </span>
                        <p className="text-slate-600 leading-relaxed font-medium">{ex.scenario}</p>
                        <p className="text-[11px] text-slate-400 leading-snug bg-white border border-slate-100 p-2.5 rounded-xl font-medium">
                          <strong>参数落地：</strong> {ex.parameterExplanation}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}

          </main>
        </div>
      </div>

      {/* RIGHT SIDEBAR (AI tutoring assistant copilot collapsible) */}
      {isSidebarOpen && (
        <aside className="w-[360px] border-l border-slate-200 bg-slate-50 shrink-0 h-full animate-fadeIn">
          <AICopilot
            distribution={currentDist.nameCH}
            parameters={params}
            onApplyDistribution={handleApplyDistributionFromAI}
          />
        </aside>
      )}

    </div>
  );
}
