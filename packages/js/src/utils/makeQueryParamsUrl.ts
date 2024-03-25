/**
 * Constructs a URL with query parameters.
 *
 * @param path The base path of the URL.
 * @param queryParams An instance of URLSearchParams containing all query parameters.
 * @returns The constructed URL with query parameters.
 */
export function makeQueryParamsUrls(
  path: string,
  queryParams: URLSearchParams
): string {
  const queryString = queryParams.toString()
  return queryString ? `${path}?${queryString}` : path
}
