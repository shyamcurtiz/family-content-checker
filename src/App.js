import React, { useState } from "react";
import axios from "axios";
import "./App.css";

const TMDB_API_KEY = "3bd05e94810ab2aa2cb507b16ee838e7"; // Replace this with your TMDb API key

const App = () => {
  const [input, setInput] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedResult, setSelectedResult] = useState(null);
  const [episodeWarnings, setEpisodeWarnings] = useState([]);
  const [darkMode, setDarkMode] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    setSelectedResult(null);
    setEpisodeWarnings([]);
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
    try {
      setLoading(true);
      const isTV = item.media_type === "tv";
      const id = item.id;

      const details = await axios.get(
        `https://api.themoviedb.org/3/${isTV ? "tv" : "movie"}/${id}?api_key=${TMDB_API_KEY}`
      );

      const metadata = details.data;
      const description =
        metadata.overview?.toLowerCase() || "";

      const sexualKeywords = [
        "nudity",
        "sexual",
        "sex scene",
        "intercourse",
        "adult",
        "intimate",
        "provocative",
        "bedroom",
        "explicit",
        "graphic"
      ];

      const hasSexualContent = sexualKeywords.some((kw) =>
        description.includes(kw)
      );

      setSelectedResult({
        ...metadata,
        type: isTV ? "tv" : "movie",
        sexualContent: hasSexualContent
      });

      if (isTV) {
        const warnings = await fetchEpisodeWarnings(id, metadata.number_of_seasons);
        setEpisodeWarnings(warnings);
      }
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
          const desc = ep.overview?.toLowerCase() || "";
          const flag = /sex|nudity|adult|explicit/i.test(desc);
          if (flag) {
            warnings.push({
              season,
              episode: ep.episode_number,
              name: ep.name,
              overview: ep.overview
            });
          }
        });
      } catch (err) {
        console.warn(`Failed to fetch season ${season}`);
      }
    }
    return warnings;
  };

  return (
    <div
      style={{
        padding: "2rem",
        fontFamily: "Arial",
        background: darkMode ? "#1e1e1e" : "#f5f5f5",
        color: darkMode ? "#f5f5f5" : "#1e1e1e",
        minHeight: "100vh"
      }}
    >
      <h1>🎬 Family-Safe Content Checker</h1>

      <button onClick={() => setDarkMode(!darkMode)} style={{ marginBottom: "1rem" }}>
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
                  background: darkMode ? "#333" : "#fff"
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
          <p><strong>Overview:</strong> {selectedResult.overview}</p>

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

          {episodeWarnings.length > 0 && (
            <div style={{ marginTop: "1rem" }}>
              <h3>⚠️ Episode Warnings</h3>
              {episodeWarnings.map((ep, index) => (
                <div key={index} style={{ borderBottom: "1px solid gray", padding: "0.5rem 0" }}>
                  <strong>Season {ep.season}, Episode {ep.episode}:</strong> {ep.name}
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
