const Groq = require("groq-sdk");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function chatCompletion(messages, { model = "openai/gpt-oss-20b", temperature = 0.7, maxTokens = 1024, apiKey, retries = 2 } = {}) {
  const client = apiKey ? new Groq({ apiKey }) : groq;
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const completion = await client.chat.completions.create({
        messages,
        model,
        temperature,
        max_tokens: maxTokens,
      });
      return completion.choices[0].message.content;
    } catch (err) {
      lastErr = err;
      const is429 = err.status === 429 || (err.message && err.message.includes("rate_limit_exceeded"));
      if (is429 && attempt < retries) {
        // Parse retry-after from error message, default 8s
        const match = err.message && err.message.match(/try again in ([\d.]+)s/i);
        const wait = match ? Math.ceil(parseFloat(match[1]) * 1000) + 500 : 8000;
        await new Promise((r) => setTimeout(r, wait));
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

module.exports = { groq, chatCompletion };
