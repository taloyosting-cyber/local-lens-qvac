import {
  loadModel,
  LLAMA_3_2_1B_INST_Q4_0,
  completion,
  unloadModel,
} from "@qvac/sdk";

let modelId = null;

async function main() {
  console.log("========================================");
  console.log(" Local Lens — QVAC Quickstart");
  console.log("========================================");
  console.log("");
  console.log("Loading QVAC model locally...");

  modelId = await loadModel({
    modelSrc: LLAMA_3_2_1B_INST_Q4_0,
    onProgress: (progress) => {
      console.log(`Model loading: ${progress.percentage.toFixed(1)}%`);
    },
  });

  console.log("");
  console.log("QVAC model loaded!");
  console.log("Model ID:", modelId);
  console.log("");
  console.log("Running local completion...");
  console.log("");

  const result = completion({
    modelId,
    history: [
      {
        role: "user",
        content:
          "Explain in one short sentence why running AI locally can be useful.",
      },
    ],
    stream: true,
  });

  let output = "";

  for await (const token of result.tokenStream) {
    output += token;
    process.stdout.write(token);
  }

  console.log("");
  console.log("");
  console.log("QVAC inference completed locally.");

  await unloadModel({ modelId });

  console.log("QVAC model unloaded.");
  console.log("");
  console.log("Quickstart complete.");
}

main().catch(async (error) => {
  console.error("");
  console.error("Quickstart failed:");
  console.error(error);

  if (modelId) {
    try {
      await unloadModel({ modelId });
    } catch {}
  }

  process.exit(1);
});