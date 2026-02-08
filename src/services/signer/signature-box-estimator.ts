import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

export class SignatureBoxExtractor {
  private readonly pdf;

  constructor(buffer: Buffer) {
    this.pdf = pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
  }

  get numPages() {
    return this.pdf.then((pdf) => pdf.numPages);
  }

  async getSignBox(name: string, email: string) {
    const pdf = await this.pdf;
    const numPages = pdf.numPages;
    const page = await pdf.getPage(numPages);
    const { width } = page.getViewport({ scale: 1 });

    const [namePosition, emailPosition] = await Promise.all([
      this.findTextPosition(name, numPages - 1),
      this.findTextPosition(email, numPages - 1),
    ]);

    if (!namePosition) throw new Error(`Could not find position for name: ${name}`);
    if (!emailPosition) throw new Error(`Could not find position for email: ${email}`);

    const lineDiff = emailPosition.y - namePosition.y;

    return {
      x: namePosition.x,
      y: namePosition.y - lineDiff,
      width: width * 0.24,
      height: namePosition.height * 3,
    };
  }

  private async findTextPosition(text: string, pageIndex: number) {
    const pdf = await this.pdf;
    const page = await pdf.getPage(pageIndex + 1);
    const textContent = await page.getTextContent();

    for (const item of textContent.items) {
      if ("str" in item && item.str.trim() === text) {
        return {
          x: item.transform[4],
          y: item.transform[5],
          width: item.width,
          height: item.height,
        };
      }
    }
  }
}
