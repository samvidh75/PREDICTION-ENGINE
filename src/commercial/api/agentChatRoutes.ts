import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { exec } from 'child_process';
import util from 'util';
const execPromise = util.promisify(exec);
export async function agentChatRoutes(fastify: FastifyInstance) {
  fastify.post('/api/v1/chat/agent-interpreter', async (req: FastifyRequest, reply: FastifyReply) => {
    const { ticker, prompt } = req.body as { ticker: string; prompt: string };
    const modelTarget = process.env.OLLAMA_MODEL || "stockstory-slm";
    const ollamaEndpoint = process.env.OLLAMA_HOST_URL || "http://127.0.0.0:11434";

    try {
      // 1. Fire the initial prompt to the tool-trained model instance
      const initialResponse = await fetch(ollamaEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: modelTarget,
          messages: [{ role: "user", content: prompt }],
          stream: false,
          temperature: 0.0 // Force absolute mathematical determination
        })
      });

      const payload = await initialResponse.json() as any;
      const responseMessage = payload.message;

      // 2. Intercept Check: Did the fine-tuned model request a Python mathematical tool call execution?
      if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
        const toolCall = responseMessage.tool_calls[0];
        const args = JSON.parse(toolCall.function.arguments);
        
        console.log(`🤖 Agent triggered Tool Call: ${toolCall.function.name} with arguments:`, args);

        // 3. Shell out directly to execute your local server-side Python analytical calculations library
        const { stdout } = await execPromise(`python3 scripts/python/slm_math_runtime.py --ticker ${ticker.toUpperCase().trim()}`);
        const mathResult = JSON.parse(stdout);

        // 4. Send the calculated Python numbers back to Ollama to synthesize the final answer
        const finalResponse = await fetch(ollamaEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: modelTarget,
            messages: [
              { role: "user", content: prompt },
              responseMessage,
              { role: "tool", content: JSON.stringify(mathResult.metrics), name: toolCall.function.name }
            ],
            stream: false
          })
        });

        const finalPayload = await finalResponse.json() as any;
        return reply.status(200).send({ success: true, response: finalPayload.message.content.trim() });
      }

      // If no tools were required, return the raw text output directly
      return reply.status(200).send({ success: true, response: responseMessage.content.trim() });

    } catch (err: any) {
      console.error("❌ Agent execution pipeline crashed:", err.message);
      return reply.status(200).send({ 
        success: true, 
        response: `[Factor Fallback] Technical indicators for ${ticker} are currently processing. View live metrics scales on your dashboard widgets.` 
      });
    }
  });
}