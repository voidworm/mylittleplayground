import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { lookupPokemon, PokemonNotFoundError } from "./pokeapi.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, "public");
const PORT = process.env.PORT ?? 3000;

const app = express();
const router = express.Router();

router.get("/api/pokemon/:name", async (req, res) => {
  try {
    const result = await lookupPokemon(req.params.name);
    res.json(result);
  } catch (err) {
    if (err instanceof PokemonNotFoundError) {
      res.status(404).json({ error: "Pokemon not found" });
      return;
    }
    console.error(err);
    res.status(502).json({ error: "Failed to reach PokeAPI" });
  }
});

router.use(express.static(PUBLIC_DIR));
router.get("*", (_req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "index.html"));
});

// Mounted at both paths so the app works standalone (root) and behind an
// ingress that strips the /pokedex prefix before forwarding here.
// The prefixed mount must come first, since the root mount would otherwise
// match /pokedex/* requests too and serve index.html for asset paths.
app.use("/pokedex", router);
app.use(router);

app.listen(PORT, () => {
  console.log(`pokeviewer backend listening on port ${PORT}`);
});
