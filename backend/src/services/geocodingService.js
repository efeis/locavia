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

  if (data.status !== "OK" || !Array.isArray(data.results) || data.results.length === 0) {
    return null;
  }

  const preferredResult =
    data.results.find((result) =>
      result.types?.includes("locality") ||
      result.types?.includes("postal_town") ||
      result.types?.includes("administrative_area_level_3")
    ) || data.results[0];

  const addressComponents = preferredResult.address_components || [];

  const cityComponent =
    addressComponents.find((component) => component.types.includes("locality")) ||
    addressComponents.find((component) => component.types.includes("postal_town")) ||
    addressComponents.find((component) =>
      component.types.includes("administrative_area_level_3")
    );

  const countryComponent = addressComponents.find((component) =>
    component.types.includes("country")
  );

  return {
    normalizedCity:
      cityComponent?.long_name || preferredResult.formatted_address,
    formattedAddress: preferredResult.formatted_address,
    country: countryComponent?.long_name || null,
    location: {
      lat: preferredResult.geometry.location.lat,
      lng: preferredResult.geometry.location.lng,
    },
    viewport: {
      northeast: {
        lat: preferredResult.geometry.viewport?.northeast?.lat ?? null,
        lng: preferredResult.geometry.viewport?.northeast?.lng ?? null,
      },
      southwest: {
        lat: preferredResult.geometry.viewport?.southwest?.lat ?? null,
        lng: preferredResult.geometry.viewport?.southwest?.lng ?? null,
      },
    },
    placeId: preferredResult.place_id,
    types: preferredResult.types || [],
  };
}