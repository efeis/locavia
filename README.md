# locavia

Locavia is a cloud-based travel and place discovery application where users enter a location and a topic, and the system retrieves relevant information from multiple external services, stores query/result data persistently, and displays both current and historical results.

The application combines actionable place recommendations with supporting web-based context. For example, a user can search for `Regensburg + cafe` or `Berlin + museum` and receive both high-quality place results and related web insights.

---

## Project Goal

This project was developed as the implementation of **Lab Exercise 11: Travel Guide** in the course **Introduction to Cloud Computing**.

The goal was to build a travel-relevant web application that:

- accepts a user-defined location and topic
- retrieves information from multiple external APIs
- presents the results in a usable web interface
- stores data persistently for later reuse
- supports historical result retrieval
- is structured in a cloud-oriented, modular way

---

## Implemented Features

- Search by **location** and **topic**
- **Location validation and normalization** using geocoding
- Retrieval from **multiple external APIs**
- Aggregation of results into a unified internal format
- Separation of results into:
  - **Top places**
  - **Web insights**
- Persistent storage of:
  - search queries
  - retrieved results
- Historical result lookup for repeated searches
- Result deduplication and sorting
- Resilient multi-source retrieval flow
- Responsive frontend interface
- Optional secondary source integration via environment configuration

---

## Current Tech Stack

### Frontend
- **React**
- **Vite**
- **CSS**

### Backend
- **Node.js**
- **Express**

### Database / Persistence
- **Google Firestore**

### External Services / APIs
- **Google Geocoding API**
- **Google Places API**
- **SerpApi**

### Cloud Context
- Designed for Google Cloud-based usage
- Firestore used as persistent cloud database
- Architecture structured in a modular, cloud-oriented way

---

## Architecture Overview

The application is split into a frontend and a backend.

### Frontend responsibilities
- collect user input
- send search requests to the backend
- render current results
- render supporting web insights
- render optional historical results
- display summary information such as source usage and result counts

### Backend responsibilities
- validate and normalize the location input
- retrieve historical queries and linked results
- build and run enabled search jobs
- aggregate, deduplicate, and sort results
- store queries and results persistently
- return current and historical data to the frontend

---

## Search Flow

1. The user enters a **location** and a **topic**
2. The frontend sends a `POST /search` request to the backend
3. The backend validates the entered location using geocoding
4. Historical queries matching the normalized location and topic are retrieved
5. Historical results linked to those queries are loaded from Firestore
6. Enabled source jobs are built
7. Source jobs are executed
8. Results are merged, deduplicated, and sorted
9. The new query is stored in Firestore
10. Current results are stored in Firestore and linked via `queryId`
11. The backend returns:
   - current results
   - historical results
   - source information
   - summary metadata

---

## Data Model

The application uses two main Firestore collections:

### `queries`
Stores metadata about each search request, including:
- original user input
- normalized location
- topic
- formatted address
- country
- location coordinates
- sources used
- job metadata
- search timestamp

### `results`
Stores retrieved result entries, including:
- linked `queryId`
- source
- title
- address / displayed link
- description
- rating
- rating count
- URL
- retrieval timestamp

This separation allows historical results to be retrieved by first finding matching queries and then loading linked results.

---

## Multi-Source Retrieval Design

Locavia uses a modular retrieval structure:

- **searchJobBuilder**
  - decides which source jobs should run
- **searchJobRunner**
  - dispatches jobs to the correct source implementations
- **searchAggregatorService**
  - merges, deduplicates, and sorts the results

This structure keeps source planning, execution, and aggregation separate and makes the system easier to extend.

The current implementation already supports concurrent source execution and resilient failure handling at source level.

---

## External API Usage

### 1. Google Geocoding API
Used to validate and normalize the user-entered location.

This provides:
- normalized location name
- formatted address
- country
- coordinates
- viewport data

### 2. Google Places API
Used as the **primary actionable source**.

This provides:
- place names
- addresses
- ratings
- rating counts
- Google Maps links
- coordinates

### 3. SerpApi
Used as a **secondary contextual source**.

This provides:
- articles
- guides
- discussion/forum-style links
- supporting web results relevant to the location/topic search

---

## Result Strategy

The application distinguishes between two main result categories:

### Top places
These are high-quality location results, mainly from Google Places.
They are filtered and sorted to prioritize broadly rated, relevant places.

### Web insights
These are supporting web-based results, mainly from SerpApi.
They provide additional context such as travel guides, rankings, or discussions.

This distinction improves usability and makes the result page easier to understand.

---

## Historical Results

Locavia stores previous searches and their linked result sets.
When a user performs the same or a similar search again, the backend retrieves historical matches and returns them alongside the current results.

This demonstrates:
- persistent storage
- reuse of prior search data
- historical lookup functionality
- clear separation between current and historical information

---

## Project Structure

```text
locavia/
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   ├── index.css
│   │   └── assets/
│   └── ...
├── backend/
│   ├── src/
│   │   ├── index.js
│   │   └── services/
│   │       ├── firestoreService.js
│   │       ├── geocodingService.js
│   │       ├── placesService.js
│   │       ├── searchAggregatorService.js
│   │       ├── searchJobBuilder.js
│   │       ├── searchJobRunner.js
│   │       └── serpApiService.js
│   └── ...
└── README.md
```
---

## Setup

### Prerequisites

Before running the project, make sure you have:

- **Node.js** installed
- a **Google Cloud project**
- a configured **Firestore database**
- a valid **Google Maps API key**
- a valid **SerpApi key** (optional if SerpApi is disabled)

---

## Environment Variables

Create a `.env` file inside the `backend` directory.

Example:

```env
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
SERPAPI_KEY=your_serpapi_key
ENABLE_SERPAPI=true
```
