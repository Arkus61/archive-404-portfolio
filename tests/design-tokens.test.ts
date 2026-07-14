import { describe, expect, test } from "bun:test";

const stylesheetUrl = new URL("../src/styles/global.css", import.meta.url);

function cssHexVariable(stylesheet: string, variable: string): string {
  const escapedVariable = variable.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const value = stylesheet.match(
    new RegExp(`${escapedVariable}\\s*:\\s*(#[0-9a-f]{6})\\s*;`, "i"),
  )?.[1];

  if (!value) {
    throw new Error(`Missing six-digit hex value for ${variable}`);
  }

  return value;
}

function relativeLuminance(hexColor: string): number {
  const channels = [1, 3, 5].map((offset) =>
    Number.parseInt(hexColor.slice(offset, offset + 2), 16) / 255,
  );
  const [red, green, blue] = channels.map((channel) =>
    channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4,
  );

  return 0.2126 * red! + 0.7152 * green! + 0.0722 * blue!;
}

function contrastRatio(firstColor: string, secondColor: string): number {
  const luminances = [
    relativeLuminance(firstColor),
    relativeLuminance(secondColor),
  ].sort((left, right) => right - left);

  return (luminances[0]! + 0.05) / (luminances[1]! + 0.05);
}

describe("shared accent color contrast", async () => {
  const stylesheet = await Bun.file(stylesheetUrl).text();
  const paper = cssHexVariable(stylesheet, "--paper");

  for (const accentVariable of ["--teal", "--orange"] as const) {
    test(`${accentVariable} meets WCAG AA against --paper`, () => {
      const accent = cssHexVariable(stylesheet, accentVariable);
      const ratio = contrastRatio(accent, paper);

      expect(
        ratio,
        `${accentVariable} ${accent} against --paper ${paper} is ${ratio.toFixed(2)}:1`,
      ).toBeGreaterThanOrEqual(4.5);
    });
  }
});
