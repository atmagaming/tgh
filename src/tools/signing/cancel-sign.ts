import { cancelSign } from "services/signer";
import { defineTool } from "streaming-agent";
import { z } from "zod";

export const cancelSignTool = defineTool(
  "CancelSign",
  "Cancel a signature request / delete the document from DigiSigner",
  z.object({
    documentId: z.string().describe("The DigiSigner document ID"),
  }),
  ({ documentId }) => cancelSign(documentId),
);
