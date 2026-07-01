export function sortPhotos<T extends { sort_order?: number; created_at: string }>(photos: T[]): T[] {
  return [...photos].sort((a, b) => {
    const orderDiff = (a.sort_order ?? 0) - (b.sort_order ?? 0)
    if (orderDiff !== 0) return orderDiff
    return a.created_at.localeCompare(b.created_at)
  })
}
