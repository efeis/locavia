import { searchPlaces } from "./placesService.js";

export async function runSourceSearches(validatedCity, topic) {
  const googlePlacesResults = await searchPlaces(validatedCity, topic);

  return {
    sourcesUsed: ["google_places"],
    mergedResults: googlePlacesResults,
  };
}