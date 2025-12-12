import type { ClassValue } from "clsx";
import { clsx } from "clsx";
import slugify from "slugify";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getLayoutSlug(title: string, hash: string) {
  return `${slugify(title, { lower: true })}${hash.startsWith("-") ? "" : "-"}${hash}`;
}
