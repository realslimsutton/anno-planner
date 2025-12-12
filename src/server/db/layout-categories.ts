import { m } from "@/paraglide/messages";

export const LAYOUT_CATEGORIES = [
  {
    id: "production",
    labels: {
      en: m.layout_category_production(),
      de: m.layout_category_production(),
    },
  },
  {
    id: "city",
    labels: {
      en: m.layout_category_city(),
      de: m.layout_category_city(),
    },
  },
  {
    id: "other",
    labels: {
      en: m.layout_category_other(),
      de: m.layout_category_other(),
    },
  },
];

export const ALL_LAYOUT_CATEGORY_VALUES = LAYOUT_CATEGORIES.map(
  (category) => category.id,
);
