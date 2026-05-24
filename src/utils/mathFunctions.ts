// Mathematical utility functions for PMF/PDF, CDF, and Random Sampling

export function logGamma(z: number): number {
  if (z < 0.5) {
    return Math.log(Math.abs(Math.PI / Math.sin(Math.PI * z))) - logGamma(1 - z);
  }
  const p = [
    0.99999999999980993,
    676.5203681218851,
    -1259.1392167224028,
    771.32342877765313,
    -176.61502916214059,
    12.507343278686905,
    -0.13857109526572012,
    9.9843695780195716e-6,
    1.5056327351493116e-7
  ];
  z -= 1;
  let x = p[0];
  for (let i = 1; i < 9; i++) {
    x += p[i] / (z + i);
  }
  const t = z + 7.5;
  return Math.log(Math.sqrt(2 * Math.PI)) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}

export function gamma(z: number): number {
  return Math.exp(logGamma(z));
}

// Logarithm of Beta function: ln B(a,b) = ln Gamma(a) + ln Gamma(b) - ln Gamma(a+b)
export function logBeta(a: number, b: number): number {
  return logGamma(a) + logGamma(b) - logGamma(a + b);
}

// Factorial function
export function factorial(n: number): number {
  if (n <= 1) return 1;
  let res = 1;
  for (let i = 2; i <= n; i++) res *= i;
  return res;
}

// Binomial coefficient (n choose k)
export function choose(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  if (k === 0 || k === n) return 1;
  if (k > n / 2) k = n - k;
  let res = 1;
  for (let i = 1; i <= k; i++) {
    res *= (n - i + 1) / i;
  }
  return res;
}

// Probability Density Functions (PDF) / Probability Mass Functions (PMF)
export const PDFMap = {
  Binomial: (x: number, params: Record<string, number>): number => {
    const { n, p } = params;
    const k = Math.round(x);
    if (k < 0 || k > n) return 0;
    return choose(n, k) * Math.pow(p, k) * Math.pow(1 - p, n - k);
  },
  Poisson: (x: number, params: Record<string, number>): number => {
    const { lambda } = params;
    const k = Math.round(x);
    if (k < 0) return 0;
    // P(k) = lambda^k * e^-lambda / k!
    // Using logarithmic domain to avoid overflow
    return Math.exp(k * Math.log(lambda) - lambda - logGamma(k + 1));
  },
  Normal: (x: number, params: Record<string, number>): number => {
    const { mu, sigma } = params;
    const variance = sigma * sigma;
    return (
      (1 / (sigma * Math.sqrt(2 * Math.PI))) *
      Math.exp(-Math.pow(x - mu, 2) / (2 * variance))
    );
  },
  Exponential: (x: number, params: Record<string, number>): number => {
    const { lambda } = params;
    if (x < 0) return 0;
    return lambda * Math.exp(-lambda * x);
  },
  Gamma: (x: number, params: Record<string, number>): number => {
    // alpha = shape, beta = rate (or scale theta = 1/beta. Let's define parameters as alpha and beta rate)
    const { alpha, beta } = params;
    if (x <= 0) return 0;
    // PDF = beta^alpha / Gamma(alpha) * x^(alpha-1) * e^(-beta*x)
    // Using ln domain to handle large parameters
    const logPDF = alpha * Math.log(beta) - logGamma(alpha) + (alpha - 1) * Math.log(x) - beta * x;
    return Math.exp(logPDF);
  },
  Beta: (x: number, params: Record<string, number>): number => {
    const { alpha, beta } = params;
    if (x < 0 || x > 1) return 0;
    if (x === 0 && alpha < 1) return Infinity;
    if (x === 1 && beta < 1) return Infinity;
    if (x === 0 || x === 1) return 0;
    // PDF = x^(alpha-1) * (1-x)^(beta-1) / B(alpha, beta)
    const logPDF = (alpha - 1) * Math.log(x) + (beta - 1) * Math.log(1 - x) - logBeta(alpha, beta);
    return Math.exp(logPDF);
  },
};

// Error function (for normal CDF)
export function erf(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x);

  const t = 1.0 / (1.0 + p * absX);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX);

  return sign * y;
}

// Inexact/analytical Cumulative Distribution Functions (CDF)
// We provide exact/analytical CDF where easy, and numeric fallback for others
export const CDFMap = {
  Binomial: (x: number, params: Record<string, number>): number => {
    const { n, p } = params;
    const kMax = Math.floor(x);
    if (kMax < 0) return 0;
    if (kMax >= n) return 1;
    let sum = 0;
    for (let k = 0; k <= kMax; k++) {
      sum += PDFMap.Binomial(k, { n, p });
    }
    return Math.min(1, Math.max(0, sum));
  },
  Poisson: (x: number, params: Record<string, number>): number => {
    const { lambda } = params;
    const kMax = Math.floor(x);
    if (kMax < 0) return 0;
    let sum = 0;
    for (let k = 0; k <= kMax; k++) {
      sum += PDFMap.Poisson(k, { lambda });
    }
    return Math.min(1, Math.max(0, sum));
  },
  Normal: (x: number, params: Record<string, number>): number => {
    const { mu, sigma } = params;
    return 0.5 * (1 + erf((x - mu) / (sigma * Math.sqrt(2))));
  },
  Exponential: (x: number, params: Record<string, number>): number => {
    const { lambda } = params;
    if (x < 0) return 0;
    return 1 - Math.exp(-lambda * x);
  },
  // Lower Incomplete Gamma function approximation for Gamma CDF
  Gamma: (x: number, params: Record<string, number>): number => {
    const { alpha, beta } = params;
    if (x <= 0) return 0;
    
    // Numeric integration fallback for simplicity and absolute stability on curves
    // CDF(x) = integral_0^x PDF(t) dt
    const steps = 150;
    const dt = x / steps;
    let sum = 0;
    for (let i = 0; i < steps; i++) {
      const t = (i + 0.5) * dt;
      sum += PDFMap.Gamma(t, { alpha, beta }) * dt;
    }
    return Math.min(1, sum);
  },
  Beta: (x: number, params: Record<string, number>): number => {
    const { alpha, beta } = params;
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    
    // Simpson rule numerical integration
    const steps = 150;
    const dt = x / steps;
    let sum = 0;
    for (let i = 0; i < steps; i++) {
      const t = (i + 0.5) * dt;
      sum += PDFMap.Beta(t, { alpha, beta }) * dt;
    }
    return Math.min(1, sum);
  },
};

// Box-Müller transform for normal random sample
export function randomNormal(mu: number, sigma: number): number {
  let u1 = 0, u2 = 0;
  while (u1 === 0) u1 = Math.random();
  while (u2 === 0) u2 = Math.random();
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return mu + z0 * sigma;
}

// Gamma random sampler (Marsaglia and Tsang, 2000)
export function randomGamma(alpha: number, beta: number): number {
  if (alpha < 1) {
    return randomGamma(alpha + 1, beta) * Math.pow(Math.random(), 1 / alpha);
  }
  const d = alpha - 1/3;
  const c = 1 / Math.sqrt(9 * d);
  while (true) {
    let u = Math.random();
    let z = randomNormal(0, 1);
    let v = 1 + c * z;
    if (v <= 0) continue;
    let v3 = v * v * v;
    if (u < 1 - 0.0331 * z * z * z * z) {
      return (d * v3) / beta;
    }
    if (Math.log(u) < 0.5 * z * z + d * (1 - v3 + Math.log(v3))) {
      return (d * v3) / beta;
    }
  }
}

// Beta random sampler
export function randomBeta(alpha: number, beta: number): number {
  const g1 = randomGamma(alpha, 1);
  const g2 = randomGamma(beta, 1);
  if (g1 + g2 === 0) return 0.5;
  return g1 / (g1 + g2);
}

// Random Sampling generator
export function sampleDistribution(
  type: string,
  params: Record<string, number>
): number {
  switch (type) {
    case "Binomial": {
      const { n, p } = params;
      let count = 0;
      for (let i = 0; i < n; i++) {
        if (Math.random() < p) count++;
      }
      return count;
    }
    case "Poisson": {
      const { lambda } = params;
      if (lambda < 30) {
        // Knuth's algorithm
        const L = Math.exp(-lambda);
        let k = 0;
        let pResult = 1;
        do {
          k++;
          pResult *= Math.random();
        } while (pResult > L);
        return k - 1;
      } else {
        // Normal approximation
        const val = Math.round(randomNormal(lambda, Math.sqrt(lambda)));
        return Math.max(0, val);
      }
    }
    case "Normal": {
      const { mu, sigma } = params;
      return randomNormal(mu, sigma);
    }
    case "Exponential": {
      const { lambda } = params;
      return -Math.log(1.0 - Math.random()) / lambda;
    }
    case "Gamma": {
      const { alpha, beta } = params;
      return randomGamma(alpha, beta);
    }
    case "Beta": {
      const { alpha, beta } = params;
      return randomBeta(alpha, beta);
    }
    default:
      return Math.random();
  }
}
