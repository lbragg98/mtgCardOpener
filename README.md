# MTG Pack Opener

MTG Pack Opener is a browser-based React app for opening simulated Magic: The Gathering booster packs. It pulls real set and card data from Scryfall, then turns that data into a cinematic pack selection, cutting, reveal, and collection-building experience.

## What You Can Do

- Browse real Magic expansion and core sets from Scryfall
- Search sets by name or set code
- Choose Play Boosters or Collector Boosters
- Preview sealed booster wrappers with set branding and Scryfall art-card imagery when available
- Open packs through a cutting animation and full-screen card reveal flow
- Advance cards with click, swipe, button, and keyboard controls
- See foil treatments such as rainbow, etched, galaxy, gilded, and textured foils
- Review the full pack summary after every reveal
- Save opened cards into a local collection
- Search, filter, sort, and inspect saved cards
- Track duplicate cards and earn pack shards from duplicate pulls

## Tech Stack

- React 19
- Vite 8
- React Router 7
- Material UI 9
- Emotion
- MUI Icons
- Framer Motion
- Scryfall API
- Browser `localStorage`

## Getting Started

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Vite will print the local URL in the terminal. It is usually:

```text
http://localhost:5173
```

Create a production build:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

## App Routes

- `/` - Home
- `/sets` - Magic set selection
- `/packs/:setCode` - Booster selection for the chosen set
- `/open/:setCode` - Pack cutting and card reveal
- `/collection` - Saved card collection

Unknown routes redirect back to `/`.

## Project Structure

```text
src/
  api/
    scryfall.js              Scryfall fetching and response normalization
  components/
    CardImage.jsx            Reusable card image rendering
    Layout.jsx               Shared app shell
    PackCard.jsx             Booster option UI
    PageHeader.jsx           Shared page heading
    SealedPack.jsx           Simulated sealed booster wrapper
  pages/
    Collection.jsx           Saved collection browser
    Home.jsx                 Landing screen
    PackOpening.jsx          Pack cutting and reveal flow
    PackSelection.jsx        Booster type selection
    SetSelection.jsx         Set browser
  theme/
    mtgTheme.js              Custom dark Material UI theme
  utils/
    collectionStorage.js     Collection, duplicate, and shard persistence
    foilTypes.js             Foil treatment constants and normalization
    packArt.js               Pack wrapper artwork helpers
    packGenerator.js         Play and collector booster generation
```

## Scryfall API

This app uses the public Scryfall API for Magic set and card data.

Documentation: https://scryfall.com/docs/api

Main endpoints used:

- `/sets`
  - Loads real Magic sets.
  - The app filters to supported set types, currently expansion and core sets.

- `/cards/search`
  - Loads set-specific card printings.
  - Loads art cards for simulated pack wrapper art.
  - Supports rarity, land, token, and booster generation queries.
  - Uses `unique=prints` so set-specific versions are available.

Example card search:

```text
https://api.scryfall.com/cards/search?q=set:dmu&unique=prints
```

Example art-card search:

```text
https://api.scryfall.com/cards/search?q=set:dmu type:art include:extras&unique=prints
```

## Pack Generation

Pack generation lives in `src/utils/packGenerator.js`.

When a user opens a pack, the app:

1. Reads the `setCode` from the current route.
2. Fetches all usable card images for that set from Scryfall.
3. Splits cards into rarity and land pools.
4. Builds a 15-card pack from rarity-based slots.
5. Applies randomized foil status and foil treatment metadata.
6. Sorts the reveal order so the most exciting cards appear later.

Play Boosters are approximated with commons, uncommons, a land, a wildcard, and a rare or mythic slot. Collector Boosters are approximated with higher foil density, more rare or mythic slots, and premium foil treatment odds.

This is a simulation for a web app, not official Wizards of the Coast booster collation.

## Collection Storage

Collection persistence lives in `src/utils/collectionStorage.js`.

The app saves collection data in browser `localStorage`, so the collection is tied to the current browser and device. Cards are saved only after the user finishes revealing the full pack.

Each saved card includes:

- `collectionId`
- `id`
- `name`
- `rarity`
- `imageUrl`
- `set`
- `set_name`
- `collector_number`
- `isFoil`
- `foilTreatment`
- `openedAt`

Token cards and art-series cards are not saved to the collection. Duplicate real cards are allowed, and duplicate pulls can award pack shards.

## Design Notes

The app uses a custom dark Material UI theme inspired by Magic pack-opening interfaces. It leans on deep backgrounds, high-contrast card surfaces, glow accents, responsive layouts, and motion-driven reveal states.

`SealedPack.jsx` creates the simulated booster wrapper from layered DOM elements and CSS instead of relying on official sealed product images, which Scryfall does not provide.

## Known Limitations

- Scryfall does not provide official sealed booster pack images, so wrapper art is simulated.
- Booster contents are approximate and do not follow individual set collation rules.
- Some older or unusual sets may have limited card image coverage.
- Collection and pack shard data are browser-specific because they use `localStorage`.
- There are no user accounts or cloud sync.
- The app depends on Scryfall availability and network access.

## Future Improvements

- More accurate collation by set and booster product
- Additional booster types
- Binder-style collection view
- Cloud save or account support
- Card detail pages with richer Scryfall metadata
- More collection analytics
- More advanced pack-opening animations
