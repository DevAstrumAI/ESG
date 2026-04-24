/**
 * Append company city country/city filters to emissions API URLs.
 */
export function appendLocationQuery(url, country, city) {
  if (!country || !city) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}country=${encodeURIComponent(country)}&city=${encodeURIComponent(city)}`;
}
