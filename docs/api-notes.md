# API Notes

## APIs Used

### Google Geocoding API
Purpose:
- validate and normalize the user-entered location

Used fields:
- normalized location name
- formatted address
- country
- coordinates
- viewport

### Google Places API
Purpose:
- retrieve actionable place-based results such as restaurants, cafes, museums, or parks

Used fields:
- place name
- address
- rating
- rating count
- coordinates
- Google Maps URL

### SerpApi
Purpose:
- retrieve supporting web-based results such as articles, guides, and discussion links

Used fields:
- title
- snippet/description
- displayed link
- source URL

## Unified Result Model

The backend maps source-specific responses into a shared result structure:

- source
- title
- description
- address
- rating
- userRatingCount
- url
- latitude
- longitude
- fetchedAt
