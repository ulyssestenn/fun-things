# The Adventures of Kurt Fancaster

A free, unofficial, noncommercial cinematic pixel-art anthology game about an impossibly athletic fictional movie star.

The visual direction draws on early-1990s VGA adventure games: crisp integer-scaled pixels, composed illustrated environments, limited palettes, dark outlines, selective dithering, and readable human characters. The game does not copy any existing game's assets, characters, writing, scenes, or interface.

Each reel is intended to be a different kind of small arcade game, with its own costume, palette, controls, and central mechanic. The shared frame is the projection-room level selector and the recurring character of Kurt Fancaster.

## First prototype

The first playable reel is **The Swimmer**, a pool-hopping suburban yard game:

- Move from pool to pool, where Kurt is safe and restores his Comfort meter.
- Cross lawns rather than roads.
- Dodge enthusiastic dogs, roaming cats, lawn mowers, and territorial geese.
- Reach the finish pool at the top of the neighborhood.
- Play with keyboard or touch controls.

The reel selector also includes non-playable placeholders for an acrobatic privateer platformer and a top-down noir pursuit game, demonstrating that the project is structured as an anthology rather than a single scrolling platformer.

## Rendering

The game uses a 320 × 200 internal canvas and displays it at exact 1×, 2×, or 3× sizes. Avoiding fractional enlargement keeps pixel edges sharp and prevents the browser from unevenly resampling the artwork.

## Architecture

This version deliberately uses plain HTML, CSS, JavaScript, and Phaser from a pinned CDN release. It requires no build step and can be deployed by the repository's existing static Vercel configuration.

- `index.html`: page shell and accessible touch controls
- `styles.css`: responsive integer-scaled presentation and control styling
- `game.js`: shared game data, input, procedural sprites, and base scene utilities
- `scenes.js`: cinematic title and projection-room scenes
- `swimmer.js`: the first playable reel and game initialization

The `LEVELS` registry determines each reel's scene, game type, costume, and availability. The `COSTUMES` registry gives every reel a distinct Kurt sprite configuration.

## Run locally

Serve the repository with any static HTTP server, then open `/kurt-fancaster/`.

For example:

```bash
python -m http.server 8000
```

Then visit `http://localhost:8000/kurt-fancaster/`.

## Rights and attribution

This project is an original parody and tribute. It is not affiliated with or endorsed by Burt Lancaster's estate, any motion-picture studio, Sierra, or any other game publisher or rights holder. It uses no film footage, stills, dialogue, music, logos, traced artwork, recreated game screens, or copied game assets.
