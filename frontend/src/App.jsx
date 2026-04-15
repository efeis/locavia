import { useState } from "react";
import logo from "./assets/locavia-logo.png";
import "./App.css";

function App() {
  const [city, setCity] = useState("");
  const [topic, setTopic] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("http://localhost:3001/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ city, topic }),
      });

      const data = await response.json();
      setResults(data.results || []);
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setLoading(false);
    }
  };
  

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
        {results.map((result, index) => (
          <div key={index} className="result-card">
            <p className="result-source">{result.source}</p>
            <h3>{result.title}</h3>
            <p>{result.description}</p>
            <p className="result-address">{result.address}</p>
          </div>
        ))}
      </main>
    </div>
  );
}

export default App;