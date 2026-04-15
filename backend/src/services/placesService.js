export async function searchPlaces(city, topic) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  const response = await fetch(
    "https://places.googleapis.com/v1/places:searchText",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask":
          "places.displayName,places.formattedAddress,places.rating,places.googleMapsUri,places.location",
      },
      body: JSON.stringify({
        textQuery: `${topic} in ${city}`,
        pageSize: 5,
      }),
    }
  );

  const data = await response.json();

  if (!data.places || !Array.isArray(data.places)) {
    return [];
  }

  return data.places.map((place) => ({
    source: "Google Places",
    title: place.displayName?.text || "Unknown place",
    description: place.formattedAddress || "No address available",
    address: place.formattedAddress || "No address available",
    rating: place.rating ?? null,
    url: place.googleMapsUri || null,
    latitude: place.location?.latitude ?? null,
    longitude: place.location?.longitude ?? null,
  }));
}