# locavia

"locavia" is a cloud-based travel and place discovery app where users enter a location and a topic, and the system retrieves relevant information from multiple external services, stores query and result data persistently, and displays both current and historical results.

<img width="1200" height="932" alt="Screenshot 2026-05-27 at 16 32 01" src="https://github.com/user-attachments/assets/77ed3864-e845-46dc-943b-6945e25472c6" />

## Project Goal

This project was developed as part of **Lab Exercise 11: Travel Guide** in the course **Introduction to Cloud Computing** in the **International Computer Science** bachelor’s program at **OTH Regensburg.**

The goal was to build a travel-relevant web application that:
- accepts a user-defined location and topic
- retrieves information from multiple external APIs
- presents the results in a usable web interface
- stores data persistently for later reuse
- supports historical result retrieval
- is structured in a modular, cloud-oriented way

## Implemented Features

- search by location and topic
- location validation and normalization using geocoding
- retrieval from multiple external APIs
- aggregation of results into one internal format
- separation of results into **Top places** and **Web insights**
- Google Places photos with photo-author attribution when provided
- persistent storage of queries and results in Firestore
- historical result lookup for repeated searches
- result deduplication and sorting
- resilient multi-source retrieval flow
- responsive frontend interface
- optional SerpApi integration via environment configuration

## Tech Stack

- **Frontend:** React, Vite, CSS
- **Backend:** Node.js, Express
- **Database:** Google Firestore
- **External APIs:** Google Geocoding API, Google Places API, SerpApi

## Architecture Overview

The application is split into a frontend and a backend.

**Frontend responsibilities**
- collect user input
- send search requests to the backend
- render current results
- render supporting web insights
- render optional historical results
- display summary information such as source usage and result counts

**Backend responsibilities**
- validate and normalize the location input
- retrieve historical queries and linked results
- build and run enabled search jobs
- aggregate, deduplicate, and sort results
- store queries and results persistently
- return current and historical data to the frontend

## Search Flow

1. The user enters a location and a topic
2. The frontend sends a `POST /search` request to the backend
3. The backend validates the location using geocoding
4. Historical queries and linked results are retrieved from Firestore
5. Enabled source jobs are built and executed
6. Results are merged, deduplicated, and sorted
7. The new query and current results are stored in Firestore
8. The backend returns current results, historical results, source information, and summary metadata

## Data Model

The application uses two main Firestore collections:

**queries**
- original user input
- normalized location
- topic
- formatted address
- country
- location coordinates
- sources used
- job metadata
- search timestamp

**results**
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

## Setup

### Prerequisites
- Node.js installed
- a Google Cloud project
- a configured Firestore database
- a valid Google Maps API key
- a valid SerpApi key (optional if SerpApi is disabled)

### Environment Variables

Create a `.env` file inside the `backend` directory:

```env
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
GOOGLE_CLOUD_PROJECT=your_google_cloud_project_id
ENABLE_SERPAPI=false
# Optional, when enabling SerpApi:
# SERPAPI_KEY=your_serpapi_key
```

For local Firestore access, authenticate with Google Cloud CLI Application
Default Credentials (`gcloud auth application-default login`) using an account
that has access to the project. Place photos use the Google Places API and the
same Maps API key; enable Places API (New) and billing for the project. Photo
requests may incur additional Google Maps Platform usage charges. To enable
web results, set `ENABLE_SERPAPI=true` and provide `SERPAPI_KEY`. Web results
prioritize Reddit discussions, blogs, and curated lists ahead of direct business
websites.

## Installation

### Backend

```bash
cd backend
npm install
```

### Frontend

```bash
cd frontend
npm install
```

## Run Locally

### Start backend

```bash
cd backend
node src/index.js
```

Backend runs on:
`http://localhost:3001`

### Start frontend

```bash
cd frontend
npm run dev
```

Frontend usually runs on:
`http://localhost:5173`

## How to Use

1. Open the frontend in your browser
2. Enter a location in the **Where** field
3. Enter a topic in the **What** field
4. Click **Search**
5. Explore:

   * **Top places**
   * **Web insights**
   * **Previous results** if historical matches exist

## Example Searches

* `Regensburg + cafe`
* `Berlin + museum`
* `Cannes + cinema`
* `Kadıköy + burger`

## What Was Successfully Implemented

* working frontend and backend integration
* location validation before retrieval
* multiple external API integrations
* unified result model
* persistent Firestore storage
* historical query and result retrieval
* modular job-based backend structure
* responsive and presentation-ready interface

## Limitations

* no user authentication
* no personalized recommendation engine
* no booking or reservation functionality
* no advanced map visualization
* no full distributed worker orchestration yet

## Future Improvements

* deploy frontend and backend publicly
* extend the number of external APIs
* add distributed worker-based retrieval
* improve source-specific ranking and filtering
* add map-based interaction
* improve historical browsing UX

## Author

**Efe Işıldar**
International Computer Science
OTH Regensburg
