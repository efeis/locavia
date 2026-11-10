import { useEffect, useState } from "react";
import logoWithStamp from "./assets/logo_with_stamp.png";
import ratingStar from "./assets/star.png";
import "./App.css";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.PROD ? "" : "http://localhost:3001")
).replace(/\/$/, "");
const SHORTLIST_STORAGE_KEY = "locavia-shortlist";
const MAX_SHORTLIST_SIZE = 5;

function normalizePlace(place) {
  if (!place || typeof place !== "object") return null;
  const title = typeof place.title === "string" ? place.title.trim().slice(0, 200) : "";
  const address =
    typeof place.address === "string" ? place.address.trim().slice(0, 300) : "";

  if (!title || !address) return null;

  let url = null;
  if (typeof place.url === "string") {
    try {
      const parsedUrl = new URL(place.url);
      if (parsedUrl.protocol === "https:" || parsedUrl.protocol === "http:") {
        url = parsedUrl.toString();
      }
    } catch {
      url = null;
    }
  }

  return {
    source: "Google Places",
    title,
    address,
    rating: Number.isFinite(place.rating) ? place.rating : null,
    userRatingCount: Number.isFinite(place.userRatingCount)
      ? place.userRatingCount
      : null,
    photoName:
      typeof place.photoName === "string" &&
      /^places\/[A-Za-z0-9_-]+\/photos\/[A-Za-z0-9_-]+$/.test(place.photoName)
        ? place.photoName
        : null,
    photoAttributions: Array.isArray(place.photoAttributions)
      ? place.photoAttributions
          .filter((attribution) => typeof attribution?.displayName === "string")
          .map((attribution) => {
            let uri = null;
            if (typeof attribution.uri === "string") {
              try {
                const parsedUrl = new URL(attribution.uri);
                if (parsedUrl.protocol === "https:" || parsedUrl.protocol === "http:") {
                  uri = parsedUrl.toString();
                }
              } catch {
                uri = null;
              }
            }
            return { displayName: attribution.displayName.slice(0, 200), uri };
          })
          .slice(0, 10)
      : [],
    note: typeof place.note === "string" ? place.note.trim().slice(0, 500) : "",
    url,
  };
}

function getPlaceKey(place) {
  return place.url || `${place.title}|${place.address}`;
}

function readStoredShortlist() {
  try {
    const saved = JSON.parse(localStorage.getItem(SHORTLIST_STORAGE_KEY) || "[]");
    if (!Array.isArray(saved)) return [];
    return saved.map(normalizePlace).filter(Boolean).slice(0, MAX_SHORTLIST_SIZE);
  } catch (error) {
    console.error("Could not read saved shortlist:", error);
    return [];
  }
}

function readSharedShortlist() {
  const token = new URLSearchParams(window.location.hash.slice(1)).get("shortlist");
  if (!token || token.length > 12000) return null;

  try {
    const encoded = token.replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(encoded + "=".repeat((4 - (encoded.length % 4)) % 4));
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    const data = JSON.parse(new TextDecoder().decode(bytes));
    if (!Array.isArray(data.places)) return null;

    const places = data.places
      .map(normalizePlace)
      .filter(Boolean)
      .slice(0, MAX_SHORTLIST_SIZE);
    if (!places.length) return null;

    return {
      city: typeof data.city === "string" ? data.city.slice(0, 100) : "",
      topic: typeof data.topic === "string" ? data.topic.slice(0, 100) : "",
      places,
    };
  } catch (error) {
    console.error("Could not read shared shortlist:", error);
    return null;
  }
}

function encodeSharedShortlist(data) {
  const bytes = new TextEncoder().encode(JSON.stringify(data));
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

const initialSharedShortlist = readSharedShortlist();

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
  const [hasSearched, setHasSearched] = useState(Boolean(initialSharedShortlist));
  const [lastQuery, setLastQuery] = useState(null);
  const [sharedShortlist, setSharedShortlist] = useState(initialSharedShortlist);
  const [shortlist, setShortlist] = useState(readStoredShortlist);
  const [shortlistOpen, setShortlistOpen] = useState(false);
  const [shortlistMessage, setShortlistMessage] = useState("");
  const [pendingSaveKey, setPendingSaveKey] = useState(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [editingNoteKey, setEditingNoteKey] = useState(null);
  const [confirmClearShortlist, setConfirmClearShortlist] = useState(false);
  const [activeResultsTab, setActiveResultsTab] = useState("places");
  const [placeSort, setPlaceSort] = useState("balanced");
  const [visibleWebCount, setVisibleWebCount] = useState(5);

  useEffect(() => {
    try {
      localStorage.setItem(SHORTLIST_STORAGE_KEY, JSON.stringify(shortlist));
    } catch (error) {
      console.error("Could not save shortlist:", error);
      setShortlistMessage("Could not save your shortlist in this browser.");
    }
  }, [shortlist]);

  const handleSearch = async (event) => {
    event.preventDefault();
    setLoading(true);
    setHasSearched(true);
    setSharedShortlist(null);
    setShortlistOpen(false);
    setShortlistMessage("");
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
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
      setShortlist((current) =>
        current.map((savedPlace) => {
          const matchingResult = searchResults.find(
            (result) =>
              result.photoName &&
              getPlaceKey(result) === getPlaceKey(savedPlace)
          );
          return matchingResult
            ? { ...normalizePlace(matchingResult), note: savedPlace.note }
            : savedPlace;
        })
      );
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

  const displayCity = sharedShortlist?.city || lastQuery?.city || city.trim();
  const displayTopic = sharedShortlist?.topic || lastQuery?.topic || topic.trim();

  const toggleShortlistPlace = (result) => {
    const place = normalizePlace(result);
    if (!place) {
      setShortlistMessage("This place can’t be added to your shortlist.");
      return;
    }

    const isSaved = shortlist.some((item) => getPlaceKey(item) === getPlaceKey(place));
    if (isSaved) {
      setShortlist((current) =>
        current.filter((item) => getPlaceKey(item) !== getPlaceKey(place))
      );
      setPendingSaveKey(null);
      setShortlistMessage(`${place.title} removed from your shortlist.`);
      return;
    }

    if (shortlist.length >= MAX_SHORTLIST_SIZE) {
      setShortlistMessage(`Your shortlist can have up to ${MAX_SHORTLIST_SIZE} places.`);
      return;
    }

    setNoteDraft("");
    setPendingSaveKey(getPlaceKey(place));
  };

  const savePlaceWithNote = (event, result) => {
    event.preventDefault();
    const place = normalizePlace({ ...result, note: noteDraft });
    if (!place) {
      setShortlistMessage("This place can’t be added to your shortlist.");
      return;
    }
    if (shortlist.length >= MAX_SHORTLIST_SIZE) {
      setShortlistMessage(`Your shortlist can have up to ${MAX_SHORTLIST_SIZE} places.`);
      setPendingSaveKey(null);
      return;
    }

    setShortlist((current) => [...current, place]);
    setPendingSaveKey(null);
    setNoteDraft("");
    setShortlistMessage(`${place.title} added to your shortlist.`);
  };

  const editPlaceNote = (place) => {
    setEditingNoteKey(getPlaceKey(place));
    setNoteDraft(place.note);
  };

  const saveEditedNote = (event, place) => {
    event.preventDefault();
    const placeKey = getPlaceKey(place);
    setShortlist((current) =>
      current.map((savedPlace) =>
        getPlaceKey(savedPlace) === placeKey
          ? { ...savedPlace, note: noteDraft.trim().slice(0, 500) }
          : savedPlace
      )
    );
    setEditingNoteKey(null);
    setNoteDraft("");
    setShortlistMessage(`Note updated for ${place.title}.`);
  };

  const moveShortlistPlace = (place, direction) => {
    setShortlist((current) => {
      const currentIndex = current.findIndex(
        (savedPlace) => getPlaceKey(savedPlace) === getPlaceKey(place)
      );
      const nextIndex = currentIndex + direction;
      if (currentIndex < 0 || nextIndex < 0 || nextIndex >= current.length) {
        return current;
      }

      const reordered = [...current];
      [reordered[currentIndex], reordered[nextIndex]] = [
        reordered[nextIndex],
        reordered[currentIndex],
      ];
      return reordered;
    });
  };

  const handleShareShortlist = async () => {
    if (!shortlist.length) {
      setShortlistMessage("Add a place before sharing your shortlist.");
      return;
    }

    const token = encodeSharedShortlist({
      city: displayCity,
      topic: displayTopic,
      places: shortlist.map(
        ({ source, title, address, rating, userRatingCount, url }) => ({
          source,
          title,
          address,
          rating,
          userRatingCount,
          url,
        })
      ),
    });
    const shareUrl = new URL(window.location.href);
    shareUrl.search = "";
    shareUrl.hash = `shortlist=${token}`;

    if (shareUrl.toString().length > 12000) {
      setShortlistMessage("This shortlist link is too long to share.");
      return;
    }

    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard access is unavailable in this browser.");
      }
      await navigator.clipboard.writeText(shareUrl.toString());
      setShortlistMessage("Share link copied.");
    } catch (error) {
      console.error("Could not copy shortlist link:", error);
      setShortlistMessage("Could not copy the share link. Check clipboard permissions.");
    }
  };

  const handleSaveSharedShortlist = () => {
    if (!sharedShortlist) return;

    const savedKeys = new Set(shortlist.map(getPlaceKey));
    const newPlaces = sharedShortlist.places.filter(
      (place) => !savedKeys.has(getPlaceKey(place))
    );
    const availableSlots = MAX_SHORTLIST_SIZE - shortlist.length;
    const addedPlaces = newPlaces.slice(0, availableSlots);

    setShortlist((current) => [...current, ...addedPlaces]);
    setShortlistMessage(
      addedPlaces.length
        ? `${addedPlaces.length} place${addedPlaces.length === 1 ? "" : "s"} saved to your shortlist.`
        : "Your shortlist already has these places or is full."
    );
  };

  const clearSharedShortlist = () => {
    setSharedShortlist(null);
    setHasSearched(false);
    setCity("");
    setTopic("");
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
  };

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

  const renderPlaceCard = (result, index, isShortlistCard = false) => {
    const photoUrl = result.photoName
      ? `${API_BASE_URL}/places-photo?name=${encodeURIComponent(result.photoName)}`
      : null;
    const savedPlace = shortlist.find(
      (place) => getPlaceKey(place) === getPlaceKey(result)
    );
    const isSaved = Boolean(savedPlace);
    const isWritingNote = pendingSaveKey === getPlaceKey(result) && !isSaved;
    const isEditingNote =
      isShortlistCard && editingNoteKey === getPlaceKey(result) && isSaved;
    const shortlistIndex = isShortlistCard
      ? shortlist.findIndex((place) => getPlaceKey(place) === getPlaceKey(result))
      : -1;

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
                <img className="rating-star" src={ratingStar} alt="" aria-hidden="true" />
                <span className="rating-score">{result.rating}</span>
              </div>
            )}
            <button
              type="button"
              className={`shortlist-toggle ${isSaved ? "saved" : ""}`}
              aria-pressed={isSaved}
              aria-label={`${isSaved ? "Remove" : "Save"} ${result.title} ${
                isSaved ? "from" : "to"
              } shortlist`}
              onClick={() => toggleShortlistPlace(result)}
            >
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <path d="M5 3.5h10v13l-5-3-5 3z" />
              </svg>
              <span>{isSaved ? "Saved" : "Save"}</span>
            </button>
            {isShortlistCard && (
              <div className="shortlist-card-controls" role="group" aria-label={`${result.title} shortlist controls`}>
                <button
                  type="button"
                  className="shortlist-order-button"
                  aria-label={`Move ${result.title} up`}
                  disabled={shortlistIndex <= 0}
                  onClick={() => moveShortlistPlace(result, -1)}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="shortlist-order-button"
                  aria-label={`Move ${result.title} down`}
                  disabled={shortlistIndex < 0 || shortlistIndex === shortlist.length - 1}
                  onClick={() => moveShortlistPlace(result, 1)}
                >
                  ↓
                </button>
              </div>
            )}
          </div>

          <h3>{result.title}</h3>
          <p className="result-address">{result.address}</p>
          {(result.note || savedPlace?.note) && (
            <p className="place-note">
              <strong>Your note:</strong> {result.note || savedPlace.note}
            </p>
          )}
          {isShortlistCard && !isEditingNote && (
            <button
              type="button"
              className="edit-note-button"
              onClick={() => editPlaceNote(savedPlace)}
            >
              {savedPlace.note ? "Edit note" : "Add a note"}
            </button>
          )}
          {isEditingNote && (
            <form
              className="place-note-form"
              onSubmit={(event) => saveEditedNote(event, savedPlace)}
            >
              <label htmlFor={`edit-note-${index}`}>Your note (optional)</label>
              <textarea
                id={`edit-note-${index}`}
                value={noteDraft}
                maxLength={500}
                rows={2}
                onChange={(event) => setNoteDraft(event.target.value)}
                placeholder="What would you like to remember?"
              />
              <div className="place-note-actions">
                <button type="submit" className="shortlist-primary-button">
                  Save note
                </button>
                <button
                  type="button"
                  className="shortlist-secondary-button"
                  onClick={() => {
                    setEditingNoteKey(null);
                    setNoteDraft("");
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {isWritingNote && (
            <form
              className="place-note-form"
              onSubmit={(event) => savePlaceWithNote(event, result)}
            >
              <label htmlFor={`place-note-${index}`}>Add a note (optional)</label>
              <textarea
                id={`place-note-${index}`}
                value={noteDraft}
                maxLength={500}
                rows={2}
                onChange={(event) => setNoteDraft(event.target.value)}
                placeholder="What would you like to remember?"
              />
              <div className="place-note-actions">
                <button type="submit" className="shortlist-primary-button">
                  Save place
                </button>
                <button
                  type="button"
                  className="shortlist-secondary-button"
                  onClick={() => {
                    setPendingSaveKey(null);
                    setNoteDraft("");
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

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
          {!hasSearched && shortlist.length > 0 && (
            <button
              type="button"
              className="shortlist-open-button landing-shortlist-button"
              aria-expanded={shortlistOpen}
              onClick={() => {
                setHasSearched(true);
                setShortlistOpen(true);
              }}
            >
              Shortlist ({shortlist.length})
            </button>
          )}
        </header>

        <main className="results-section">
          {sharedShortlist && (
            <section className="shared-shortlist-view" aria-labelledby="shared-shortlist-heading">
              <div className="shortlist-heading">
                <h1 id="shared-shortlist-heading">
                  {displayTopic ? `${displayTopic} in ${displayCity}` : "Shared shortlist"}
                </h1>
                <button
                  type="button"
                  className="shortlist-secondary-button"
                  onClick={clearSharedShortlist}
                >
                  Search again
                </button>
              </div>
              <h2>Shared shortlist</h2>
              <div className="result-grid">
                {sharedShortlist.places.map((place, index) =>
                  renderPlaceCard(place, index)
                )}
              </div>
              <div className="shortlist-actions">
                <button
                  type="button"
                  className="shortlist-primary-button"
                  onClick={handleSaveSharedShortlist}
                >
                  Save this list
                </button>
                {shortlistMessage && (
                  <p className="shortlist-message" role="status">
                    {shortlistMessage}
                  </p>
                )}
              </div>
            </section>
          )}

          {shortlistOpen && !sharedShortlist && (
            <section
              id="shortlist-panel"
              className="shortlist-panel"
              aria-labelledby="shortlist-heading"
            >
              <div className="shortlist-heading">
                <h2 id="shortlist-heading">Your shortlist</h2>
                <div className="shortlist-actions">
                  <button
                    type="button"
                    className="shortlist-primary-button"
                    onClick={handleShareShortlist}
                    disabled={!shortlist.length}
                  >
                    Copy share link
                  </button>
                  {shortlist.length > 0 && (
                    <button
                      type="button"
                      className="shortlist-secondary-button"
                      onClick={() => setConfirmClearShortlist(true)}
                    >
                      Clear
                    </button>
                  )}
                  <button
                    type="button"
                    className="shortlist-secondary-button"
                    onClick={() => {
                      setShortlistOpen(false);
                      if (!results.length) setHasSearched(false);
                    }}
                  >
                    Close
                  </button>
                </div>
              </div>
              {confirmClearShortlist && (
                <div className="shortlist-clear-confirmation" role="group" aria-label="Confirm clearing shortlist">
                  <p>Clear all {shortlist.length} saved places?</p>
                  <button
                    type="button"
                    className="shortlist-danger-button"
                    onClick={() => {
                      setShortlist([]);
                      setConfirmClearShortlist(false);
                      setEditingNoteKey(null);
                      setShortlistMessage("Shortlist cleared.");
                    }}
                  >
                    Clear shortlist
                  </button>
                  <button
                    type="button"
                    className="shortlist-secondary-button"
                    onClick={() => setConfirmClearShortlist(false)}
                  >
                    Cancel
                  </button>
                </div>
              )}
              {shortlist.length ? (
                <div className="shortlist-grid">
                  {shortlist.map((place, index) => renderPlaceCard(place, index, true))}
                </div>
              ) : (
                <p className="shortlist-empty">Save up to 5 places to make a list.</p>
              )}
              {shortlistMessage && (
                <p className="shortlist-message" role="status">
                  {shortlistMessage}
                </p>
              )}
            </section>
          )}

          {!sharedShortlist && (
            <>
              {loading && (
                <p className="loading-message">Finding great local spots…</p>
              )}

              {errorMessage && (
                <div className="empty-state" role="alert">
                  <h2>Something went wrong</h2>
                  <p>{errorMessage}</p>
                </div>
              )}

              {hasSearched &&
                !loading &&
                results.length === 0 &&
                !errorMessage &&
                !shortlistOpen && (
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

                <div className="summary-actions">
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
                  <button
                    type="button"
                    className="shortlist-open-button"
                    aria-expanded={shortlistOpen}
                    onClick={() => setShortlistOpen((open) => !open)}
                  >
                    Shortlist ({shortlist.length})
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
