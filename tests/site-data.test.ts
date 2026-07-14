import { describe, expect, test } from "bun:test";

const siteModuleUrl = new URL("../src/data/site.ts", import.meta.url);

async function loadSiteModule(): Promise<typeof import("../src/data/site")> {
  expect(
    await Bun.file(siteModuleUrl).exists(),
    "src/data/site.ts must implement the typed site-data contract",
  ).toBe(true);

  return import(siteModuleUrl.href);
}

describe("site data", () => {
  test("contains every required public field and validates as real data", async () => {
    const { siteData, siteDataSchema } = await loadSiteModule();

    expect(siteDataSchema.parse(siteData)).toEqual(siteData);
    expect(siteData.name).toBe("Артём");
    expect(siteData.role.length).toBeGreaterThan(0);
    expect(siteData.description.length).toBeGreaterThan(0);
    expect(siteData.services.length).toBeGreaterThan(0);
    expect(siteData.technologies.length).toBeGreaterThan(0);
    expect(siteData.cta.primary.length).toBeGreaterThan(0);
    expect(siteData.cta.secondary.length).toBeGreaterThan(0);
    expect(siteData.seo.title.length).toBeGreaterThan(0);
    expect(siteData.seo.description.length).toBeGreaterThan(0);
  });

  test("accepts null or empty contact fields", async () => {
    const { siteData, siteDataSchema } = await loadSiteModule();

    expect(
      siteDataSchema.safeParse({ ...siteData, email: null, telegram: null })
        .success,
    ).toBe(true);
    expect(
      siteDataSchema.safeParse({ ...siteData, email: "", telegram: "" })
        .success,
    ).toBe(true);
  });

  test("omits absent contacts instead of rendering unsafe empty links", async () => {
    const { getContactLinks } = await loadSiteModule();

    expect(getContactLinks({ email: null, telegram: null })).toEqual([]);
    expect(getContactLinks({ email: "", telegram: "   " })).toEqual([]);
  });

  test("normalizes an optional Telegram @ before building its link", async () => {
    const { getContactLinks, siteData, siteDataSchema } = await loadSiteModule();

    for (const telegram of ["example_user", "@example_user"]) {
      const parsed = siteDataSchema.parse({
        ...siteData,
        email: null,
        telegram,
      });

      expect(parsed.telegram).toBe("example_user");
      expect(getContactLinks(parsed)).toEqual([
        {
          kind: "telegram",
          label: "@example_user",
          href: "https://t.me/example_user",
        },
      ]);
    }
  });

  test("rejects malformed Telegram usernames", async () => {
    const { siteData, siteDataSchema } = await loadSiteModule();
    const malformedUsernames = [
      "https://t.me/example_user",
      "example user",
      "@@example_user",
      "example/user",
      "example.user",
      "example-user",
      "пример",
    ];

    for (const telegram of malformedUsernames) {
      expect(
        siteDataSchema.safeParse({ ...siteData, telegram }).success,
        telegram,
      ).toBe(false);
    }
  });
});
