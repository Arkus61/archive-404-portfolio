import { z } from "zod";

import rawSiteData from "./site.json";

const nonEmptyText = z.string().trim().min(1);
const nullableEmail = z.union([z.literal(""), z.email()]).nullable();
const telegramUsername = z
  .string()
  .regex(/^@?[A-Za-z0-9_]+$/)
  .transform((username) => username.replace(/^@/, ""));
const nullableTelegram = z.union([z.literal(""), telegramUsername]).nullable();

export const siteDataSchema = z
  .object({
    name: nonEmptyText,
    role: nonEmptyText,
    description: nonEmptyText,
    email: nullableEmail,
    telegram: nullableTelegram,
    services: z.array(nonEmptyText).min(1),
    technologies: z.array(nonEmptyText).min(1),
    cta: z
      .object({
        primary: nonEmptyText,
        secondary: nonEmptyText,
      })
      .strict(),
    seo: z
      .object({
        title: nonEmptyText,
        description: nonEmptyText,
      })
      .strict(),
  })
  .strict();

export type SiteData = z.infer<typeof siteDataSchema>;

export type ContactLink = {
  kind: "email" | "telegram";
  label: string;
  href: string;
};

export const siteData: SiteData = siteDataSchema.parse(rawSiteData);

export function getContactLinks(
  contacts: Pick<SiteData, "email" | "telegram">,
): ContactLink[] {
  const links: ContactLink[] = [];
  const email = contacts.email?.trim();
  const telegram = contacts.telegram?.trim()
    ? nullableTelegram.parse(contacts.telegram)
    : "";

  if (email) {
    links.push({
      kind: "email",
      label: email,
      href: `mailto:${encodeURIComponent(email)}`,
    });
  }

  if (telegram) {
    links.push({
      kind: "telegram",
      label: `@${telegram}`,
      href: `https://t.me/${encodeURIComponent(telegram)}`,
    });
  }

  return links;
}
