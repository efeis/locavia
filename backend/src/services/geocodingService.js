export async function validateCity(city) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    throw new Error("Missing GOOGLE_MAPS_API_KEY in backend/.env");
  }

  const url =
    `https://maps.googleapis.com/maps/api/geocode/json?` +
    `address=${encodeURIComponent(city)}&key=${apiKey}`;

  const response = await fetch(url);
  const data = await response.json();

  if (data.status !== "OK" || !data.results?.length) {
    return null;
  }

  const cityResult =
    data.results.find((result) =>
      result.types?.includes("locality") ||
      result.types?.includes("administrative_area_level_3") ||
      result.types?.includes("postal_town")
    ) || data.results[0];

  const addressComponents = cityResult.address_components || [];

  const cityComponent =
    addressComponents.find((c) => c.types.includes("locality")) ||
    addressComponents.find((c) => c.types.includes("postal_town")) ||
    addressComponents.find((c) =>
      c.types.includes("administrative_area_level_3")
    );

  const countryComponent = addressComponents.find((c) =>
    c.types.includes("country")
  );

  return {
    normalizedCity: cityComponent?.long_name || cityResult.formatted_address,
    formattedAddress: cityResult.formatted_address,
    country: countryComponent?.long_name || null,
    location: {
      lat: cityResult.geometry.location.lat,
      lng: cityResult.geometry.location.lng,
    },
    placeId: cityResult.place_id,
    types: cityResult.types || [],
  };
}