import { useState } from "react";
import logoWithStamp from "./assets/logo_with_stamp.png";
import "./App.css";

const API_BASE_URL = "http://localhost:3001";

const getSourceName = (result) => {
  const candidates = [result.address, result.url].filter(Boolean);

  for (const candidate of candidates) {
    const displayedHost = candidate.split(/[››]/, 1)[0].trim();

    try {
      const url = new URL(
        displayedHost.includes("://") ? displayedHost : `https://${displayedHost}`
      );
      const hostname = url.hostname.replace(/^www\./, "");
      const looksLikeDomain = /^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/i.test(hostname);
      if (
        looksLikeDomain &&
        hostname !== "google.com" &&
        !hostname.endsWith(".google.com")
      ) {
        return hostname;
      }
    } catch {
      continue;
    }
  }

  return "Web guide";
};

function App() {
  const [city, setCity] = useState("");
  const [topic, setTopic] = useState("");
  const [results, setResults] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [lastQuery, setLastQuery] = useState(null);
  const [activeResultsTab, setActiveResultsTab] = useState("places");
  const [placeSort, setPlaceSort] = useState("balanced");
  const [visibleWebCount, setVisibleWebCount] = useState(5);

  const handleSearch = async (event) => {
    event.preventDefault();
    setLoading(true);
    setHasSearched(true);
    setResults([]);
    setLastQuery(null);
    setActiveResultsTab("places");
    setPlaceSort("balanced");
    setVisibleWebCount(5);
    setErrorMessage("");

    try {
      const response = await fetch(`${API_BASE_URL}/search`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ city, topic }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.error || "Search failed");
        return;
      }

      const searchResults = data.results || [];
      setResults(searchResults);
      setActiveResultsTab(
        searchResults.some((result) => result.source === "Google Places")
          ? "places"
          : "guides"
      );
      setLastQuery(data.query || null);
    } catch (error) {
      console.error("Search failed:", error);
      setErrorMessage("Network or backend error");
    } finally {
      setLoading(false);
    }
  };

  const placeResults = results.filter((result) => result.source === "Google Places");
  const webResults = results.filter((result) => result.source !== "Google Places");
  const sortedPlaces = [...placeResults].sort((a, b) => {
    const ratingDifference = (b.rating ?? 0) - (a.rating ?? 0);
    const reviewDifference = (b.userRatingCount ?? 0) - (a.userRatingCount ?? 0);

    if (placeSort === "rated") return ratingDifference || reviewDifference;
    if (placeSort === "reviewed") return reviewDifference || ratingDifference;

    const confidenceScore = (place) => {
      const reviewCount = place.userRatingCount ?? 0;
      return (
        (reviewCount / (reviewCount + 100)) * (place.rating ?? 0) +
        (100 / (reviewCount + 100)) * 4
      );
    };

    return confidenceScore(b) - confidenceScore(a) || reviewDifference;
  });
  const placeDisplayCount = Math.min(sortedPlaces.length, 20);
  const visiblePlaces = sortedPlaces.slice(
    0,
    placeDisplayCount > 1 ? placeDisplayCount - (placeDisplayCount % 2) : placeDisplayCount
  );
  const visibleWebResults = webResults.slice(0, visibleWebCount);

  const displayCity = lastQuery?.city || city.trim();
  const displayTopic = lastQuery?.topic || topic.trim();

  const renderPhotoCredit = (attributions = []) => {
    const authors = attributions.filter((attribution) => attribution.displayName);
    if (authors.length === 0) return null;

    return authors.map((attribution, index) => {
      const label = `Photo by ${attribution.displayName}`;
      const author = attribution.uri ? (
        <a href={attribution.uri} target="_blank" rel="noreferrer">
          {label}
        </a>
      ) : (
        label
      );

      return (
        <span key={attribution.uri || attribution.displayName}>
          {index > 0 ? ", " : ""}
          {author}
        </span>
      );
    });
  };

  const renderPlaceCard = (result, index) => {
    const photoUrl = result.photoName
      ? `${API_BASE_URL}/places-photo?name=${encodeURIComponent(result.photoName)}`
      : null;

    return (
      <article
        key={result.id || `${result.source}-${index}`}
        className="result-card"
      >
        <div className="place-photo">
          <div className="photo-fallback" aria-hidden="true">
            <svg viewBox="0 0 48 48">
              <path d="M24 42s14-13.2 14-24a14 14 0 1 0-28 0c0 10.8 14 24 14 24Z" />
              <circle cx="24" cy="18" r="4.5" />
            </svg>
            <span>No photo yet</span>
          </div>
          {photoUrl && (
            <img
              src={photoUrl}
              alt={`${result.title} in ${result.address || "the searched area"}`}
              loading="lazy"
              onError={(event) => event.currentTarget.remove()}
            />
          )}
          {result.photoAttributions?.length > 0 && (
            <div className="photo-credit">{renderPhotoCredit(result.photoAttributions)}</div>
          )}
        </div>

        <div className="result-content">
          <div className="result-topline">
            {result.rating != null && (
              <div className="rating-badge" aria-label={`${result.rating} out of 5`}>
                <span className="rating-star" aria-hidden="true">
                  ★
                </span>
                <span className="rating-score">{result.rating}</span>
                {typeof result.userRatingCount === "number" && (
                  <span className="rating-count">
                    {result.userRatingCount.toLocaleString()}
                  </span>
                )}
              </div>
            )}
          </div>

          <h3>{result.title}</h3>
          <p className="result-address">{result.address}</p>

          {result.url && (
            <a href={result.url} target="_blank" rel="noreferrer" className="maps-link">
              Open in Google Maps
              <span aria-hidden="true"> ↗</span>
            </a>
          )}

        </div>
      </article>
    );
  };

  const renderWebCard = (result, index) => (
    <article
      key={result.id || `${result.source}-${index}`}
      className="web-insight-card"
    >
      <div className="guide-card-meta">
        <span>{getSourceName(result)}</span>
      </div>
      <h3>{result.title}</h3>
      {result.description && <p className="result-description">{result.description}</p>}

      {result.url && (
        <a
          href={result.url}
          target="_blank"
          rel="noreferrer"
          className="maps-link secondary-link"
        >
          Go to page
          <span aria-hidden="true"> ↗</span>
        </a>
      )}
    </article>
  );

  return (
    <div className="page">
      <div className={`app-frame ${hasSearched ? "has-results" : "landing"}`}>
        <header className="hero">
          <a className="brand" href="/" aria-label="Locavia home">
            <img src={logoWithStamp} alt="Your local guide, Locavia" className="logo-lockup" />
          </a>

          <form className="search-shell" onSubmit={handleSearch}>
            <label className="visually-hidden" htmlFor="search-city">
              Where
            </label>
            <input
              id="search-city"
              type="text"
              placeholder="where?"
              value={city}
              onChange={(event) => setCity(event.target.value)}
              required
            />

            <span className="divider" aria-hidden="true" />

            <label className="visually-hidden" htmlFor="search-topic">
              What sounds good?
            </label>
            <input
              id="search-topic"
              type="text"
              placeholder="what sounds good?"
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              required
            />

            <button
              type="submit"
              className="search-button"
              aria-label={loading ? "Searching" : "Search"}
              disabled={loading}
            >
              {loading ? (
                <span className="search-spinner" aria-hidden="true" />
              ) : (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="10.8" cy="10.8" r="6.8" />
                  <path d="m16 16 4.2 4.2" />
                </svg>
              )}
            </button>
          </form>

          <p className="landing-description">
            Discover places to eat, spots to hang out, and things to do in any city or
            neighborhood.
          </p>
        </header>

        <main className="results-section">
          {loading && <p className="loading-message">Finding great local spots…</p>}

          {errorMessage && (
            <div className="empty-state" role="alert">
              <h2>Something went wrong</h2>
              <p>{errorMessage}</p>
            </div>
          )}

          {hasSearched && !loading && results.length === 0 && !errorMessage && (
            <div className="empty-state">
              <h2>No matching results found</h2>
              <p>Try a broader topic or another city.</p>
            </div>
          )}

          {hasSearched && !loading && results.length > 0 && (
            <>
              <section className="summary-block" aria-live="polite">
                <h1>
                  {displayTopic} in {displayCity}
                </h1>

                <div className="results-switch" role="group" aria-label="Result type">
                  <button
                    type="button"
                    className={activeResultsTab === "places" ? "active" : ""}
                    aria-pressed={activeResultsTab === "places"}
                    disabled={placeResults.length === 0}
                    onClick={() => setActiveResultsTab("places")}
                  >
                    Places
                  </button>
                  <button
                    type="button"
                    className={activeResultsTab === "guides" ? "active" : ""}
                    aria-pressed={activeResultsTab === "guides"}
                    disabled={webResults.length === 0}
                    onClick={() => setActiveResultsTab("guides")}
                  >
                    Blogs, lists &amp; web finds
                  </button>
                </div>
              </section>

              {activeResultsTab === "places" && (
                <section className="results-group" aria-labelledby="places-heading">
                  <div className="section-header">
                    <div>
                      <h2 id="places-heading">Places to try</h2>
                    </div>
                    <label className="sort-control">
                      <span>Sort by</span>
                      <select
                        value={placeSort}
                        onChange={(event) => {
                          setPlaceSort(event.target.value);
                        }}
                      >
                        <option value="balanced">Best balance</option>
                        <option value="rated">Highest rated</option>
                        <option value="reviewed">Most reviewed</option>
                      </select>
                    </label>
                  </div>

                  <div className="result-grid">
                    {visiblePlaces.map((result, index) => renderPlaceCard(result, index))}
                  </div>
                </section>
              )}

              {activeResultsTab === "guides" && (
                <section
                  className="results-group local-guides-section"
                  aria-label="Blogs, lists and web finds"
                >
                  <div className="web-results-grid">
                    {visibleWebResults.map((result, index) =>
                      renderWebCard(result, index)
                    )}
                  </div>

                  {visibleWebCount < webResults.length && (
                    <button
                      type="button"
                      className="see-more-button"
                      onClick={() => setVisibleWebCount((count) => count + 5)}
                    >
                      Load 5 more
                    </button>
                  )}
                </section>
              )}
            </>
          )}
        </main>
      </div>

      <footer className="site-footer">
        <div className="footer-byline">
          <span>a project by</span>
          <a
            href="https://twitter.com/efeis1"
            target="_blank"
            rel="noopener noreferrer"
            className="footer-author"
            aria-label="efeis on Twitter"
          >
            efeis
          </a>
          <img src="/efeis-cutout.png" alt="efeis logo" className="footer-logo" />
        </div>
        <a
          href="https://github.com/efeis/locavia"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Locavia GitHub repository"
          className="footer-github"
        >
          <svg aria-hidden="true" viewBox="0 0 19 19">
            <use href="/icons.svg#github-icon" />
          </svg>
        </a>
      </footer>
    </div>
  );
}

export default App;
