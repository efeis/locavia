import { useState } from "react";
import logo from "./assets/locavia-logo.png";
import "./App.css";

function App() {
  const [city, setCity] = useState("");
  const [topic, setTopic] = useState("");
  const [results, setResults] = useState([]);
  const [historicalResults, setHistoricalResults] = useState([]);
  const [sourcesUsed, setSourcesUsed] = useState([]);
  const [meta, setMeta] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [lastQuery, setLastQuery] = useState(null);
  const [showAllPlaces, setShowAllPlaces] = useState(false);
  const [showAllWebResults, setShowAllWebResults] = useState(false);
  const [showHistorical, setShowHistorical] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setHasSearched(true);
    setShowAllPlaces(false);
    setShowAllWebResults(false);
    setShowHistorical(false);
    setErrorMessage("");

    try {
      const response = await fetch("http://localhost:3001/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ city, topic }),
      });

      const data = await response.json();

      if (!response.ok) {
        setResults([]);
        setHistoricalResults([]);
        setSourcesUsed([]);
        setMeta(null);
        setLastQuery(null);
        setErrorMessage(data.error || "Search failed");
        return;
      }

      setResults(data.results || []);
      setHistoricalResults(data.historical || []);
      setSourcesUsed(data.sourcesUsed || []);
      setMeta(data.meta || null);
      setLastQuery(data.query || null);
    } catch (error) {
      console.error("Search failed:", error);
      setResults([]);
      setHistoricalResults([]);
      setSourcesUsed([]);
      setMeta(null);
      setLastQuery(null);
      setErrorMessage("Network or backend error");
    } finally {
      setLoading(false);
    }
  };

  const placeResults = results.filter((result) => result.source === "Google Places");
  const webResults = results.filter((result) => result.source !== "Google Places");

  const visiblePlaces = showAllPlaces ? placeResults : placeResults.slice(0, 5);
  const visibleWebResults = showAllWebResults ? webResults : webResults.slice(0, 3);

  const uniqueHistorical = historicalResults.filter((result, index, arr) => {
    const key = `${result.title || ""}|${result.address || ""}|${result.source || ""}`;
    return (
      index ===
      arr.findIndex(
        (item) =>
          `${item.title || ""}|${item.address || ""}|${item.source || ""}` === key
      )
    );
  });

  const displayCity = lastQuery?.city || "";
  const displayTopic = lastQuery?.topic || "";

  const renderPlaceCard = (result, index, historical = false) => (
    <div
      key={result.id || `${result.source}-${index}`}
      className={`result-card ${historical ? "historical-card" : ""}`}
    >
      <div className="result-topline">
        <p className="result-source">
          {result.source}
          {historical ? " · historical" : ""}
        </p>

        {result.rating && (
          <div className="rating-badge">
            <span className="rating-score">{result.rating}</span>
            <span className="rating-count">
              {typeof result.userRatingCount === "number"
                ? `(${result.userRatingCount} ratings)`
                : ""}
            </span>
          </div>
        )}
      </div>

      <h3>{result.title}</h3>
      <p className="result-address">{result.address}</p>

      {result.url && (
        <a href={result.url} target="_blank" rel="noreferrer" className="maps-link">
          Open in Google Maps
        </a>
      )}
    </div>
  );

  const renderWebCard = (result, index, historical = false) => (
    <div
      key={result.id || `${result.source}-${index}`}
      className={`web-insight-card ${historical ? "historical-card" : ""}`}
    >
      <p className="result-source">
        {result.source}
        {historical ? " · historical" : ""}
      </p>
      <h4>{result.title}</h4>
      {result.description && <p className="result-description">{result.description}</p>}
      <p className="result-address">{result.address}</p>

      {result.url && (
        <a
          href={result.url}
          target="_blank"
          rel="noreferrer"
          className="maps-link secondary-link"
        >
          Open source
        </a>
      )}
    </div>
  );

  return (
    <div className="page">
      <header className="hero">
        <img src={logo} alt="locavia logo" className="logo" />

        <form className="search-shell" onSubmit={handleSearch}>
          <div className="search-field">
            <label>Where</label>
            <input
              type="text"
              placeholder="Search destinations"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
          </div>

          <div className="divider" />

          <div className="search-field">
            <label>What</label>
            <input
              type="text"
              placeholder="Search topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
          </div>

          <button type="submit" className="search-button">
            {loading ? "..." : "Search"}
          </button>
        </form>

        {!hasSearched && (
          <p className="search-helper">
            Enter a location and a topic to find top places and supporting web insights.
          </p>
        )}
      </header>

      <main className="results-section">
        {hasSearched && !loading && results.length > 0 && (
          <section className="summary-block">
            <h2>
              Best {displayTopic} spots
              {displayCity ? ` in ${displayCity}` : ""}
            </h2>

            <p className="section-subtitle">
              {placeResults.length} highly rated places and {webResults.length} supporting web
              results found
            </p>

            <div className="system-summary">
              <span className="system-pill">
                Sources: {sourcesUsed.length > 0 ? sourcesUsed.join(", ") : "none"}
              </span>

              {meta?.resultCount !== undefined && (
                <span className="system-pill">Current results: {meta.resultCount}</span>
              )}

              <span className="system-pill">
                Historical results: {uniqueHistorical.length}
              </span>
            </div>
          </section>
        )}

        {errorMessage && (
          <div className="empty-state">
            <h3>Something went wrong</h3>
            <p>{errorMessage}</p>
          </div>
        )}

        {hasSearched && !loading && results.length === 0 && !errorMessage && (
          <div className="empty-state">
            <h3>No matching results found</h3>
            <p>Try a broader topic or another city.</p>
          </div>
        )}

        {(visiblePlaces.length > 0 || visibleWebResults.length > 0) && (
          <section className="main-overview-layout">
            <div className="top-places-block">
              <div className="section-header">
                <div>
                  <h2>Top places</h2>
                  <p className="section-subtitle">
                    Highly rated location results you can actually visit
                  </p>
                </div>
              </div>

              {visiblePlaces.map((result, index) => renderPlaceCard(result, index))}

              {placeResults.length > 5 && (
                <button
                  type="button"
                  className="see-more-button"
                  onClick={() => setShowAllPlaces((prev) => !prev)}
                >
                  {showAllPlaces
                    ? "Show less places"
                    : `See more places (${placeResults.length - 5})`}
                </button>
              )}
            </div>

            <aside className="web-insights-block">
              <div className="section-header">
                <div>
                  <h2>Web insights</h2>
                  <p className="section-subtitle">
                    Guides, articles, and discussions that add context
                  </p>
                </div>
              </div>

              {visibleWebResults.map((result, index) => renderWebCard(result, index))}

              {webResults.length > 3 && (
                <button
                  type="button"
                  className="see-more-button"
                  onClick={() => setShowAllWebResults((prev) => !prev)}
                >
                  {showAllWebResults
                    ? "Show less web results"
                    : `See more web results (${webResults.length - 3})`}
                </button>
              )}
            </aside>
          </section>
        )}

        {uniqueHistorical.length > 0 && (
          <section className="historical-section">
            <div className="section-header">
              <div>
                <h2>Previous results</h2>
                <p className="section-subtitle">
                  {uniqueHistorical.length} saved historical entries
                </p>
              </div>
            </div>

            <button
              type="button"
              className="see-more-button"
              onClick={() => setShowHistorical((prev) => !prev)}
            >
              {showHistorical ? "Hide previous results" : "Show previous results"}
            </button>

            {showHistorical && (
              <div className="historical-list">
                {uniqueHistorical.slice(0, 6).map((result, index) =>
                  result.source === "Google Places"
                    ? renderPlaceCard(result, index, true)
                    : renderWebCard(result, index, true)
                )}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}

export default App;