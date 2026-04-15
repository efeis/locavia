import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import { validateCity } from "./services/geocodingService.js";
import { searchPlaces } from "./services/placesService.js";

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "locavia backend is running" });
});

app.post("/search", async (req, res) => {
  const { city, topic } = req.body;

  if (!city || !topic) {
    return res.status(400).json({
      error: "City and topic are required.",
    });
  }

  try {
    const validatedCity = await validateCity(city);

    if (!validatedCity) {
      return res.status(400).json({
        error: "Please enter a valid city name.",
      });
    }

    const placesResults = await searchPlaces(validatedCity.normalizedCity, topic);

    return res.json({
      query: {
        city: validatedCity.normalizedCity,
        topic,
      },
      cityValidation: validatedCity,
      results: placesResults,
      historical: [],
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