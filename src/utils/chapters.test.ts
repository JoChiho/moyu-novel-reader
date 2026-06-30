import { describe, expect, it } from "vitest";
import { detectChapters, findChapterAtOffset } from "./chapters";

describe("chapters", () => {
  it("detects Chinese chapter headings", () => {
    const text = "前言\n\n第一章 风起\n\n正文一\n\n第二章 云涌\n\n正文二";
    const chapters = detectChapters(text);
    expect(chapters.length).toBe(2);
    expect(chapters[0].title).toContain("第一章");
    expect(chapters[1].title).toContain("第二章");
  });

  it("finds chapter at offset", () => {
    const text = "第一章 开始\n\naaa\n\n第二章 中间\n\nbbb";
    const chapters = detectChapters(text);
    const secondOffset = chapters[1].charOffset + 2;
    expect(findChapterAtOffset(chapters, secondOffset)?.title).toContain(
      "第二章",
    );
  });
});