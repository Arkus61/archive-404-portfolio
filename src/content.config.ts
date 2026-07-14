import { defineCollection } from "astro/content/config";
import { glob } from "astro/loaders";

import { projectIdFromData, projectSchema } from "./lib/projects";

const projects = defineCollection({
  loader: glob({
    base: "./src/content/projects",
    generateId: ({ data }) => projectIdFromData(data),
    pattern: "**/*.md",
  }),
  schema: ({ image }) =>
    projectSchema.extend({
      image: image().optional(),
    }),
});

export const collections = { projects };
