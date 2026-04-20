import { useState } from "react";
import logo from "./assets/locavia-logo.png";
import "./App.css";

function App() {
  const [city, setCity] = useState("");
  const [topic, setTopic] = useState("");
  const [results, setResults] = useState([]);
  const [historicalResults, setHistoricalResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setHasSearched(true);

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
        alert(data.error || "Search failed");
        setResults([]);
        setHistoricalResults([]);
        return;
      }

      setResults(data.results || []);
      setHistoricalResults(data.historical || []);
    } catch (error) {
      console.error("Search failed:", error);
      alert("Network or backend error");
    } finally {
      setLoading(false);
    }
  };

  const renderCard = (result, index, historical = false) => (
    <div key={result.id || index} className={`result-card ${historical ? "historical-card" : ""}`}>
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
      </header>

      <main className="results-section">
        {hasSearched && !loading && results.length > 0 && (
          <div className="section-header">
            <div>
              <h2>Best {topic} spots in {city}</h2>
              <p className="section-subtitle">{results.length} highly rated places found</p>
            </div>
          </div>
        )}

        {results.map((result, index) => renderCard(result, index, false))}

        {hasSearched && !loading && results.length === 0 && (
          <div className="empty-state">
            <h3>No matching places found</h3>
            <p>Try a broader topic or another city.</p>
          </div>
        )}

        {historicalResults.length > 0 && (
          <section className="historical-section">
            <div className="section-header">
              <div>
                <h2>Previous results</h2>
                <p className="section-subtitle">{historicalResults.length} historical entries</p>
              </div>
            </div>

            {historicalResults.map((result, index) => renderCard(result, index, true))}
          </section>
        )}
      </main>
    </div>
  );
}

export default App;