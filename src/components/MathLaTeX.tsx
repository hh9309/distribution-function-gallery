import React, { useMemo } from "react";
import katex from "katex";

interface MathProps {
  math: string;
  block?: boolean;
}

export function MathLaTeX({ math, block = false }: MathProps) {
  const html = useMemo(() => {
    if (!math) return "";
    try {
      return katex.renderToString(math, {
        displayMode: block,
        throwOnError: false,
      });
    } catch (error) {
      console.error("KaTeX failed to render:", math, error);
      return `<code class="text-rose-500 font-mono text-[11px]">${math}</code>`;
    }
  }, [math, block]);

  return (
    <span
      className={block ? "block my-2 overflow-x-auto" : "inline-block align-middle"}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

interface MathTextProps {
  text: string;
}

/**
 * Parses and renders text containing inline LaTeX enclosed in single $ symbols.
 * Example: "拉动 $a$ 到 $b$ 计算概率 $P(a \le X \le b)$"
 */
export function MathText({ text }: MathTextProps) {
  const parts = useMemo(() => {
    if (!text) return [];
    
    // Split on $...$ but keep delimiters so we can distinguish them
    // Note: This regex splits by $...$
    return text.split(/(\$[^\$]+\$)/g);
  }, [text]);

  if (parts.length === 0) return null;

  return (
    <>
      {parts.map((part, index) => {
        if (part.startsWith("$") && part.endsWith("$") && part.length > 2) {
          const formula = part.slice(1, -1);
          try {
            const html = katex.renderToString(formula, {
              displayMode: false,
              throwOnError: false,
            });
            return (
              <span
                key={index}
                className="inline-block align-middle px-0.5"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            );
          } catch (err) {
            return (
              <code key={index} className="text-rose-600 bg-rose-50 px-1 rounded font-mono text-xs">
                {formula}
              </code>
            );
          }
        }
        return <span key={index}>{part}</span>;
      })}
    </>
  );
}
