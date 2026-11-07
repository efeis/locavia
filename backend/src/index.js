import "dotenv/config";

import express from "express";
import cors from "cors";
import { validateCity } from "./services/geocodingService.js";
import {
  saveQuery,
  saveResults,
  getHistoricalQueries,
  getHistoricalResults,
} from "./services/firestoreService.js";
import { runSourceSearches } from "./services/searchAggregatorService.js";

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "locavia backend is running" });
});

app.get("/places-photo", async (req, res) => {
  const photoName = req.query.name;

  if (
    typeof photoName !== "string" ||
    !/^places\/[A-Za-z0-9_-]+\/photos\/[A-Za-z0-9_-]+$/.test(photoName)
  ) {
    return res.status(400).json({ error: "A valid Places photo name is required." });
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Missing GOOGLE_MAPS_API_KEY in backend/.env" });
  }

  try {
    const photoUrl = new URL(`https://places.googleapis.com/v1/${photoName}/media`);
    photoUrl.searchParams.set("maxWidthPx", "800");
    photoUrl.searchParams.set("key", apiKey);

    const photoResponse = await fetch(photoUrl);
    const contentType = photoResponse.headers.get("content-type") || "";

    if (!photoResponse.ok || !contentType.startsWith("image/")) {
      console.error("Google Places photo request failed:", photoResponse.status);
      return res.status(502).json({ error: "Unable to load this place photo." });
    }

    res.set("Content-Type", contentType);
    res.set("Cache-Control", "no-store");
    return res.send(Buffer.from(await photoResponse.arrayBuffer()));
  } catch (error) {
    console.error("Google Places photo request failed:", error);
    return res.status(502).json({ error: "Unable to load this place photo." });
  }
});

app.post("/search", async (req, res) => {
  const { city, topic } = req.body;

  if (!city || !topic) {
    return res.status(400).json({
      error: "City and topic are required.",
    });
  }

  const normalizedTopic = topic.trim().toLowerCase();

  try {
    const validatedCity = await validateCity(city);

    if (!validatedCity) {
      return res.status(400).json({
        error: "Please enter a valid city name.",
      });
    }

    const historicalQueries = await getHistoricalQueries(
      validatedCity.normalizedCity,
      normalizedTopic
    );

    const historicalResults = await getHistoricalResults(
      historicalQueries.map((query) => query.id)
    );

    const { jobs, sourcesUsed, mergedResults } = await runSourceSearches(
      validatedCity,
      normalizedTopic
    );

    const queryId = await saveQuery({
      originalCity: city,
      normalizedCity: validatedCity.normalizedCity,
      topic: normalizedTopic,
      formattedAddress: validatedCity.formattedAddress,
      country: validatedCity.country,
      location: validatedCity.location,
      sourcesUsed,
      jobs,
      searchedAt: new Date().toISOString(),
    });

    if (mergedResults.length > 0) {
      await saveResults(queryId, mergedResults);
    }

    return res.json({
      queryId,
      query: {
        city: validatedCity.normalizedCity,
        topic: normalizedTopic,
      },
      cityValidation: validatedCity,
      jobs,
      sourcesUsed,
      results: mergedResults,
      historical: historicalResults,
      meta: {
        resultCount: mergedResults.length,
        historicalCount: historicalResults.length,
      },
    });
  } catch (error) {
    console.error("Search failed:", error);
    return res.status(500).json({
      error: error.message || "Internal server error",
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});