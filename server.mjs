import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  loadModel,
  LLAMA_3_2_1B_INST_Q4_0,
  completion,
  unloadModel,
} from "@qvac/sdk";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 4173;
const HOST = "127.0.0.1";

let modelId = null;

async function loadLocalModel() {
  console.log("Loading QVAC model...");

  modelId = await loadModel({
    modelSrc: LLAMA_3_2_1B_INST_Q4_0,
    onProgress: (progress) => {
      console.log(`Model loading: ${progress.percentage.toFixed(1)}%`);
    },
  });

  console.log("QVAC model loaded!");
  console.log("Model ID:", modelId);
}

function cleanText(text) {
  return text
    .replace(/\r/g, "")
    .replace(/\*\*/g, "")
    .replace(/```/g, "")
    .replace(/^#+\s*/gm, "")
    .trim();
}

function normalizeOutput(raw) {
  const text = cleanText(raw);

  const lensMatch = text.match(
    /(?:LENS|TYPE)\s*:?\s*(DECISION|BLOCKER|PLAN|IDEA|QUESTION)/i
  );

  const lens = lensMatch
    ? lensMatch[1].toUpperCase()
    : "PLAN";

  const mattersMatch = text.match(
    /(?:WHAT MATTERS|MATTERS)\s*:?\s*([\s\S]*?)(?=\n\s*(?:NEXT MOVES|MOVES|OPEN QUESTIONS|QUESTIONS)\s*:?\s*|$)/i
  );

  const movesMatch = text.match(
    /(?:NEXT MOVES|MOVES)\s*:?\s*([\s\S]*?)(?=\n\s*(?:OPEN QUESTIONS|QUESTIONS)\s*:?\s*|$)/i
  );

  const questionsMatch = text.match(
    /(?:OPEN QUESTIONS|QUESTIONS)\s*:?\s*([\s\S]*?)$/i
  );

  const matters =
    mattersMatch?.[1]?.trim() ||
    "Identify the central issue and what deserves attention first.";

  const moves =
    movesMatch?.[1]?.trim() ||
    "Choose the most important next action.\nWork on it before switching tasks.\nReview the result and decide what comes next.";

  const questions =
    questionsMatch?.[1]?.trim() ||
    "What matters most right now?\nWhat can wait?\nWhat information is still missing?";

  return `WHAT MATTERS

LENS DETECTED: ${lens}

${matters}

NEXT MOVES

${moves}

OPEN QUESTIONS

${questions}`;
}

async function analyze(text) {
  const prompt = `You are Local Lens, a practical thinking assistant.

Your job is to identify the kind of thinking problem in the user's message and turn it into a useful clarity map.

First classify the thought into EXACTLY ONE of these lenses:

DECISION
BLOCKER
PLAN
IDEA
QUESTION

Choose the lens based on the user's actual message.

Then respond using EXACTLY this structure:

LENS: [ONE OF THE FIVE LENSES]

WHAT MATTERS
[1 to 3 short points]

NEXT MOVES
[exactly 3 practical actions]

OPEN QUESTIONS
[1 to 3 useful questions]

Rules:
- Be concrete.
- Be concise.
- Do not use Markdown.
- Do not use bold text.
- Do not add an introduction.
- Do not add a conclusion.
- Do not repeat the user's entire message.
- The LENS must be exactly one of: DECISION, BLOCKER, PLAN, IDEA, QUESTION.

USER'S THOUGHT:

${text}`;

  const result = completion({
    modelId,
    history: [
      {
        role: "user",
        content: prompt,
      },
    ],
    stream: true,
  });

  let output = "";

  for await (const token of result.tokenStream) {
    output += token;
  }

  return normalizeOutput(output);
}

function sendJson(response, statusCode, data) {
  const body = JSON.stringify(data);

  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Cache-Control": "no-store",
  });

  response.end(body);
}

function serveIndex(response) {
  const filePath = path.join(__dirname, "public", "index.html");

  fs.readFile(filePath, (error, data) => {
    if (error) {
      response.writeHead(500, {
        "Content-Type": "text/plain; charset=utf-8",
      });

      response.end("Could not load Local Lens.");
      return;
    }

    response.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8",
    });

    response.end(data);
  });
}

const server = http.createServer(async (request, response) => {
  if (request.method === "GET" && request.url === "/") {
    serveIndex(response);
    return;
  }

  if (request.method === "GET" && request.url === "/api/status") {
    sendJson(response, 200, {
      ready: Boolean(modelId),
      local: true,
    });
    return;
  }

  if (request.method === "POST" && request.url === "/api/analyze") {
    let body = "";

    request.on("data", (chunk) => {
      body += chunk;

      if (body.length > 100_000) {
        request.destroy();
      }
    });

    request.on("end", async () => {
      try {
        const parsed = JSON.parse(body);

        const text =
          typeof parsed.text === "string"
            ? parsed.text.trim()
            : "";

        if (!text) {
          sendJson(response, 400, {
            error: "Please enter something for Local Lens to analyze.",
          });
          return;
        }

        if (!modelId) {
          sendJson(response, 503, {
            error: "The local QVAC model is still loading.",
          });
          return;
        }

        console.log("\nAnalyzing locally...");

        const output = await analyze(text);

        console.log("Local inference complete.");

        sendJson(response, 200, {
          output,
          local: true,
        });

      } catch (error) {
        console.error("Analysis error:", error);

        sendJson(response, 500, {
          error: error?.message || "Local inference failed.",
        });
      }
    });

    return;
  }

  response.writeHead(404, {
    "Content-Type": "text/plain; charset=utf-8",
  });

  response.end("Not found.");
});

async function main() {
  await loadLocalModel();

  server.listen(PORT, HOST, () => {
    console.log("");
    console.log("========================================");
    console.log(" Local Lens is running");
    console.log(` http://${HOST}:${PORT}`);
    console.log(" AI inference: LOCAL via QVAC");
    console.log("========================================");
    console.log("");
  });
}

async function shutdown() {
  console.log("\nShutting down...");

  if (modelId) {
    await unloadModel({ modelId });
    console.log("QVAC model unloaded.");
  }

  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

main().catch((error) => {
  console.error("Startup failed:");
  console.error(error);
  process.exit(1);
});