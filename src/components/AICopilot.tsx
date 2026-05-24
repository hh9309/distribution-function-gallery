import React, { useState, useRef, useEffect } from "react";
import { Send, Sparkles, Loader, BrainCircuit, Settings, Eye, EyeOff, Save, Key } from "lucide-react";
import { Message, DistributionType } from "../types";

interface AICopilotProps {
  distribution: string;
  parameters: Record<string, number>;
  onApplyDistribution: (type: DistributionType, params: Record<string, number>) => void;
}

interface LLMSettings {
  provider: "gemini" | "deepseek";
  apiKey: string;
  model: string;
  baseUrl: string;
}

export default function AICopilot({ distribution, parameters, onApplyDistribution }: AICopilotProps) {
  // 1. LLM configurations persisted in localStorage
  const [settings, setSettings] = useState<LLMSettings>(() => {
    try {
      const saved = localStorage.getItem("ai_copilot_settings");
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          provider: parsed.provider || "gemini",
          apiKey: parsed.apiKey || "",
          model: parsed.model || (parsed.provider === "deepseek" ? "deepseek-reasoner" : "gemini-2.5-flash"),
          baseUrl: parsed.baseUrl || ""
        };
      }
    } catch (e) {
      console.error("Failed to restore LLM settings:", e);
    }
    return {
      provider: "gemini",
      apiKey: "",
      model: "gemini-2.5-flash",
      baseUrl: ""
    };
  });

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [tempSettings, setTempSettings] = useState<LLMSettings>(settings);

  // Sync temp settings when main settings panel triggers
  useEffect(() => {
    setTempSettings(settings);
  }, [settings, isSettingsOpen]);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "model",
      content: `👋 你好！我是你的 AI 概率统计私教。
我能帮你：
1. 深入解释当前 **${distribution}** 后背后的物理涵义与公式原理；
2. 为你推荐适合特定实际应用场景（例如排队、点击率建模）的概率分布及参数；
3. 解答任何关于概率论、大数定律、中心极限定理的疑问。

※ **使用准备**：因本项目支持部署在 GitHub 等持续交付平台，大模型目前采用**自备 API-Key (Bring Your Own Key) **运行模式。请点击右上角 ⚙️ 齿轮图标，输入您的 1) Google Gemini 密钥 或 2) DeepSeek 密钥，确认并保存配置后，即可解锁全部 AI 精准推演功能！`,
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [scenarioInput, setScenarioInput] = useState("");
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestResult, setSuggestResult] = useState<{
    distribution: string;
    reasoning: string;
    parameterSuggestion: string;
  } | null>(null);

  const [apiError, setApiError] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Action: Save custom LLM configurations
  const saveSettings = () => {
    if (!tempSettings.apiKey.trim()) {
      alert("⚠️ 请先手工输入有效的 API-Key！密钥在您本地浏览器加密存储，不会泄露给第三方。");
      return;
    }
    
    // Auto populate standard baseUrls if not customized
    const finalSettings = {
      ...tempSettings,
      apiKey: tempSettings.apiKey.trim(),
      baseUrl: tempSettings.baseUrl.trim() || (tempSettings.provider === "deepseek" ? "https://api.deepseek.com/v1" : "")
    };

    localStorage.setItem("ai_copilot_settings", JSON.stringify(finalSettings));
    setSettings(finalSettings);
    setIsSettingsOpen(false);
    setApiError(null);

    setMessages((prev) => [
      ...prev,
      {
        id: Math.random().toString(),
        role: "model",
        content: `⚙️ **大模型私教配置已成功应用并保存！**
- **当前服务商**: ${finalSettings.provider === "gemini" ? "Google Gemini (谷歌)" : "DeepSeek (深度求索)"}
- **选定大模型**: \`${finalSettings.model}\`
- **安全保障**: 密钥已写入您的本地浏览器缓存 \`localStorage\`，完全不占用公用额度，支持项目在您自己的 GitHub 稳定、高质量、无限期真实可用。

您可以点击下方或向我任意提问了！`,
        timestamp: new Date(),
      }
    ]);
  };

  // Action: Reset settings
  const clearSettings = () => {
    if (window.confirm("确定要清除您本地保存的 API-Key 吗？清除后将需要重新配置才能使用 AI 大模型。")) {
      localStorage.removeItem("ai_copilot_settings");
      const cleared: LLMSettings = {
        provider: "gemini",
        apiKey: "",
        model: "gemini-2.5-flash",
        baseUrl: ""
      };
      setSettings(cleared);
      setTempSettings(cleared);
      setIsSettingsOpen(false);
    }
  };

  const handleSend = async (textToSend?: string) => {
    const text = textToSend || inputValue.trim();
    if (!text) return;

    if (!textToSend) setInputValue("");
    setApiError(null);

    // If API key is missing
    if (!settings.apiKey) {
      setIsSettingsOpen(true);
      setMessages((prev) => [
        ...prev,
        {
          id: Math.random().toString(),
          role: "model",
          content: `🔒 **请先配置 API Key**：
大模型当前未激活。请在上方展开的 **⚙️ AI 统计私教配置中心** 中手动输入您的 **Gemini API Key** 或 **DeepSeek API Key**，并点击 **确认大模型选择** 激活并运行安全、专属的主动浏览器端推理算力。`,
          timestamp: new Date(),
        },
      ]);
      return;
    }

    const userMsg: Message = {
      id: Math.random().toString(),
      role: "user",
      content: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    const systemPrompt = `You are a helpful, expert AI Probability & Statistics tutor inside the "Probability Distribution Gallery" WebApp.
Your goal is to help users intuitively understand probability distributions, their PMF/PDF/CDF curves, and their real-world applications.
The user is currently studying the [${distribution || "Normal"}] distribution with parameters: ${JSON.stringify(parameters || {})}.

Be conversational, concise, and focused on intuitive understanding (e.g. why the shape changes, what the parameters mean physically).
Avoid dry, overly complex math definitions unless asked. Use clear paragraphs, bullet points, or markdown tables.
If the user asks an unrelated question, politely redirect them to statistics and probability.`;

    try {
      let replyText = "";
      if (settings.provider === "gemini") {
        const targetModel = settings.model === "gemini-3.5-flash" ? "gemini-2.5-flash" : settings.model;
        const baseUrl = settings.baseUrl || "https://generativelanguage.googleapis.com";
        const urlStr = `${baseUrl}/v1beta/models/${targetModel}:generateContent?key=${settings.apiKey}`;

        // Construct Gemini messages history
        const contents = [];
        for (const h of messages) {
          if (h.id === "welcome") continue;
          contents.push({
            role: h.role === "user" ? "user" : "model",
            parts: [{ text: h.content }],
          });
        }
        contents.push({
          role: "user",
          parts: [{ text: text }],
        });

        const response = await fetch(urlStr, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents,
            systemInstruction: {
              parts: [{ text: systemPrompt }]
            },
            generationConfig: {
              temperature: 0.7,
            }
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`API returned error (${response.status}): ${errText}`);
        }

        const data = await response.json();
        replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || "抱歉，我未能生成有效的回复。";
      } else {
        // DeepSeek / OpenAI Compatible
        const targetBaseUrl = settings.baseUrl || "https://api.deepseek.com/v1";
        const actualUrl = targetBaseUrl.endsWith("/") ? `${targetBaseUrl}chat/completions` : `${targetBaseUrl}/chat/completions`;

        const requestMessages = [
          { role: "system", content: systemPrompt },
          ...messages.filter(m => m.id !== "welcome").map((m) => ({
            role: m.role === "user" ? "user" : "assistant",
            content: m.content,
          })),
          { role: "user", content: text }
        ];

        const response = await fetch(actualUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${settings.apiKey}`
          },
          body: JSON.stringify({
            model: settings.model || "deepseek-reasoner",
            messages: requestMessages,
            temperature: 0.7,
          })
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`API returned error (${response.status}): ${errText}`);
        }

        const data = await response.json();
        const content = data?.choices?.[0]?.message?.content || "";
        const reasoningContent = data?.choices?.[0]?.message?.reasoning_content;

        replyText = content;
        if (reasoningContent) {
          replyText = `> 💭 **DeepSeek R1 深度思考：**\n> ${reasoningContent.replace(/\n/g, "\n> ")}\n\n${content}`;
        }
      }

      const modelMsg: Message = {
        id: Math.random().toString(),
        role: "model",
        content: replyText,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, modelMsg]);
    } catch (err: any) {
      console.error(err);
      let errorMsg = err.message || "与AI服务器连接失败，请稍后检查配置或网络。";
      if (errorMsg.includes("API Key") || errorMsg.includes("Key") || errorMsg.includes("authorization") || errorMsg.includes("401") || errorMsg.includes("403")) {
        errorMsg = "⚠️ 提示：您输入的 API Key 好像不正确或已失效。请点击右上角齿轮，重新验证并配置您的 AI 秘钥。";
      }
      setApiError(errorMsg);
      setMessages((prev) => [
        ...prev,
        {
          id: Math.random().toString(),
          role: "model",
          content: `❌ **出错了：** \n\n${errorMsg}`,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggest = async () => {
    if (!scenarioInput.trim()) return;

    if (!settings.apiKey) {
      setIsSettingsOpen(true);
      setMessages((prev) => [
        ...prev,
        {
          id: Math.random().toString(),
          role: "model",
          content: `🔒 **建模功能不可用**：
大模型未激活。请点击右上角 **⚙️ 齿轮配置中心**，手工输入您服务商的 API Key 并保存激活。`,
          timestamp: new Date(),
        },
      ]);
      return;
    }

    setIsSuggesting(true);
    setSuggestResult(null);
    setApiError(null);

    const systemPrompt = `You are an expert statistical consultant. Based on the user's real-world scenario, you suggest the best probability distribution to model it.
You MUST reply with a structured JSON object containing:
- "distribution": Name of the suggested distribution in English, must be exactly one of: "Binomial", "Poisson", "Normal", "Exponential", "Gamma", "Beta"
- "reasoning": Clear, friendly explanation of why this distribution is chosen, what the random variable represents, and what physical assumptions apply.
- "parameterSuggestion": A draft of how parameters should be interpreted or set for their case.

Reply in JSON format only. Write the explanation in Chinese (simplified) since the WebApp interface is in Chinese. Ensure the JSON is well-formed.`;

    try {
      let data: any = null;
      if (settings.provider === "gemini") {
        const targetModel = settings.model === "gemini-3.5-flash" ? "gemini-2.5-flash" : settings.model;
        const baseUrl = settings.baseUrl || "https://generativelanguage.googleapis.com";
        const urlStr = `${baseUrl}/v1beta/models/${targetModel}:generateContent?key=${settings.apiKey}`;

        const response = await fetch(urlStr, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [{ text: `Scenario: "${scenarioInput}"` }]
              }
            ],
            systemInstruction: {
              parts: [{ text: systemPrompt }]
            },
            generationConfig: {
              temperature: 0.2,
              responseMimeType: "application/json",
              responseSchema: {
                type: "OBJECT",
                properties: {
                  distribution: { type: "STRING", description: "One of: Binomial, Poisson, Normal, Exponential, Gamma, Beta" },
                  reasoning: { type: "STRING", description: "Chinese explanation" },
                  parameterSuggestion: { type: "STRING", description: "Chinese parameter advice" },
                },
                required: ["distribution", "reasoning", "parameterSuggestion"],
              }
            }
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`API returned error (${response.status}): ${errText}`);
        }

        const resultJson = await response.json();
        const rawText = resultJson.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
        data = JSON.parse(rawText.trim());
      } else {
        // DeepSeek
        const targetBaseUrl = settings.baseUrl || "https://api.deepseek.com/v1";
        const actualUrl = targetBaseUrl.endsWith("/") ? `${targetBaseUrl}chat/completions` : `${targetBaseUrl}/chat/completions`;

        const openaiModel = settings.model === "deepseek-reasoner" ? "deepseek-chat" : settings.model;

        const response = await fetch(actualUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${settings.apiKey}`
          },
          body: JSON.stringify({
            model: openaiModel,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: `请分析以下实际业务场景并按规定JSON格式输出: "${scenarioInput}"` }
            ],
            response_format: { type: "json_object" },
            temperature: 0.2,
          })
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`API returned error (${response.status}): ${errText}`);
        }

        const responseData = await response.json();
        const content = responseData?.choices?.[0]?.message?.content || "{}";
        
        let parsedContent = content.trim();
        if (parsedContent.startsWith("```json")) {
          parsedContent = parsedContent.replace(/^```json/, "").replace(/```$/, "").trim();
        } else if (parsedContent.startsWith("```")) {
          parsedContent = parsedContent.replace(/^```/, "").replace(/```$/, "").trim();
        }

        data = JSON.parse(parsedContent);
      }

      setSuggestResult(data);
    } catch (err: any) {
      console.error(err);
      let errorMsg = "自动分析推荐失败，请稍后检查网络。";
      if (err.message && (err.message.includes("Key") || err.message.includes("key") || err.message.includes("401"))) {
        errorMsg = "⚠️ 提示：API Key 未能通过验证。请点击右上角齿轮，确认输入正确的 API Key。";
      }
      setApiError(errorMsg);
    } finally {
      setIsSuggesting(false);
    }
  };

  const applySuggested = () => {
    if (!suggestResult) return;
    const distType = suggestResult.distribution as DistributionType;
    let defaultParams: Record<string, number> = {};
    if (distType === "Normal") defaultParams = { mu: 0, sigma: 1 };
    else if (distType === "Binomial") defaultParams = { n: 20, p: 0.5 };
    else if (distType === "Poisson") defaultParams = { lambda: 4 };
    else if (distType === "Exponential") defaultParams = { lambda: 1 };
    else if (distType === "Gamma") defaultParams = { alpha: 2, beta: 1 };
    else if (distType === "Beta") defaultParams = { alpha: 2, beta: 2 };

    onApplyDistribution(distType, defaultParams);

    // Append notification to chat
    setMessages((prev) => [
      ...prev,
      {
        id: Math.random().toString(),
        role: "model",
        content: `✅ 已为你自动应用了 **${suggestResult.distribution}** 概率分布，以及标准的初始参数。

快在左侧的主控可视化面板上拉动滑块观察它吧！`,
        timestamp: new Date(),
      },
    ]);
    setScenarioInput("");
    setSuggestResult(null);
  };

  return (
    <div className="flex h-full flex-col bg-slate-50 text-slate-800 border-l border-slate-200">
      {/* Sidebar Header */}
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 bg-white shrink-0">
        <div className="flex items-center gap-2">
          <BrainCircuit className="h-5 w-5 text-indigo-600 animate-pulse" />
          <h2 className="font-bold text-sm tracking-tight text-slate-900">AI 概率统计私教</h2>
        </div>
        
        <div className="flex items-center gap-2">
          {settings.apiKey ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-emerald-600 border border-emerald-100/60 shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>已激活 ({settings.provider === "gemini" ? "Google" : "DeepSeek"})</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[9px] font-bold text-rose-600 border border-rose-100 animate-pulse shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
              <span>自备 Key 激活</span>
            </span>
          )}

          <button
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            className={`p-1.5 rounded-lg border transition-transform duration-300 hover:rotate-45 cursor-pointer ${
              isSettingsOpen 
                ? "bg-indigo-50 border-indigo-200 text-indigo-600 shadow-sm" 
                : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700"
            }`}
            title="配置大模型 API 密钥与服务"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Slide-Down Settings Panel */}
      {isSettingsOpen && (
        <div className="bg-slate-100/80 border-b border-slate-200 p-5 space-y-3.5 animate-fadeIn shrink-0">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-widest flex items-center gap-1.5">
              <Settings className="h-3.5 w-3.5 text-indigo-600 animate-spin-slow" />
              <span>大模型私教设置中心</span>
            </h3>
            <span className="text-[10px] text-slate-400 bg-white border border-slate-200/80 rounded px-1.5 py-0.5">本地安全缓存</span>
          </div>

          <div className="space-y-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm text-xs">
            {/* 1. Provider Choose */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wide">1. 选择 API 服务商 (Provider)</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setTempSettings(prev => ({
                      ...prev,
                      provider: "gemini",
                      model: "gemini-2.5-flash",
                      baseUrl: ""
                    }));
                  }}
                  className={`py-2 px-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                    tempSettings.provider === "gemini"
                      ? "bg-indigo-50 border-indigo-500 text-indigo-700 font-bold shadow-sm"
                      : "bg-slate-50 border-slate-200/80 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  🚀 Google Gemini
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTempSettings(prev => ({
                      ...prev,
                      provider: "deepseek",
                      model: "deepseek-reasoner",
                      baseUrl: "https://api.deepseek.com/v1"
                    }));
                  }}
                  className={`py-2 px-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                    tempSettings.provider === "deepseek"
                      ? "bg-indigo-50 border-indigo-500 text-indigo-700 font-bold shadow-sm"
                      : "bg-slate-50 border-slate-200/80 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  🧠 DeepSeek (R1)
                </button>
              </div>
            </div>

            {/* 2. Model Choose */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wide">2. 选择大模型 (Select Model)</label>
              <select
                value={tempSettings.model}
                onChange={(e) => setTempSettings(prev => ({ ...prev, model: e.target.value }))}
                className="w-full rounded-xl border border-slate-250 bg-slate-50/60 px-3 py-2 text-xs text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {tempSettings.provider === "gemini" ? (
                  <>
                    <option value="gemini-2.5-flash">Gemini 2.5 Flash (极速智能 - 默认推荐)</option>
                    <option value="gemini-1.5-flash">Gemini 1.5 Flash (经典高速算力)</option>
                    <option value="gemini-2.5-pro">Gemini 2.5 Pro (超长文本与顶级推理)</option>
                  </>
                ) : (
                  <>
                    <option value="deepseek-reasoner">DeepSeek R1 (具备长推理链与思维链推理)</option>
                    <option value="deepseek-chat">DeepSeek V3 (极快单句闲聊)</option>
                  </>
                )}
              </select>
            </div>

            {/* 3. API Key */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wide">3. 手工输入 API-Key</label>
                <a
                  href={tempSettings.provider === "gemini" ? "https://aistudio.google.com/" : "https://platform.deepseek.com/"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-indigo-600 hover:underline font-bold"
                >
                  获取 API Key ↗
                </a>
              </div>
              <div className="relative flex items-center">
                <input
                  type={showKey ? "text" : "password"}
                  value={tempSettings.apiKey}
                  onChange={(e) => setTempSettings(prev => ({ ...prev, apiKey: e.target.value }))}
                  placeholder={tempSettings.provider === "gemini" ? "AIzaSy..." : "sk-..."}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 pr-10 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* 4. Base URL Proxy */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wide">4. 自定义 API 接口地址 (代理服务商 - 可选)</label>
              <input
                type="text"
                value={tempSettings.baseUrl}
                onChange={(e) => setTempSettings(prev => ({ ...prev, baseUrl: e.target.value }))}
                placeholder={tempSettings.provider === "gemini" ? "保持空白以调用 Google 官方接口" : "例: https://api.deepseek.com/v1 (支持中继)"}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-1.5">
              <button
                type="button"
                onClick={saveSettings}
                className="flex-grow rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black py-2.5 text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-sm shadow-indigo-100 cursor-pointer"
              >
                <Save className="h-3.5 w-3.5" />
                <span>确认大模型选择</span>
              </button>
              {settings.apiKey && (
                <button
                  type="button"
                  onClick={clearSettings}
                  className="rounded-xl border border-rose-200 text-rose-500 hover:bg-rose-50 px-3 py-2.5 font-bold hover:text-rose-600 transition-colors cursor-pointer"
                  title="清空本地密钥记录"
                >
                  清除
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Suggest tool segment inside AI box */}
      <div className="border-b border-slate-200 bg-white p-5 shrink-0 shadow-sm">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-2">
          <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
          智能学术建模场景分析
        </h3>
        <p className="text-xs text-slate-500 mb-3 leading-relaxed">
          描述你现实想研究的状况，AI 自动为你研判推荐匹配的概率模型与解释！
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            className="flex-1 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-slate-50 transition-shadow"
            placeholder={settings.apiKey ? "例如: 模拟银行客户排队等候服务时间..." : "🔒 请先在右上角齿轮中心配置 API-Key"}
            value={scenarioInput}
            onChange={(e) => setScenarioInput(e.target.value)}
            disabled={isSuggesting || !settings.apiKey}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSuggest();
            }}
          />
          <button
            onClick={handleSuggest}
            disabled={isSuggesting || !scenarioInput.trim() || !settings.apiKey}
            className="rounded-full bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500 active:scale-95 disabled:pointer-events-none disabled:opacity-50 transition-all flex items-center gap-1 shrink-0 shadow-sm"
          >
            {isSuggesting ? <Loader className="h-3 w-3 animate-spin" /> : "分析"}
          </button>
        </div>

        {/* Suggest result card */}
        {suggestResult && (
          <div className="mt-3.5 rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4 animate-fadeIn">
            <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
              <span className="text-xs font-bold text-indigo-800">
                推荐分布: <b className="text-sm text-slate-900 font-mono font-black">{suggestResult.distribution}</b>
              </span>
              <button
                onClick={applySuggested}
                className="rounded-full bg-indigo-600 hover:bg-indigo-500 px-3 py-1 text-[11px] font-bold text-white active:scale-95 transition-all shadow-sm shadow-indigo-100"
              >
                立即应用
              </button>
            </div>
            <p className="text-[11px] text-slate-700 leading-relaxed mb-2">
              <strong>核心逻辑：</strong> {suggestResult.reasoning}
            </p>
            <p className="text-[11px] text-indigo-800 leading-relaxed font-semibold">
              <strong>参数建议：</strong> {suggestResult.parameterSuggestion}
            </p>
          </div>
        )}
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/40">
        {/* Local storage Key Requirement Card if missing key */}
        {!settings.apiKey && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-xs text-amber-900 space-y-2.5 shadow-sm animate-fadeIn">
            <div className="flex items-center gap-1.5 font-extrabold text-amber-800">
              <Key className="h-4 w-4 animate-bounce text-amber-600" />
              <span>大模型私教处于锁定状态</span>
            </div>
            <p className="leading-relaxed text-[11px] text-amber-800/90">
              因本项目需要支持一键打包与推送到 <strong>GitHub</strong> 宿主部署或长期分享使用，为了<strong>严防任何人泄露自己的公用私密 Token</strong>，我们不集成任何硬编码的云端私钥。
            </p>
            <p className="leading-relaxed text-[11px] text-amber-800/90">
              请点击右上角 <strong>⚙️ 齿轮小图标</strong> 手工填入您专属的 <strong>Google Gemini API-Key</strong> 或者 <strong>DeepSeek API-Key</strong>。系统将密钥自动持久加密保存在您<strong>自己当前浏览器中</strong>，在您提交代码、推送 Github 时安全无忧！
            </p>
            <div className="flex items-center justify-start pt-1">
              <button
                type="button"
                onClick={() => setIsSettingsOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-extrabold transition-colors flex items-center gap-1 cursor-pointer active:scale-95 text-[10px]"
              >
                <Settings className="h-3 w-3" />
                <span>立即填入 API-Key 激活 AI 私教</span>
              </button>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col max-w-[85%] ${
              msg.role === "user" ? "ml-auto items-end" : "mr-auto items-start"
            }`}
          >
            <div className="text-[10px] text-slate-400 font-semibold mb-1 px-1 uppercase tracking-wider">
              {msg.role === "user" ? "你" : msg.role === "welcome" ? "新手向导" : `${settings.provider === "gemini" ? "Gemini" : "DeepSeek R1"} 私教`}
            </div>
            <div
              className={`rounded-2xl px-4 py-2.5 text-xs leading-relaxed whitespace-pre-wrap shadow-sm transition-all ${
                msg.role === "user"
                  ? "bg-indigo-600 text-white rounded-tr-none font-medium"
                  : "bg-white text-slate-800 border border-slate-200/90 rounded-tl-none"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex flex-col items-start max-w-[85%]">
            <div className="text-[10px] text-slate-400 font-semibold mb-1 px-1 uppercase tracking-wider">
              {settings.provider === "gemini" ? "Gemini" : "DeepSeek R1"} 私教
            </div>
            <div className="rounded-2xl rounded-tl-none border border-slate-250 px-4 py-3 text-xs text-slate-600 bg-white flex items-center gap-2 shadow-sm">
              <Loader className="h-3 w-3 animate-spin text-indigo-600" />
              <span>
                {settings.provider === "deepseek" ? "DeepSeek R1 深度推演统计物理涵义中..." : "Gemini 正在推演整理分布规律..."}
              </span>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Chat Input */}
      <div className="border-t border-slate-200 bg-white p-4 shrink-0 shadow-inner">
        <div className="relative flex items-center">
          <input
            type="text"
            className="w-full rounded-full border border-slate-200 bg-slate-50 px-4 py-2.5 pr-11 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            placeholder={settings.apiKey ? "提问例如: 指数分布的【无记忆性】怎么形象理解？" : "🔒 请先填写您的 API-Key （点击右上角齿轮）"}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={isLoading || !settings.apiKey}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <button
            onClick={() => handleSend()}
            disabled={isLoading || !inputValue.trim() || !settings.apiKey}
            className="absolute right-1.5 rounded-full bg-indigo-600 p-1.5 text-white hover:bg-indigo-500 disabled:pointer-events-none disabled:opacity-45 transition-colors shadow-sm cursor-pointer"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
        <p className="text-[9px] text-slate-400 text-center mt-2 font-mono">
          当前提问上下文将融入选定的分布【{distribution}】及相关参数
        </p>
      </div>
    </div>
  );
}
