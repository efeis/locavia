import "dotenv/config";

import express from "express";
import cors from "cors";
import { validateCity } from "./services/geocodingService.js";
import {
  saveQuery,
  saveResults,
  getHistoricalQueries,
  getHistoricalResults,
  reserveDailyUsage,
} from "./services/firestoreService.js";
import { runSourceSearches } from "./services/searchAggregatorService.js";

const app = express();
const PORT = Number(process.env.PORT) || 3001;
const MAX_DAILY_SEARCHES = 20;
const MAX_DAILY_PHOTOS = 100;
const MAX_API_REQUESTS_PER_MINUTE = 60;

let requestMinute = Math.floor(Date.now() / 60_000);
let requestsThisMinute = 0;

app.use(cors());
app.use(express.json());

app.use(["/search", "/places-photo"], (req, res, next) => {
  const currentMinute = Math.floor(Date.now() / 60_000);
  if (currentMinute !== requestMinute) {
    requestMinute = currentMinute;
    requestsThisMinute = 0;
  }

  if (requestsThisMinute >= MAX_API_REQUESTS_PER_MINUTE) {
    return res.status(429).json({
      error: "Locavia is receiving too many requests. Please try again in a minute.",
    });
  }

  requestsThisMinute += 1;
  return next();
});

async function reserveUsageOrRespond(res, counterName, dailyLimit, message) {
  try {
    const allowed = await reserveDailyUsage(counterName, dailyLimit);
    if (allowed) return true;

    const now = new Date();
    const nextUtcDay = Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + 1
    );
    res.set("Retry-After", String(Math.ceil((nextUtcDay - now.getTime()) / 1000)));
    res.status(429).json({ error: message });
    return false;
  } catch (error) {
    console.error(`Could not check daily ${counterName} limit:`, error);
    res.status(503).json({
      error: "Locavia usage limits are temporarily unavailable. Please try again later.",
    });
    return false;
  }
}

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

  if (
    !(await reserveUsageOrRespond(
      res,
      "photos",
      MAX_DAILY_PHOTOS,
      "Today's photo limit has been reached. Please try again tomorrow."
    ))
  ) {
    return;
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

  if (
    typeof city !== "string" ||
    typeof topic !== "string" ||
    !city.trim() ||
    !topic.trim() ||
    city.length > 200 ||
    topic.length > 100
  ) {
    return res.status(400).json({
      error: "Enter a city and topic within the allowed length.",
    });
  }

  if (
    !(await reserveUsageOrRespond(
      res,
      "searches",
      MAX_DAILY_SEARCHES,
      "Today's search limit has been reached. Please try again tomorrow."
    ))
  ) {
    return;
  }

  const normalizedCityInput = city.trim();
  const normalizedTopic = topic.trim().toLowerCase();

  try {
    const validatedCity = await validateCity(normalizedCityInput);

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
      originalCity: normalizedCityInput,
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
  console.log(`Server listening on port ${PORT}`);
});