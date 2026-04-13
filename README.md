# locavia

"locavia" is a cloud-based travel search application where users enter a city and a topic, and the system retrieves travel-relevant information from multiple external APIs, stores the results persistently, and displays both fresh and historical results.

## Project Goal
The goal of this project is to implement Lab Exercise 11: Travel Guide (Introduction to Cloud Computing) as a cloud-native web application on Google Cloud.

## Core Features
- Search by city and topic
- Retrieve data from multiple external APIs
- Display aggregated travel-relevant results
- Store results persistently
- Show historical search data for returning users
- Support parallel data retrieval across multiple instances

## Planned Tech Stack
- Frontend: React + Vite
- Backend: Node.js + Express
- Database: Firestore
- Compute: Cloud Run
- Parallel processing: Pub/Sub + worker service
- Storage: Google Cloud Storage

## Planned External APIs
### Initial implementation
- Wikipedia API
- Places API

### Final target
- Three external APIs in total
- Wikipedia API
- Places API
- One additional travel-relevant API for enrichment

## Initial Scope
- A simple web interface for entering a city and a topic
- Integration of two external APIs in the first working version
- Persistent query/result storage
- Historical results display
- Cloud-native architecture prepared for parallel crawling

## Final Implementation Target
- Integration of three external APIs
- Aggregation and normalization of results from all sources
- Parallel retrieval flow using cloud-native components
- Persistent storage of current and historical results
- Demonstrable multi-service cloud architecture on Google Cloud

## Out of Scope for V1
- Authentication
- Favorites
- Reservations or bookings
- Recommendation engine
- Advanced map interaction