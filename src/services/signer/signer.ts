import { DigiSigner } from "@elumixor/digisigner";
import { env } from "env";
import { SignatureBoxExtractor } from "./signature-box-estimator";

const digiSigner = new DigiSigner(env.DIGISIGNER_API_KEY);

export async function sendForSign(
  filePath: string,
  signers: { name: string; email: string }[],
  { subject, message }: { subject?: string; message?: string } = {},
) {
  const fileBuffer = Buffer.from(await Bun.file(filePath).arrayBuffer());
  const extractor = new SignatureBoxExtractor(fileBuffer);

  const numPages = await extractor.numPages;

  const signersWithBoxes = await Promise.all(
    signers.map(async (signer) => {
      const { x, y, width, height } = await extractor.getSignBox(signer.name, signer.email);
      const x2 = x + width;
      const y2 = y + height;

      return {
        email: signer.email,
        fields: [
          {
            page: numPages - 1,
            rectangle: [Math.round(x), Math.round(y), Math.round(x2), Math.round(y2)] as [
              number,
              number,
              number,
              number,
            ],
            type: "SIGNATURE" as const,
          },
        ],
      };
    }),
  );

  const documentId = await digiSigner.upload(fileBuffer, filePath.split("/").pop()!);

  const { signature_request_id } = await digiSigner.sendSignatureRequest(documentId, {
    signers: signersWithBoxes,
    subject: subject ?? `Please sign: ${filePath.split("/").pop()}`,
    message: message ?? "Please review and sign the document.",
  });

  const status = await digiSigner.getStatus(signature_request_id);

  const signersLinks = status.documents[0]?.signers.map((s) => ({
    email: s.email,
    signUrl: s.sign_document_url,
  }));

  if (!signersLinks) throw new Error("No signers found in the signature request status");

  return signersLinks;
}

export function cancelSign(documentId: string) {
  return digiSigner.delete(documentId);
}
