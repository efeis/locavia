function mapSerpApiResult(item) {
  return {
    source: "SerpApi",
    title: item.title || "Untitled result",
    description: item.snippet || "No description available",
    address: item.displayed_link || item.link || "No source link available",
    rating: null,
    userRatingCount: null,
    url: item.link || null,
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

  return data.organic_results.slice(0, 5).map(mapSerpApiResult);
}