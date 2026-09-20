import readline from "node:readline";

import {
  loadModel,
  LLAMA_3_2_1B_INST_Q4_0,
  completion,
  unloadModel,
} from "@qvac/sdk";

let modelId = null;

async function askAI(question) {
  const result = completion({
    modelId,
    history: [
      {
        role: "user",
        content: question,
      },
    ],
    stream: true,
  });

  for await (const token of result.tokenStream) {
    process.stdout.write(token);
  }

  console.log("\n");
}

async function main() {
  console.log("========================================");
  console.log(" Local Lens — QVAC Interactive CLI");
  console.log("========================================");
  console.log("");
  console.log("Loading QVAC model locally...");

  modelId = await loadModel({
    modelSrc: LLAMA_3_2_1B_INST_Q4_0,
    onProgress: (progress) => {
      process.stdout.write(
        `\rModel loading: ${progress.percentage.toFixed(1)}%`
      );
    },
  });

  console.log("\n");
  console.log("QVAC model loaded!");
  console.log("AI inference is running locally.");
  console.log("Type your question below.");
  console.log("Type 'exit' to quit.");
  console.log("");

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "You: ",
  });

  rl.prompt();

  rl.on("line", async (input) => {
    const question = input.trim();

    if (question.toLowerCase() === "exit") {
      rl.close();
      return;
    }

    if (!question) {
      rl.prompt();
      return;
    }

    try {
      process.stdout.write("AI: ");
      await askAI(question);
    } catch (error) {
      console.error("\nError:", error.message);
    }

    rl.prompt();
  });

  rl.on("close", async () => {
    console.log("");
    console.log("Unloading QVAC model...");

    if (modelId) {
      try {
        await unloadModel({ modelId });
      } catch (error) {
        console.error("Could not unload model:", error.message);
      }
    }

    console.log("QVAC model unloaded.");
    console.log("Goodbye!");
  });
}

main().catch((error) => {
  console.error("");
  console.error("Quickstart failed:");
  console.error(error);

  process.exit(1);
});