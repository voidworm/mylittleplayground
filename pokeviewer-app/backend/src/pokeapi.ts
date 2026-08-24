const BASE_URL = process.env.POKEAPI_BASE_URL ?? "http://pokeapi-pokeapi.pokeapi.svc.cluster.local";

interface EvolutionChainLink {
  species: { name: string; url: string };
  evolves_to: EvolutionChainLink[];
}

interface EvolutionChainResponse {
  chain: EvolutionChainLink;
}

interface SpeciesResponse {
  flavor_text_entries: Array<{
    flavor_text: string;
    language: { name: string };
  }>;
  evolution_chain: { url: string };
}

interface PokemonResponse {
  id: number;
  name: string;
  sprites: { front_default: string | null };
  types: Array<{ slot: number; type: { name: string } }>;
}

const SPRITE_FALLBACK_BASE =
  "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon";

export interface PokemonResult {
  name: string;
  sprite: string | null;
  description: string;
  types: string[];
  evolvesFrom: string | null;
  evolvesInto: string[];
}

export class PokemonNotFoundError extends Error {}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (res.status === 404) {
    throw new PokemonNotFoundError(`Not found: ${url}`);
  }
  if (!res.ok) {
    throw new Error(`Request to ${url} failed with status ${res.status}`);
  }
  return res.json() as Promise<T>;
}

function extractIdFromUrl(url: string): string {
  const match = url.match(/\/(\d+)\/?$/);
  if (!match) {
    throw new Error(`Could not extract id from url: ${url}`);
  }
  return match[1];
}

interface ChainLookup {
  node: EvolutionChainLink;
  parent: EvolutionChainLink | null;
}

function findChainNode(
  link: EvolutionChainLink,
  name: string,
  parent: EvolutionChainLink | null = null
): ChainLookup | null {
  if (link.species.name === name) {
    return { node: link, parent };
  }
  for (const child of link.evolves_to) {
    const found = findChainNode(child, name, link);
    if (found) {
      return found;
    }
  }
  return null;
}

function collectDescendantNames(link: EvolutionChainLink): string[] {
  const names: string[] = [];
  for (const child of link.evolves_to) {
    names.push(child.species.name);
    names.push(...collectDescendantNames(child));
  }
  return names;
}

function pickEnglishDescription(species: SpeciesResponse): string {
  const entry = species.flavor_text_entries.find((e) => e.language.name === "en");
  if (!entry) {
    return "No description available.";
  }
  return entry.flavor_text.replace(/[\n\f\r]+/g, " ");
}

export async function lookupPokemon(name: string): Promise<PokemonResult> {
  const normalized = name.trim().toLowerCase();

  const [pokemon, species] = await Promise.all([
    fetchJson<PokemonResponse>(`${BASE_URL}/api/v2/pokemon/${normalized}/`),
    fetchJson<SpeciesResponse>(`${BASE_URL}/api/v2/pokemon-species/${normalized}/`),
  ]);

  const chainId = extractIdFromUrl(species.evolution_chain.url);
  const evolutionChain = await fetchJson<EvolutionChainResponse>(
    `${BASE_URL}/api/v2/evolution-chain/${chainId}/`
  );

  const found = findChainNode(evolutionChain.chain, normalized);
  const evolvesInto = found ? collectDescendantNames(found.node) : [];
  const evolvesFrom = found?.parent ? found.parent.species.name : null;

  return {
    name: pokemon.name,
    sprite: pokemon.sprites.front_default ?? `${SPRITE_FALLBACK_BASE}/${pokemon.id}.png`,
    description: pickEnglishDescription(species),
    types: pokemon.types.sort((a, b) => a.slot - b.slot).map((t) => t.type.name),
    evolvesFrom,
    evolvesInto,
  };
}
