import { env } from "env";
import { type docs_v1, google } from "googleapis";
import { logger } from "logger";
import { getDriveClient } from "./google-drive";

let docsClient: docs_v1.Docs | null = null;

export function getDocsClient(): docs_v1.Docs {
    if (docsClient) return docsClient;

    const credentials = JSON.parse(env.GOOGLE_DRIVE_CREDENTIALS);
    const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ["https://www.googleapis.com/auth/documents", "https://www.googleapis.com/auth/drive"],
    });

    docsClient = google.docs({ version: "v1", auth });
    logger.info("Google Docs client initialized");
    return docsClient;
}

/**
 * Copy a Google Doc to a new location with a new name
 */
export async function copyDocument(templateId: string, title: string, parentFolderId?: string) {
    const drive = getDriveClient();

    const response = await drive.files.copy({
        fileId: templateId,
        requestBody: {
            name: title,
            parents: parentFolderId ? [parentFolderId] : undefined,
        },
    });

    logger.info({ documentId: response.data.id, title }, "Document copied");
    return { id: response.data.id!, name: response.data.name!, webViewLink: response.data.webViewLink };
}

/**
 * Replace text placeholders in a Google Doc using batch updates
 */
export async function replaceTextInDocument(documentId: string, replacements: Record<string, string>) {
    const docs = getDocsClient();

    const requests: docs_v1.Schema$Request[] = Object.entries(replacements).map(([placeholder, replacement]) => ({
        replaceAllText: {
            containsText: {
                text: placeholder,
                matchCase: true,
            },
            replaceText: replacement,
        },
    }));

    await docs.documents.batchUpdate({
        documentId,
        requestBody: { requests },
    });

    logger.info({ documentId, replacementCount: requests.length }, "Text replaced in document");
}

/**
 * Export a Google Doc as PDF
 */
export async function exportDocumentAsPdf(documentId: string): Promise<Buffer> {
    const drive = getDriveClient();

    const response = await drive.files.export(
        {
            fileId: documentId,
            mimeType: "application/pdf",
        },
        { responseType: "arraybuffer" },
    );

    const data = response.data as unknown as ArrayBuffer;
    logger.info({ documentId, size: data.byteLength }, "Document exported as PDF");
    return Buffer.from(data);
}
