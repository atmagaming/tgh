import * as pdfjsLib from "pdfjs-dist";
import { logger } from "logger";

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface TextPosition {
    text: string;
    x: number;
    y: number;
    width: number;
    height: number;
    page: number;
}

export interface SignatureBox {
    page: number;
    x: number;
    y: number;
    width: number;
    height: number;
}

const DIGISIGNER_WIDTH = 612;
const DIGISIGNER_HEIGHT = 792;

export class SignatureBoxExtractor {
    private readonly initialization = Promise.withResolvers<void>();
    private textPositions: TextPosition[] = [];
    private pageCount = 0;

    constructor(private readonly buffer: Buffer) {
        void this.init();
    }

    private async init() {
        const data = new Uint8Array(this.buffer);
        const loadingTask = pdfjsLib.getDocument({ data });
        const pdf = await loadingTask.promise;

        this.pageCount = pdf.numPages;
        this.textPositions = [];

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const viewport = page.getViewport({ scale: 1.0 });
            const textContent = await page.getTextContent();

            for (const item of textContent.items) {
                if ("str" in item && item.str.trim()) {
                    const transform = item.transform;
                    const x = transform[4];
                    const y = viewport.height - transform[5];
                    const width = item.width;
                    const height = item.height;

                    this.textPositions.push({
                        text: item.str,
                        x: x / viewport.width,
                        y: y / viewport.height,
                        width: width / viewport.width,
                        height: height / viewport.height,
                        page: pageNum,
                    });
                }
            }
        }

        logger.info({ pageCount: this.pageCount, textItems: this.textPositions.length }, "PDF parsed for signatures");
        this.initialization.resolve();
    }

    async getBox(name: string, email: string): Promise<SignatureBox> {
        await this.initialization.promise;

        const lastPage = this.pageCount;
        const anchors = ["Signature:", "Sign here", "Date:", email, name];

        for (const anchor of anchors) {
            const position = this.findTextPosition(anchor, lastPage);
            if (position) {
                const normalizedX = position.x;
                const normalizedY = position.y + 0.05;
                const normalizedWidth = 0.3;
                const normalizedHeight = 0.08;

                return {
                    page: position.page,
                    x: Math.round(normalizedX * DIGISIGNER_WIDTH),
                    y: Math.round(normalizedY * DIGISIGNER_HEIGHT),
                    width: Math.round(normalizedWidth * DIGISIGNER_WIDTH),
                    height: Math.round(normalizedHeight * DIGISIGNER_HEIGHT),
                };
            }
        }

        logger.warn({ name, email }, "No anchor found, using fallback position");
        return this.getFallbackBox();
    }

    private findTextPosition(searchText: string, page?: number): TextPosition | undefined {
        const searchLower = searchText.toLowerCase();
        return this.textPositions.find(
            (pos) => pos.text.toLowerCase().includes(searchLower) && (page === undefined || pos.page === page),
        );
    }

    private getFallbackBox(): SignatureBox {
        const yOffset = 0.7;
        return {
            page: this.pageCount,
            x: Math.round(0.1 * DIGISIGNER_WIDTH),
            y: Math.round(yOffset * DIGISIGNER_HEIGHT),
            width: Math.round(0.3 * DIGISIGNER_WIDTH),
            height: Math.round(0.08 * DIGISIGNER_HEIGHT),
        };
    }
}
