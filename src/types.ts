export type DistributionType = "Binomial" | "Poisson" | "Normal" | "Exponential" | "Gamma" | "Beta";

export interface ParameterDef {
  name: string;
  label: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  description: string;
}

export interface RealWorldExample {
  title: string;
  scenario: string;
  parameterExplanation: string;
}

export interface ExperimentPreset {
  title: string;
  description: string;
  params: Record<string, number>;
  focusExplanation: string;
}

export interface DistributionInfo {
  type: DistributionType;
  nameCH: string;
  typeCH: "离散型" | "连续型";
  formulaPDF: string; // LaTex-like formula for display
  formulaCDF: string;
  pdfLabel: string; // PMF or PDF
  description: string;
  parameters: ParameterDef[];
  examples: RealWorldExample[];
  presets: ExperimentPreset[];
  // Math properties given actual parameters
  stats: (params: Record<string, number>) => {
    mean: number;
    variance: number;
    skewness: number;
    kurtosis: number;
  };
}

export interface Message {
  id: string;
  role: "user" | "model";
  content: string;
  timestamp: Date;
}

export interface SamplePoint {
  index: number;
  value: number;
}

export interface MCPoint {
  x: number;
  y: number;
  isUnder: boolean;
}
