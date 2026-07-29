# Mission Control — 5-Minute Founder Demo

Mission Control is the operating console for a production AI agent. This demo
follows one coherent workflow: an enterprise renewal email for **Northstar
Logistics**. The agent verifies account and contract facts, retrieves approved
memory, selects a safe strategy, obtains human approval, and sends the email.

## Demo preflight

Use the seeded workflow rather than manually created data. It is the only demo
scenario that drives the Timeline, Agent Brain, Memory Explorer, Decision
Explorer, Replay, and Simulation surfaces from the same execution evidence.

```bash
# Requires a configured local stack. The seed command prints exact deep links.
pnpm run seed -- doctor
pnpm run seed -- sales-email-agent --v4
pnpm run dev:web
```

Sign in to the seeded demo project, open the run URL printed by the seed
command, and keep the Overview open in a second browser tab. Before presenting,
set the dashboard time range to the last 24 hours and use a desktop viewport.

## The click path and talk track

### 0:00–0:35 — Open the operating picture

1. Open **Dashboard** in the sidebar.
2. Point out the Langpluse title and the clearly labeled seeded workflow
   data.
3. Read the dashboard as one story: active agents, live executions, quality,
   memory accuracy, tool success, cost, health, and the live activity feed all
   refer to Northstar Logistics renewal work.
4. Say: “This is not a generic analytics dashboard. It is the current
   operating picture for the agent that is about to contact a strategic
   enterprise customer.”

### 0:35–1:25 — Show the live execution timeline

1. Click **Runs** in the sidebar.
2. Open the `enterprise-sales-email-agent` run using the deep link printed by
   `pnpm run seed -- sales-email-agent --v4`.
3. Stay on **Live timeline**. Press **Play** in the replay bar, then **Pause**
   on the NetSuite retry sequence.
4. Search for `netsuite`, expand the failed NetSuite event, then expand the
   retry and successful verification events.
5. Say: “An engineer gets the timing, confidence, tool, failure state, and
   evidence for every step. The 429 is not hidden—the retry policy and its
   recovery are first-class execution events.”

### 1:25–2:05 — Explain the agent’s reasoning

1. Click **Agent Brain**.
2. Use the search field for `discount-led`, then use **Locate** and select the
   matching decision node.
3. Open the node inspector and point out the selected path, rejected
   alternatives, confidence, dependencies, memory, token usage, and latency.
4. Say: “This is the difference between a trace viewer and an agent operating
   console: we can explain why a path was chosen, not only that a model call
   happened.”

### 2:05–2:45 — Prove memory was used safely

1. Click **Memory**.
2. Keep **Inventory** selected and choose the rejected-memory filter.
3. Select the expired commercial exception, then switch to **Relationships**.
4. Say: “Langpluse exposes both what the agent used and what it rejected.
   Here the agent deliberately ignores an expired discount, so a plausible
   memory cannot turn into an unauthorized commercial promise.”

### 2:45–3:25 — Review the decision and approval boundary

1. Click **Decisions**.
2. Select **Value-led renewal**, then click the rejected **Discount-led
   outreach** branch.
3. Select the later manager-approved delivery decision.
4. Say: “The console makes alternatives, risk, evidence dependencies, and
   downstream impact reviewable. It also shows the human approval boundary
   before any customer-facing delivery.”

### 3:25–4:05 — Replay the whole execution as one system

1. Use the replay bar’s **Previous**, **Next**, and speed selector.
2. Move between **Live timeline**, **Agent Brain**, **Memory**, and
   **Decisions** while stepping through the run.
3. Say: “Replay is synchronized. The selected frame follows the same event
   across the timeline, graph, retrieval evidence, and decision tree—so an
   incident review does not require manually correlating five separate tools.”

### 4:05–4:45 — Test a failure before production sees it

1. Click **Simulation**.
2. Select **ERP timeout** and click **Generate reasoning path**.
3. When the result is ready, compare the original path with the simulated
   outcome and its recorded differences.
4. Say: “Simulation is isolated: it uses fixture-backed outcomes and never
   invokes production credentials, tools, or network destinations. Engineers
   can evaluate a failure mode before it becomes a customer incident.”

### 4:45–5:00 — Close with the product thesis

Say: “Langpluse gives engineering teams one place to operate production
AI agents: see execution health, reconstruct what happened, understand why it
happened, and safely test what would happen next.”

## Presenter guardrails

- Do not present dashboard counters as live production telemetry. They are
  explicitly marked as deterministic seeded workflow data for this milestone.
- Do not promise Tool Explorer, Execution Coach, or Analytics during this
  walkthrough. They remain planned modules and are not present in the current
  application.
- The Simulation model-policy field names a comparison policy; it does not
  call an external model provider unless a separately approved execution policy
  is configured.
