import { defineTool } from "streaming-agent";
import { z } from "zod";

export const composeDraftTool = defineTool(
  "ComposeDraft",
  "Create a new email draft (does NOT send). Returns draft JSON for user review before sending.",
  z.object({
    to: z.array(z.object({ name: z.string().nullable(), address: z.string() })).describe("Recipients"),
    cc: z
      .array(z.object({ name: z.string().nullable(), address: z.string() }))
      .nullable()
      .describe("CC recipients"),
    subject: z.string().describe("Email subject"),
    body: z.string().describe("Email body text"),
  }),
  ({ to, cc, subject, body }) => {
    const draft = { to, cc: cc ?? [], subject, body, inReplyTo: null };
    return { draft, preview: formatDraftPreview(draft) };
  },
);

function formatDraftPreview(draft: {
  to: { name: string | null; address: string }[];
  cc: { name: string | null; address: string }[];
  subject: string;
  body: string;
}) {
  const to = draft.to.map((a) => (a.name ? `${a.name} <${a.address}>` : a.address)).join(", ");
  const cc =
    draft.cc.length > 0 ? draft.cc.map((a) => (a.name ? `${a.name} <${a.address}>` : a.address)).join(", ") : null;
  return [`**To:** ${to}`, ...(cc ? [`**Cc:** ${cc}`] : []), `**Subject:** ${draft.subject}`, "", draft.body].join(
    "\n",
  );
}
