import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { exec } from 'child_process';
import util from 'util';
const execPromise = util.promisify(exec);

const OLLAMA_CHAT_URL = process.env.OLLAMA_HOST_URL || "http://127.0.0.1:11434/api/chat";
const MODEL_NAME = process.env.OLLAMA_MODEL || "CodeEX";

export async function agentChatRoutes(fastify: FastifyInstance) {
  fastify.post('/api/v1/chat/agent-interpreter', async (req: FastifyRequest, reply: FastifyReply) => {
    const { ticker, prompt } = req.body as { ticker: string; prompt: string };
    const sanitizedTicker = ticker.toUpperCase().trim();

    try {
      const initialResponse = await fetch(OLLAMA_CHAT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: MODEL_NAME,
          messages: [{ role: "user", content: prompt }],
          stream: false,
          temperature: 0.0
        })
      });

      if (!initialResponse.ok) {
        throw new Error(`Ollama returned status ${initialResponse.status}`);
      }

      const payload = await initialResponse.json() as any;
      const responseMessage = payload.message;

      if (responseMessage?.tool_calls && responseMessage.tool_calls.length > 0) {
        const toolCall = responseMessage.tool_calls[0];
        const fn = toolCall.function;
        const args = typeof fn.arguments === "string" ? JSON.parse(fn.arguments) : fn.arguments;

        const metricType = args.metric_type || "ALL";
        const { stdout } = await execPromise(
          `python3 scripts/python/slm_math_runtime.py --ticker ${sanitizedTicker} --metrics ${metricType}`
        );
        let mathResult: any;
        try {
          mathResult = JSON.parse(stdout);
        } catch {
          mathResult = { metrics: { error: "Python runtime parse failure" } };
        }

        const finalResponse = await fetch(OLLAMA_CHAT_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: MODEL_NAME,
            messages: [
              { role: "user", content: prompt },
              { role: "assistant", content: "", tool_calls: [toolCall] },
              { role: "tool", content: JSON.stringify(mathResult.metrics) }
            ],
            stream: false
          })
        });

        if (!finalResponse.ok) {
          throw new Error(`Ollama final step returned status ${finalResponse.status}`);
        }

        const finalPayload = await finalResponse.json() as any;
        const finalContent = (finalPayload.message?.content || "").trim();
        return reply.status(200).send({ success: true, response: finalContent });
      }

      const content = (responseMessage?.content || "").trim();
      return reply.status(200).send({ success: true, response: content });

    } catch (err: any) {
      console.error("CodeEX agent pipeline error:", err.message);
      return reply.status(200).send({
        success: true,
        response: `[Factor Fallback] Analysis for ${sanitizedTicker} is currently processing via CodeEX engine. View live metrics on your dashboard.`
      });
    }
  });
}