# Architecture Overview

## High-Level Idea

Locavia is a travel and place discovery application where users enter a location and a topic, and the system retrieves relevant data from multiple external APIs, stores it persistently, and displays both current and historical results.

## Main Components

- Frontend web application
- Backend search API
- Google Geocoding API for location validation
- Google Places API for primary place results
- SerpApi for supporting web insights
- Firestore for persistent storage

## High-Level Flow

1. The user enters a location and a topic in the frontend
2. The frontend sends a request to the backend
3. The backend validates and normalizes the location
4. The backend retrieves matching historical queries and results from Firestore
5. The backend builds and runs enabled source jobs
6. Results are normalized, merged, deduplicated, and sorted
7. The backend stores the new query and current results in Firestore
8. The frontend displays current results and optional historical results

## Simplified Architecture Diagram

User
  |
  v
Frontend
  |
  v
Backend API
  |
  +--> Geocoding API
  |
  +--> Google Places API
  |
  +--> SerpApi
  |
  +--> Firestore
  |
  v
Frontend Result View
