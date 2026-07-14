import type { ImageMetadata } from "astro";
import { z } from "zod";

const nonEmptyText = z.string().trim().min(1);
const projectId = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const projectSchema = z
  .object({
    id: projectId,
    title: nonEmptyText,
    category: nonEmptyText,
    clientType: nonEmptyText,
    year: z.number().int().min(2000),
    summary: nonEmptyText,
    task: nonEmptyText,
    solution: nonEmptyText,
    stack: z.array(nonEmptyText).min(1),
    result: nonEmptyText,
    status: nonEmptyText,
    image: nonEmptyText.optional(),
    imageAlt: nonEmptyText.optional(),
    featured: z.boolean(),
  })
  .strict();

type ProjectFrontmatter = z.infer<typeof projectSchema>;

export type Project = Omit<ProjectFrontmatter, "image"> & {
  image?: ProjectFrontmatter["image"] | ImageMetadata;
};

export function projectIdFromData(data: Record<string, unknown>): string {
  return projectId.parse(data.id);
}

const russianTitleOrder = new Intl.Collator("ru");

export function sortProjects(projects: readonly Project[]): Project[] {
  return [...projects].sort(
    (left, right) =>
      Number(right.featured) - Number(left.featured) ||
      right.year - left.year ||
      russianTitleOrder.compare(left.title, right.title) ||
      (left.id < right.id ? -1 : left.id > right.id ? 1 : 0),
  );
}
