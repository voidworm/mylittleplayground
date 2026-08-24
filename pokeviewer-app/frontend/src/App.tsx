import { useState, FormEvent } from "react";

interface PokemonResult {
  name: string;
  sprite: string | null;
  description: string;
  types: string[];
  evolvesFrom: string | null;
  evolvesInto: string[];
}

const API_BASE = import.meta.env.BASE_URL;

function App() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<PokemonResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function search(name: string) {
    const normalized = name.trim().toLowerCase();
    if (!normalized) {
      return;
    }

    setQuery(normalized);
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(`${API_BASE}api/pokemon/${normalized}`);
      if (!res.ok) {
        throw new Error(res.status === 404 ? "Pokemon not found" : "Something went wrong");
      }
      const data: PokemonResult = await res.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    search(query);
  }

  return (
    <div className="app">
      <h1>Pokeviewer</h1>
      <form onSubmit={handleSubmit}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter a pokemon name..."
        />
        <button type="submit" disabled={loading}>
          {loading ? "Searching..." : "Search"}
        </button>
      </form>

      {error && <p className="error">{error}</p>}

      {result && (
        <div className="result">
          <h2>{result.name}</h2>
          {result.sprite && <img src={result.sprite} alt={result.name} />}

          <div className="types">
            {result.types.map((type) => (
              <span key={type} className={`chip type-${type}`}>
                {type}
              </span>
            ))}
          </div>

          <p className="description">{result.description}</p>

          <div className="evolutions">
            <h3>Evolves from</h3>
            {result.evolvesFrom ? (
              <button className="chip link" onClick={() => search(result.evolvesFrom!)}>
                {result.evolvesFrom}
              </button>
            ) : (
              <p>This is a base form.</p>
            )}
          </div>

          <div className="evolutions">
            <h3>Evolves into</h3>
            {result.evolvesInto.length > 0 ? (
              <div className="chip-list">
                {result.evolvesInto.map((name) => (
                  <button key={name} className="chip link" onClick={() => search(name)}>
                    {name}
                  </button>
                ))}
              </div>
            ) : (
              <p>Does not evolve further.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
