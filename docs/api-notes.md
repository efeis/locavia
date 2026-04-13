# API Notes

## Initial implementation
The first working version will use two external APIs.

### API 1: Wikipedia API
Purpose:
- Retrieve descriptive travel-related information for cities, landmarks, or places

Possible fields:
- title
- summary
- source URL

### API 2: Places API
Purpose:
- Retrieve place-based results such as restaurants, cafes, museums, or parks

Possible fields:
- place name
- address
- rating
- coordinates
- URL

## Final target
The final version should use three external APIs in total:
- Wikipedia API
- Places API
- One additional travel-relevant API for enrichment

## Unified Result Model
Each aggregated result should aim to contain:
- source
- title
- description
- address
- rating
- url
- latitude
- longitude
- fetchedAt
