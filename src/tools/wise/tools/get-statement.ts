import { wise } from "services/wise";
import { defineTool } from "streaming-agent";
import { saveTempFile } from "utils/files";
import { z } from "zod";

export const getStatementTool = defineTool(
  "GetWiseStatement",
  "Get a Wise account statement for a specific currency and date range. JSON format returns transaction list, PDF format returns a downloadable file",
  z.object({
    currency: z.string().describe("Currency code (e.g. EUR, USD, GBP)"),
    start_date: z.string().describe("Start date in ISO format (e.g. 2024-01-01T00:00:00.000Z)"),
    end_date: z.string().describe("End date in ISO format (e.g. 2024-12-31T23:59:59.999Z)"),
    format: z
      .enum(["json", "pdf"])
      .describe("Output format: json for transaction list, pdf for downloadable statement"),
  }),
  async ({ currency, start_date, end_date, format }, job) => {
    const profiles = await wise.getProfiles();
    const profile = profiles[0];
    if (!profile) return "No Wise profiles found";

    const balances = await wise.getBalances(profile.id);
    const balance = balances.find((b) => b.currency === currency.toUpperCase());
    if (!balance) return `No ${currency} balance found`;

    const params = { startDate: start_date, endDate: end_date };

    if (format === "pdf") {
      const pdf = await wise.getStatementPdf(profile.id, balance.id, params);
      const filename = `wise-statement-${currency}-${start_date.slice(0, 10)}-to-${end_date.slice(0, 10)}`;
      const tempPath = await saveTempFile(pdf, "pdf", filename);
      job.addFile(pdf, `${filename}.pdf`, "file");
      return `PDF statement saved to ${tempPath} and sent to user`;
    }

    const statement = await wise.getStatement(profile.id, balance.id, params);
    if (statement.transactions.length === 0) return "No transactions found in this period";

    return statement.transactions
      .map(
        (t) =>
          `${t.date} | ${t.type} | ${t.amount.value} ${t.amount.currency} | fees: ${t.totalFees.value} ${t.totalFees.currency} | balance: ${t.runningBalance.value} ${t.runningBalance.currency} | ${t.details.description}`,
      )
      .join("\n");
  },
);
