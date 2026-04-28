/**
 * Append company city country/city filters to emissions API URLs.
 */
export function appendLocationQuery(url, country, city, branch, region) {
  if (!country || !city) return url;
  const sep = url.includes("?") ? "&" : "?";
  const branchPart = branch ? `&branch=${encodeURIComponent(branch)}` : "";
  const regionPart = region ? `&region=${encodeURIComponent(region)}` : "";
  return `${url}${sep}country=${encodeURIComponent(country)}&city=${encodeURIComponent(city)}${branchPart}${regionPart}`;
}
