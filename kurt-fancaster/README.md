# The Adventures of Kurt Fancaster

A free, unofficial, noncommercial 16-bit-style anthology game about an impossibly athletic fictional movie star.

Each reel is intended to be a different kind of small arcade game, with its own costume, palette, controls, and central mechanic. The shared frame is the projection-room level selector and the recurring character of Kurt Fancaster.

## First prototype

The first playable reel is **The Swimmer**, a Frogger-like pool-hopping game:

- Move between suburban pools.
- Avoid traffic.
- Restore Kurt's Comfort meter by staying in water.
- Reach the pool at the top of the neighborhood.
- Play with keyboard or touch controls.

The reel selector also includes non-playable placeholders for an acrobatic privateer platformer and a top-down noir pursuit game, demonstrating that the project is structured as an anthology rather than a single scrolling platformer.

## Architecture

This initial version deliberately uses plain HTML, CSS, JavaScript, and Phaser from a pinned CDN release. It requires no build step and can be deployed by the repository's existing static Vercel configuration.

- `index.html`: page shell and accessible touch controls
- `styles.css`: responsive presentation and control styling
- `game.js`: shared scene framework, level registry, costume registry, and first playable reel

The `LEVELS` registry determines each reel's scene, game type, costume, and availability. The `COSTUMES` registry gives every reel a distinct Kurt sprite configuration.

## Run locally

Serve the repository with any static HTTP server, then open `/kurt-fancaster/`.

For example:

```bash
python -m http.server 8000
```

Then visit `http://localhost:8000/kurt-fancaster/`.

## Rights and attribution

This project is an original parody and tribute. It is not affiliated with or endorsed by Burt Lancaster's estate, any motion-picture studio, or any rights holder. It uses no film footage, stills, dialogue, music, logos, traced artwork, or recreated scenes.
