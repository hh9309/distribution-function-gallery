import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// AI Endpoint: Chat / Explain with custom keys support
app.post("/api/chat", async (req, res) => {
  try {
    const { message, history, distribution, parameters, clientSettings } = req.body;
    
    // Resolve provider, key, model, and baseUrl
    const provider = clientSettings?.provider || "gemini";
    const apiKey = clientSettings?.apiKey || process.env.GEMINI_API_KEY;
    const model = clientSettings?.model || "gemini-2.5-flash";
    const baseUrl = clientSettings?.baseUrl || "";

    if (!apiKey) {
      return res.status(400).json({ error: "Missing API authorization. Please enter your API Key in the settings panel." });
    }

    const systemPrompt = `You are a helpful, expert AI Probability & Statistics tutor inside the "Probability Distribution Gallery" WebApp.
Your goal is to help users intuitively understand probability distributions, their PMF/PDF/CDF curves, and their real-world applications.
The user is currently studying the [${distribution || "Normal"}] distribution with parameters: ${JSON.stringify(parameters || {})}.

Be conversational, concise, and focused on intuitive understanding (e.g. why the shape changes, what the parameters mean physically).
Avoid dry, overly complex math definitions unless asked. Use clear paragraphs, bullet points, or markdown tables.
If the user asks an unrelated question, politely redirect them to statistics and probability.`;

    if (provider === "gemini") {
      // Initialize Gemini Client
      const ai = new GoogleGenAI({
        apiKey,
        ...(baseUrl ? { baseUrl } : {})
      });

      const contents = [];
      if (history && Array.isArray(history)) {
        for (const h of history) {
          contents.push({
            role: h.role === "user" ? "user" : "model",
            parts: [{ text: h.content }],
          });
        }
      }
      contents.push({
        role: "user",
        parts: [{ text: message }],
      });

      // Maintain support for old model names or aliases if needed
      const targetModel = model === "gemini-3.5-flash" ? "gemini-2.5-flash" : model;

      const response = await ai.models.generateContent({
        model: targetModel,
        contents: contents,
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.7,
        },
      });

      return res.json({ text: response.text });
    } else {
      // DeepSeek or OpenAI-compatible
      const targetBaseUrl = baseUrl || "https://api.deepseek.com/v1";
      const actualUrl = targetBaseUrl.endsWith("/") ? `${targetBaseUrl}chat/completions` : `${targetBaseUrl}/chat/completions`;

      // Structure messages for OpenAI format
      const openaiModel = model || "deepseek-reasoner";
      const openaiMessages: any[] = [{ role: "system", content: systemPrompt }];

      if (history && Array.isArray(history)) {
        for (const h of history) {
          openaiMessages.push({
            role: h.role === "user" ? "user" : "assistant",
            content: h.content,
          });
        }
      }
      openaiMessages.push({ role: "user", content: message });

      const fetchResponse = await fetch(actualUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: openaiModel,
          messages: openaiMessages,
          temperature: 0.7,
        })
      });

      if (!fetchResponse.ok) {
        const errText = await fetchResponse.text();
        throw new Error(`API returned error (${fetchResponse.status}): ${errText}`);
      }

      const responseData = await fetchResponse.json();
      const content = responseData?.choices?.[0]?.message?.content || "";
      const reasoningContent = responseData?.choices?.[0]?.message?.reasoning_content;

      // DeepSeek R1 has reasoning content, combine to display nicely
      let responseText = content;
      if (reasoningContent) {
        responseText = `> 💭 **DeepSeek R1 深度思考：**\n> ${reasoningContent.replace(/\n/g, "\n> ")}\n\n${content}`;
      }

      return res.json({ text: responseText });
    }
  } catch (error: any) {
    console.error("AI Chat Error:", error);
    res.status(500).json({ error: error?.message || "An unexpected error occurred in AI chat request." });
  }
});

// AI Endpoint: Suggest a distribution with custom keys support
app.post("/api/suggest-distribution", async (req, res) => {
  try {
    const { scenario, clientSettings } = req.body;
    if (!scenario) {
      return res.status(400).json({ error: "Scenario description is required." });
    }

    const provider = clientSettings?.provider || "gemini";
    const apiKey = clientSettings?.apiKey || process.env.GEMINI_API_KEY;
    const model = clientSettings?.model || "gemini-2.5-flash";
    const baseUrl = clientSettings?.baseUrl || "";

    if (!apiKey) {
      return res.status(400).json({ error: "Missing API authorization. Please enter your API Key in the settings panel." });
    }

    const systemPrompt = `You are an expert statistical consultant. Based on the user's real-world scenario, you suggest the best probability distribution to model it.
You MUST reply with a structured JSON object containing:
- "distribution": Name of the suggested distribution in English, must be exactly one of: "Binomial", "Poisson", "Normal", "Exponential", "Gamma", "Beta"
- "reasoning": Clear, friendly explanation of why this distribution is chosen, what the random variable represents, and what physical assumptions apply.
- "parameterSuggestion": A draft of how parameters should be interpreted or set for their case.

Reply in JSON format only. Write the explanation in Chinese (simplified) since the WebApp interface is in Chinese. Ensure the JSON is well-formed. Do not wrap in markdown tags like \`\`\`json \`\`\``;

    if (provider === "gemini") {
      const ai = new GoogleGenAI({
        apiKey,
        ...(baseUrl ? { baseUrl } : {})
      });

      const targetModel = model === "gemini-3.5-flash" ? "gemini-2.5-flash" : model;

      const response = await ai.models.generateContent({
        model: targetModel,
        contents: `Scenario: "${scenario}"`,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT" as any,
            properties: {
              distribution: { type: "STRING" as any, description: "One of: Binomial, Poisson, Normal, Exponential, Gamma, Beta" },
              reasoning: { type: "STRING" as any, description: "Chinese explanation" },
              parameterSuggestion: { type: "STRING" as any, description: "Chinese parameter advice" },
            },
            required: ["distribution", "reasoning", "parameterSuggestion"],
          },
        },
      });

      const jsonText = response.text || "{}";
      const data = JSON.parse(jsonText.trim());
      return res.json(data);
    } else {
      // DeepSeek / OpenAI compatible
      const targetBaseUrl = baseUrl || "https://api.deepseek.com/v1";
      const actualUrl = targetBaseUrl.endsWith("/") ? `${targetBaseUrl}chat/completions` : `${targetBaseUrl}/chat/completions`;

      // Official DeepSeek recommends deepseek-chat (V3) or standard completion models for structured JSON output
      const openaiModel = model === "deepseek-reasoner" ? "deepseek-chat" : model;
      
      const fetchResponse = await fetch(actualUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: openaiModel,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `请分析以下实际业务场景并按JSON schema输出: "${scenario}"` }
          ],
          response_format: { type: "json_object" },
          temperature: 0.2,
        })
      });

      if (!fetchResponse.ok) {
        const errText = await fetchResponse.text();
        throw new Error(`API returned error (${fetchResponse.status}): ${errText}`);
      }

      const responseData = await fetchResponse.json();
      const content = responseData?.choices?.[0]?.message?.content || "{}";
      
      let parsedContent = content.trim();
      if (parsedContent.startsWith("```json")) {
        parsedContent = parsedContent.replace(/^```json/, "").replace(/```$/, "").trim();
      } else if (parsedContent.startsWith("```")) {
        parsedContent = parsedContent.replace(/^```/, "").replace(/```$/, "").trim();
      }

      const data = JSON.parse(parsedContent);
      return res.json(data);
    }
  } catch (error: any) {
    console.error("AI Suggest Error:", error);
    res.status(500).json({ error: error?.message || "An unexpected error occurred in suggesting distribution." });
  }
});

// Set up Vite or Static File Serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in DEVELOPMENT mode with Vite Middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in PRODUCTION mode...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
