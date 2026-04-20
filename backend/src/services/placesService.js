function mapTopicToIncludedType(topic) {
  const normalized = topic.trim().toLowerCase();

  const topicMap = {
    restaurant: "restaurant",
    restaurants: "restaurant",
    cafe: "cafe",
    cafés: "cafe",
    coffee: "cafe",
    bar: "bar",
    bars: "bar",
    club: "night_club",
    clubs: "night_club",
    museum: "museum",
    museums: "museum",
    park: "park",
    parks: "park",
    burger: "restaurant",
    burgers: "restaurant",
  };

  return topicMap[normalized] || null;
}

function filterPlaces(results) {
  return results.filter((place) => {
    const rating = place.rating ?? 0;
    const userRatingCount = place.userRatingCount ?? 0;

    return rating >= 4.2 && userRatingCount >= 50;
  });
}

function sortPlaces(results) {
  return results.sort((a, b) => {
    const aUserRatingCount = a.userRatingCount ?? 0;
    const bUserRatingCount = b.userRatingCount ?? 0;

    if (bUserRatingCount !== aUserRatingCount) {
      return bUserRatingCount - aUserRatingCount;
    }

    const aRating = a.rating ?? 0;
    const bRating = b.rating ?? 0;

    return bRating - aRating;
  });
}

export async function searchPlaces(validatedCity, topic) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  const includedType = mapTopicToIncludedType(topic);

  const requestBody = {
    textQuery: `${topic} in ${validatedCity.normalizedCity}`,
    pageSize: 15,
  };

  const hasViewport =
    validatedCity.viewport?.northeast?.lat != null &&
    validatedCity.viewport?.northeast?.lng != null &&
    validatedCity.viewport?.southwest?.lat != null &&
    validatedCity.viewport?.southwest?.lng != null;

  if (hasViewport) {
    requestBody.locationRestriction = {
      rectangle: {
        low: {
          latitude: validatedCity.viewport.southwest.lat,
          longitude: validatedCity.viewport.southwest.lng,
        },
        high: {
          latitude: validatedCity.viewport.northeast.lat,
          longitude: validatedCity.viewport.northeast.lng,
        },
      },
    };
  }

  if (includedType) {
    requestBody.includedType = includedType;
    requestBody.strictTypeFiltering = false;
  }

  const response = await fetch(
    "https://places.googleapis.com/v1/places:searchText",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask":
          "places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.googleMapsUri,places.location",
      },
      body: JSON.stringify(requestBody),
    }
  );

  const data = await response.json();
  console.log("PLACES RESPONSE:", JSON.stringify(data, null, 2));

  if (!data.places || !Array.isArray(data.places)) {
    return [];
  }

  const mappedResults = data.places.map((place) => ({
    source: "Google Places",
    title: place.displayName?.text || "Unknown place",
    description: place.formattedAddress || "No address available",
    address: place.formattedAddress || "No address available",
    rating: place.rating ?? null,
    userRatingCount: place.userRatingCount ?? 0,
    url: place.googleMapsUri || null,
    latitude: place.location?.latitude ?? null,
    longitude: place.location?.longitude ?? null,
  }));

  const filteredResults = filterPlaces(mappedResults);
  return sortPlaces(filteredResults);
}