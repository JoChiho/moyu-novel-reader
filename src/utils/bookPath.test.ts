import { describe, expect, it } from "vitest";
import { basename, stripExtension } from "./bookPath";

describe("bookPath", () => {
  it("extracts basename from windows path", () => {
    expect(basename("C:\\books\\novel.txt")).toBe("novel.txt");
  });

  it("strips txt extension", () => {
    expect(stripExtension("novel.txt")).toBe("novel");
  });
});