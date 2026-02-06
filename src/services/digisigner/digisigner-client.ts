import { env } from "env";
import { logger } from "logger";

const DIGISIGNER_API_URL = "https://api.digisigner.com/v1";

interface DigiSignerSigner {
  email: string;
  name?: string;
  role?: string;
}

interface DigiSignerField {
  type: "signature" | "text" | "date" | "checkbox";
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  signer_id: number;
  label?: string;
  required?: boolean;
}

interface DigiSignerSignatureRequest {
  documentId: string;
  signers: DigiSignerSigner[];
  fields: DigiSignerField[];
  subject?: string;
  message?: string;
}

interface DigiSignerDocument {
  document_id: string;
  name: string;
}

interface DigiSignerSignature {
  signature_request_id: string;
  signing_urls: Record<string, string>;
  status: string;
}

export class DigiSignerClient {
  private readonly apiKey = env.DIGISIGNER_API_KEY;

  private async request<T>(method: string, endpoint: string, body?: unknown): Promise<T> {
    const response = await fetch(`${DIGISIGNER_API_URL}${endpoint}`, {
      method,
      headers: {
        Authorization: `Token ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`DigiSigner API error: ${response.status} ${error}`);
    }

    return response.json() as T;
  }

  private uploadFile(buffer: Buffer, filename: string): FormData {
    const formData = new FormData();
    const blob = new Blob([buffer], { type: "application/pdf" });
    formData.append("file", blob, filename);
    return formData;
  }

  async uploadDocument(buffer: Buffer, filename: string): Promise<DigiSignerDocument> {
    const formData = this.uploadFile(buffer, filename);

    const response = await fetch(`${DIGISIGNER_API_URL}/documents`, {
      method: "POST",
      headers: {
        Authorization: `Token ${this.apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`DigiSigner upload error: ${response.status} ${error}`);
    }

    const result = (await response.json()) as DigiSignerDocument;
    logger.info({ documentId: result.document_id, filename }, "Document uploaded to DigiSigner");
    return result;
  }

  async sendSignatureRequest(request: DigiSignerSignatureRequest): Promise<DigiSignerSignature> {
    const signers = request.signers.map((signer, index) => ({
      email: signer.email,
      name: signer.name,
      role: signer.role ?? `Signer ${index + 1}`,
      order: index + 1,
    }));

    const fields = request.fields.map((field) => ({
      type: field.type,
      page: field.page,
      rectangle: {
        x: field.x,
        y: field.y,
        width: field.width,
        height: field.height,
      },
      signer: field.signer_id,
      label: field.label,
      required: field.required ?? true,
    }));

    const payload = {
      document_id: request.documentId,
      signers,
      fields,
      subject: request.subject,
      message: request.message,
      send_emails: true,
    };

    const result = await this.request<DigiSignerSignature>("POST", "/signature_requests", payload);
    logger.info({ signatureRequestId: result.signature_request_id }, "Signature request sent");
    return result;
  }

  async getSignatureStatus(signatureRequestId: string): Promise<{ status: string; signed_document_url?: string }> {
    const result = await this.request<{ status: string; signed_document_url?: string }>(
      "GET",
      `/signature_requests/${signatureRequestId}`,
    );
    logger.info({ signatureRequestId, status: result.status }, "Signature status retrieved");
    return result;
  }
}

export const digiSignerClient = new DigiSignerClient();
