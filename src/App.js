import React, { useState } from "react";
import axios from "axios";

const TMDB_API_KEY = "3bd05e94810ab2aa2cb507b16ee838e7";

const sexualKeywords = [
  "sex", "sexual", "nudity", "bedroom", "intimate", "seduce", "erotic",
  "explicit", "adult", "affair", "strip", "provocative", "rape",
  "orgy", "orgasm", "seduction"
];

const adultRatings = ["TV-MA", "R", "NC-17", "18+", "X"];

const App = () => {
  const [input, setInput] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedResult, setSelectedResult] = useState(null);
  const [episodeWarnings, setEpisodeWarnings] = useState([]);
  const [streamingPlatforms, setStreamingPlatforms] = useState([]);
  const [darkMode, setDarkMode] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    setSelectedResult(null);
    setEpisodeWarnings([]);
    setStreamingPlatforms([]);
    if (!input) return;
    try {
      setLoading(true);
      const searchRes = await axios.get(
        `https://api.themoviedb.org/3/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(
          input
        )}`
      );
      const topResults = searchRes.data.results.slice(0, 5);
      setSearchResults(topResults);
    } catch (error) {
      console.error("Search error:", error);
      alert("Error fetching data from TMDb");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectResult = async (item) => {
    setSelectedResult(null);
    setEpisodeWarnings([]);
    setStreamingPlatforms([]);
    try {
      setLoading(true);
      const isTV = item.media_type === "tv";
      const id = item.id;

      const details = await axios.get(
        `https://api.themoviedb.org/3/${isTV ? "tv" : "movie"}/${id}?api_key=${TMDB_API_KEY}`
      );
      const metadata = details.data;

      // Fetch content ratings for TV shows or movies
      const ratingsRes = await axios.get(
        `https://api.themoviedb.org/3/${isTV ? "tv" : "movie"}/${id}/content_ratings?api_key=${TMDB_API_KEY}`
      );
      const ratings = ratingsRes.data.results || [];

      // Check for adult ratings
      const hasAdultRating = ratings.some((r) =>
        adultRatings.includes(r.rating)
      );

      // Check overview keywords
      const overviewText = (metadata.overview || "").toLowerCase();
      const overviewHasSexualContent = sexualKeywords.some((kw) =>
        overviewText.includes(kw)
      );

      // Combine
      let hasSexualContent = hasAdultRating || overviewHasSexualContent;

      let episodeWarningsArr = [];
      if (isTV) {
        episodeWarningsArr = await fetchEpisodeWarnings(id, metadata.number_of_seasons);
        // If any episode has sexual content, mark overall as sexual content
        if (episodeWarningsArr.length > 0) {
          hasSexualContent = true;
        }
      }

      // Fetch watch providers info
      const providersRes = await axios.get(
        `https://api.themoviedb.org/3/${isTV ? "tv" : "movie"}/${id}/watch/providers?api_key=${TMDB_API_KEY}`
      );

      const providersData = providersRes.data.results || {};

      // Change country code as needed, e.g. "US", "AU"
      const countryCode = "US";

      const countryProviders = providersData[countryCode];
      let streamingList = [];
      if (countryProviders && countryProviders.flatrate) {
        streamingList = countryProviders.flatrate.map(p => p.provider_name);
      }

      setStreamingPlatforms(streamingList);

      setSelectedResult({
        ...metadata,
        type: isTV ? "tv" : "movie",
        sexualContent: hasSexualContent,
        ratings,
      });

      setEpisodeWarnings(episodeWarningsArr);
    } catch (error) {
      console.error("Details fetch error:", error);
      alert("Failed to fetch details");
    } finally {
      setLoading(false);
    }
  };

  const fetchEpisodeWarnings = async (showId, totalSeasons) => {
    const warnings = [];
    for (let season = 1; season <= totalSeasons; season++) {
      try {
        const seasonRes = await axios.get(
          `https://api.themoviedb.org/3/tv/${showId}/season/${season}?api_key=${TMDB_API_KEY}`
        );
        const episodes = seasonRes.data.episodes;

        episodes.forEach((ep) => {
          const desc = (ep.overview || "").toLowerCase();
          const flag = sexualKeywords.some((kw) => desc.includes(kw));
          if (flag) {
            warnings.push({
              season,
              episode: ep.episode_number,
              name: ep.name,
              overview: ep.overview,
            });
          }
        });
      } catch (err) {
        console.warn(`Failed to fetch season ${season}`, err);
      }
    }
    return warnings;
  };

  const getOfficialRatingsText = () => {
    if (!selectedResult || !selectedResult.ratings) return null;
    if (selectedResult.ratings.length === 0) return "No official rating found";
    return selectedResult.ratings
      .map((r) => `${r.iso_3166_1}: ${r.rating}`)
      .join(" | ");
  };

  return (
    <div
      style={{
        padding: "2rem",
        fontFamily: "Arial",
        background: darkMode ? "#1e1e1e" : "#f5f5f5",
        color: darkMode ? "#f5f5f5" : "#1e1e1e",
        minHeight: "100vh",
      }}
    >
      <h1>🎬 Family-Safe Content Checker</h1>

      <button
        onClick={() => setDarkMode(!darkMode)}
        style={{ marginBottom: "1rem" }}
      >
        {darkMode ? "☀️ Light Mode" : "🌙 Dark Mode"}
      </button>

      <div>
        <input
          type="text"
          placeholder="Enter movie or series name..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          style={{ padding: "0.5rem", width: "60%", marginRight: "0.5rem" }}
        />
        <button onClick={handleSearch}>Check Content</button>
      </div>

      {loading && <p>Loading...</p>}

      {searchResults.length > 0 && (
        <div style={{ marginTop: "1rem" }}>
          <h3>Select a result:</h3>
          <ul>
            {searchResults.map((item) => (
              <li
                key={item.id}
                onClick={() => handleSelectResult(item)}
                style={{
                  cursor: "pointer",
                  padding: "0.5rem",
                  border: "1px solid",
                  marginBottom: "0.5rem",
                  background: darkMode ? "#333" : "#fff",
                }}
              >
                {item.name || item.title} ({item.media_type})
              </li>
            ))}
          </ul>
        </div>
      )}

      {selectedResult && (
        <div style={{ marginTop: "2rem" }}>
          <h2>{selectedResult.name || selectedResult.title}</h2>
          <p>
            <strong>Overview:</strong> {selectedResult.overview}
          </p>

          <p>
            <strong>Official Ratings:</strong>{" "}
            <em>{getOfficialRatingsText() || "N/A"}</em>
          </p>

          <p>
            <strong>Family Safety:</strong>{" "}
            {selectedResult.sexualContent ? (
              <span style={{ background: "#ffcccc", padding: "4px" }}>
                ❌ Not Family Safe
              </span>
            ) : (
              <span style={{ background: "#ccffcc", padding: "4px" }}>
                ✅ Family Friendly
              </span>
            )}
          </p>

          {streamingPlatforms.length > 0 && (
            <p>
              <strong>Available on:</strong> {streamingPlatforms.join(", ")}
            </p>
          )}

          {episodeWarnings.length > 0 && (
            <div style={{ marginTop: "1rem" }}>
              <h3>⚠️ Episode Warnings</h3>
              {episodeWarnings.map((ep, index) => (
                <div
                  key={index}
                  style={{ borderBottom: "1px solid gray", padding: "0.5rem 0" }}
                >
                  <strong>
                    Season {ep.season}, Episode {ep.episode}:
                  </strong>{" "}
                  {ep.name}
                  <p>{ep.overview}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default App;
