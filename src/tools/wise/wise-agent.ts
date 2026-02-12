import { models } from "models";
import { StreamingAgent } from "streaming-agent";
import { getBalancesTool } from "./tools/get-balances";
import { getRatesTool } from "./tools/get-rates";
import { getTransfersTool } from "./tools/get-transfers";

const WISE_AGENT_PROMPT = `You manage money operations in Wise banking system.

Notes:
- Use currency codes (e.g., USD, EUR) when mentioning balances and rates
- Use parallel tool calls when handling multiple lookups
- Output results in concise format including all relevant details (e.g., amounts, currencies, dates) without unnecessary explanations
`;

export const wiseAgent = new StreamingAgent({
  name: "WiseAgent",
  model: models.nano,
  instructions: WISE_AGENT_PROMPT,
  tools: [getBalancesTool, getRatesTool, getTransfersTool],
});
