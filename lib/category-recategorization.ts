export type CategoryTagEntry = {
  id: number | string;
  tags?: string[] | null;
};

export function parseTagsInput(value: string) {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function findCategoryIdByTags(
  description: string | null | undefined,
  categories: CategoryTagEntry[],
  defaultCategoryId: number | string,
) {
  if (!description) {
    return defaultCategoryId;
  }

  const haystack = description.toLowerCase();
  const tagEntries = categories.flatMap((category) => {
    if (!category.tags?.length) {
      return [];
    }

    return category.tags
      .map((tag) => tag.trim())
      .filter(Boolean)
      .map((tag) => ({
        categoryId: category.id,
        tag,
      }));
  });

  if (tagEntries.length === 0) {
    return defaultCategoryId;
  }

  tagEntries.sort((a, b) => b.tag.length - a.tag.length);

  for (const entry of tagEntries) {
    if (haystack.includes(entry.tag.toLowerCase())) {
      return entry.categoryId;
    }
  }

  return defaultCategoryId;
}
