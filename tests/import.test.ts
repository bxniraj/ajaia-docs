import { describe, expect, it } from "vitest";
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";
import { fileToDocument, textToHtml } from "@/lib/import";
import { AppError } from "@/lib/errors";

const buf = (s: string) => Buffer.from(s, "utf8");

describe("file import", () => {
  it("turns plain text into escaped paragraphs", () => {
    expect(textToHtml("Hello <world>\nline two\n\nSecond para")).toBe(
      "<p>Hello &lt;world&gt;<br>line two</p><p>Second para</p>",
    );
  });

  it("converts markdown with headings, emphasis and lists", async () => {
    const { title, html } = await fileToDocument("meeting-notes.md", buf("# Notes\n\n**bold** and _it_\n\n- a\n- b\n"));
    expect(title).toBe("meeting-notes");
    expect(html).toContain("<h1>Notes</h1>");
    expect(html).toContain("<strong>bold</strong>");
    expect(html).toContain("<em>it</em>");
    expect(html).toMatch(/<ul>\s*<li>a<\/li>/);
  });

  it("converts .docx keeping headings, bold and underline", async () => {
    const docx = new Document({
      sections: [
        {
          children: [
            new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("Spec")] }),
            new Paragraph({
              children: [new TextRun({ text: "Bold", bold: true }), new TextRun({ text: " under", underline: {} })],
            }),
          ],
        },
      ],
    });
    const { html } = await fileToDocument("spec.docx", await Packer.toBuffer(docx));
    expect(html).toContain("<h1>Spec</h1>");
    expect(html).toContain("<strong>Bold</strong>");
    expect(html).toContain("<u> under</u>");
  });

  it("rejects unsupported, empty and corrupt files with clear errors", async () => {
    await expect(fileToDocument("image.png", buf("x"))).rejects.toThrow(/Unsupported file type/);
    await expect(fileToDocument("empty.txt", buf(""))).rejects.toThrow(/empty/);
    await expect(fileToDocument("broken.docx", buf("not a zip"))).rejects.toBeInstanceOf(AppError);
  });

  it("strips script tags embedded in markdown", async () => {
    const { html } = await fileToDocument("x.md", buf("hi <script>alert(1)</script>"));
    expect(html).not.toContain("script");
  });
});
