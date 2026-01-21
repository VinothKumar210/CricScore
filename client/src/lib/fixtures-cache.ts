const CACHE_KEY = "fixtures_cache";

export function clearFixturesCache(): void {
  localStorage.removeItem(CACHE_KEY);
}
