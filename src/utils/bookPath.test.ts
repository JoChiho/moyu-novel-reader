import { describe, expect, it } from "vitest";
import { basename, stripExtension } from "./bookPath";

describe("bookPath", () => {
  it("extracts basename from windows path", () => {
    expect(basename("C:\\books\\novel.txt")).toBe("novel.txt");
  });

  it("strips txt extension", () => {
    expect(stripExtension("novel.txt")).toBe("novel");
  });

  it("strips word extensions", () => {
    expect(stripExtension("novel.docx")).toBe("novel");
    expect(stripExtension("novel.doc")).toBe("novel");
  });

  it("strips ebook and markup extensions", () => {
    expect(stripExtension("novel.epub")).toBe("novel");
    expect(stripExtension("chapter.md")).toBe("chapter");
    expect(stripExtension("story.html")).toBe("story");
    expect(stripExtension("notes.markdown")).toBe("notes");
    expect(stripExtension("book.fb2")).toBe("book");
    expect(stripExtension("draft.rtf")).toBe("draft");
  });
});