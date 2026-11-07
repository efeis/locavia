const CURATED_SOURCE_HOSTS = [
  "blogspot.com",
  "eater.com",
  "medium.com",
  "opentable.com",
  "substack.com",
  "thefork.com",
  "timeout.com",
  "tripadvisor.com",
  "tumblr.com",
  "wordpress.com",
  "yelp.com",
];

const CURATED_RESULT_TERMS =
  /\b(blog|blogs|guide|guides|best|top|list|lists|roundup|recommendations?|where to|reviews?)\b/i;

function getHost(url) {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

function isGoogleHost(host) {
  return /(^|\.)google\.[a-z.]+$/i.test(host);
}

function getExternalUrl(value) {
  if (typeof value !== "string" || !value) return null;

  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;

    if (!isGoogleHost(url.hostname)) return url.toString();

    if (/^\/(?:goto|url|aclk)$/i.test(url.pathname)) {
      for (const parameter of ["url", "q", "target", "adurl"]) {
        const destination = url.searchParams.get(parameter);
        if (destination) {
          try {
            const nestedUrl = new URL(destination);
            if (
              (nestedUrl.protocol === "https:" || nestedUrl.protocol === "http:") &&
              !isGoogleHost(nestedUrl.hostname)
            ) {
              return nestedUrl.toString();
            }
          } catch {
            continue;
          }
        }
      }
    }
  } catch {
    return null;
  }

  return null;
}

function getDisplayedUrl(displayedLink) {
  if (typeof displayedLink !== "string" || !displayedLink) return null;

  const directUrl = getExternalUrl(displayedLink);
  if (directUrl) return directUrl;

  const parts = displayedLink
    .split(/\s*[›»]\s*/)
    .map((part) => part.trim())
    .filter(Boolean);
  const host = parts[0]?.replace(/^https?:\/\//i, "").replace(/^www\./i, "");

  if (!host || !/^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/i.test(host) || isGoogleHost(host)) {
    return null;
  }

  const path = parts
    .slice(1)
    .filter((part) => part !== "...")
    .map((part) => encodeURIComponent(part))
    .join("/");

  return `https://${host}${path ? `/${path}` : ""}`;
}

function getResultUrl(item) {
  return (
    getExternalUrl(item.redirect_link) ||
    getExternalUrl(item.link) ||
    getExternalUrl(item.url) ||
    getDisplayedUrl(item.displayed_link)
  );
}

function isCuratedSource(host) {
  return CURATED_SOURCE_HOSTS.some(
    (curatedHost) => host === curatedHost || host.endsWith(`.${curatedHost}`)
  );
}

function isDirectBusinessSite(item, host, text) {
  if (/\b(official website|official site|order online|book a table)\b/i.test(text)) {
    return true;
  }

  const domainName = host.split(".")[0].replace(/[^a-z0-9]/g, "");
  const titleWords = (item.title || "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length >= 3);

  return domainName.length >= 4 && titleWords.some((word) => domainName.includes(word));
}

function getResultPriority(item) {
  const host = getHost(item.link || "");
  const text = `${item.title || ""} ${item.snippet || ""}`;

  if (host === "reddit.com" || host.endsWith(".reddit.com")) return 0;
  if (isCuratedSource(host) || CURATED_RESULT_TERMS.test(text)) return 0;
  if (isDirectBusinessSite(item, host, text)) return 2;
  return 1;
}

function mapSerpApiResult(item) {
  const url = getResultUrl(item);
  return {
    source: "SerpApi",
    title: item.title || "Untitled result",
    description: item.snippet || "No description available",
    address: item.displayed_link || item.link || "No source link available",
    rating: null,
    userRatingCount: null,
    url,
    latitude: null,
    longitude: null,
  };
}

export async function searchSerpApi(validatedCity, topic) {
  const apiKey = process.env.SERPAPI_KEY;

  if (!apiKey) {
    throw new Error("Missing SERPAPI_KEY in backend/.env");
  }

  const city = validatedCity.normalizedCity;
  const query = `best ${topic} in ${city}`;

  const url = new URL("https://serpapi.com/search");
  url.searchParams.set("engine", "google");
  url.searchParams.set("q", query);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("hl", "en");
  url.searchParams.set("gl", "de");

  const response = await fetch(url.toString());
  const data = await response.json();

  if (!Array.isArray(data.organic_results)) {
    return [];
  }

  return data.organic_results
    .map((item, index) => ({ item, index, priority: getResultPriority(item) }))
    .sort((a, b) => a.priority - b.priority || a.index - b.index)
    .slice(0, 5)
    .map(({ item }) => mapSerpApiResult(item));
}