# Local Lens

### Private thinking, locally.

Local Lens is a local-first AI clarity tool that turns a rough thought, plan, problem, idea, or question into a structured set of useful next steps.

Instead of sending the user's thought to a cloud AI service, Local Lens uses Tether's QVAC SDK to load an AI model and perform inference directly on the user's device.

The result is a lightweight AI experience designed around privacy, simplicity, and practical action.

---

## ✨ What Local Lens Does

People often have thoughts that are difficult to organize:

- "I have too many things to finish and don't know where to start."
- "Should I choose this approach or another one?"
- "I want to build an app but I don't know what to do first."
- "Something is blocking my project."
- "I have an idea but it is still messy."
- "I don't understand what information I am missing."

Local Lens takes that rough input and creates a simple clarity map.

### The output contains:

**Lens Detected**

The AI identifies the type of thinking problem:

- `DECISION`
- `BLOCKER`
- `PLAN`
- `IDEA`
- `QUESTION`

**What Matters**

The model identifies the central points that deserve attention.

**Next Moves**

The model produces exactly three practical actions that can move the situation forward.

**Open Questions**

The model identifies useful questions or missing information that may need to be resolved.

---

## 🧠 Why Local AI?

Many AI applications send user input to a remote server for processing.

Local Lens takes a different approach.

The QVAC model runs directly on the user's device.

```text
User
  │
  │ enters a thought
  ▼
Local Lens UI
  │
  ▼
Local Node.js server
  │
  ▼
QVAC SDK
  │
  ▼
On-device AI model
  │
  ▼
Structured clarity map