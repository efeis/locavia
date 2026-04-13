# Architecture Draft

## High-Level Idea
"locavia" is a cloud-native travel guide application that accepts a city and a topic from the user, retrieves relevant travel data from multiple external APIs, stores the data persistently, and displays both current and historical results.

## Main Components
- Frontend web application
- Backend search API
- Worker service for source-specific data retrieval
- Firestore for persistent storage
- Cloud Storage for assets or exported data
- Pub/Sub for parallel task distribution
- Logging and Monitoring for observability

## High-Level Flow
1. The user enters a city and a topic in the frontend.
2. The frontend sends a request to the backend.
3. The backend validates the input.
4. The backend checks Firestore for existing data.
5. The backend triggers parallel retrieval jobs for external APIs.
6. Worker instances fetch source-specific data.
7. The backend normalizes and merges the results.
8. Results are stored in Firestore.
9. The frontend displays current and historical results.

## Draft Architecture Diagram

User
  |
  v
Frontend
  |
  v
Backend API
  |
  +--> Firestore
  |
  +--> Pub/Sub
         |
         +--> Worker -> External API 1
         +--> Worker -> External API 2
         +--> Worker -> External API 3
  |
  v
Frontend Result View
