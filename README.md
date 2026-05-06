# MTG Pack Opener

MTG Pack Opener is a React app for opening simulated Magic: The Gathering packs in the browser. The app uses real set and card data from Scryfall, then presents a dark, cinematic pack selection, cutting, and one-card-at-a-time reveal flow.

## User Goal

The goal is to let a user choose a Magic set, open a simulated booster pack, reveal cards one at a time, and build a local collection of opened cards.

## Features

- Browse real Magic expansion and core sets from Scryfall
- Search sets by name or code
- Select a set and choose from simulated Play Booster packs in a 3D spinning carousel
- Sealed booster wrapper previews using Scryfall art card images when available
- Pack cutting animation before the card reveal starts
- Full-screen pack opening reveal experience
- Swipe, click, button, and keyboard controls for advancing cards
- Foil shimmer effect for simulated foil cards
- Pack summary grid after all cards are revealed
- Save opened cards to a local collection after the full pack reveal
- Collection search, rarity filter, set filter, sorting, duplicate counts, and card detail dialog
- Mobile-friendly responsive layouts
- Custom dark Magic-inspired Material UI theme

## Tech Stack

- React
- Vite
- React Router
- Material UI
- Emotion
- MUI Icons
- Framer Motion
- Scryfall API
- localStorage

## Routes

- `/` - Home
- `/sets` - Set selection
- `/packs/:setCode` - Pack selection for a selected set
- `/open/:setCode` - Pack cutting and full-screen card reveal
- `/collection` - Saved card collection

## API Used

This app uses the public Scryfall API for Magic set and card data.

Scryfall API documentation: https://scryfall.com/docs/api

## Scryfall Endpoints Used

- `/sets`
  - Used to load real Magic sets.
  - The app filters to useful pack-opening set types such as expansion and core sets.

- `/cards/search`
  - Used to load cards by set.
  - Used to load art cards for pack wrapper previews.
  - Used by the pack generator to build simulated booster contents.
  - Used with `unique=prints` so set-specific printings are available.

Example card search:

```text
https://api.scryfall.com/cards/search?q=set:dmu&unique=prints
```

Example art card search:

```text
https://api.scryfall.com/cards/search?q=set:dmu type:art include:extras&unique=prints
```

## Setup

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Then open the local URL Vite prints in the terminal, usually:

```text
http://localhost:5173
```

Build for production:

```bash
npm run build
```

## How Pack Generation Works

Pack generation is implemented in `src/utils/packGenerator.js`.

When a user opens a pack, the app:

1. Reads the `setCode` from the route.
2. Fetches cards from Scryfall for that set.
3. Separates cards into approximate rarity buckets.
4. Selects commons, uncommons, a land, a wildcard, and a rare or mythic.
5. Randomly marks some cards as foil for the visual foil effect.
6. Sorts the pack reveal order so commons appear first and rare, mythic, or foil cards appear near the end.

This is an approximation, not official Magic booster collation.

## How Collection Saving Works

Collection storage is implemented in `src/utils/collectionStorage.js`.

The collection uses browser `localStorage`. Cards are saved only after the user finishes revealing the full pack. Each saved card copy gets its own unique `collectionId`, so duplicates are allowed and tracked individually.

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
- `openedAt`

Token and art cards are not saved to the collection.

## Material UI Usage

Material UI is used for the app shell, layout, cards, forms, dialogs, alerts, buttons, loading states, and responsive design.

Examples of MUI components used:

- `AppBar`
- `Toolbar`
- `Container`
- `Box`
- `Button`
- `Card`
- `CardContent`
- `Typography`
- `CircularProgress`
- `Skeleton`
- `Alert`
- `Snackbar`
- `Dialog`
- `TextField`
- `Select`

The app also defines a custom dark MTG-inspired MUI theme with deep navy/black backgrounds, purple, blue, and gold accents, rounded cards, and glow effects.

## Known Limitations

- Scryfall does not provide official sealed booster pack images, so pack art is simulated using card art.
- Pack odds are approximate for demo purposes.
- Collection uses localStorage, so it is browser-specific.
- Some sets may not have enough cards in every rarity, so fallback logic is used.
- The app does not currently use user accounts or cloud saving.
- Pack collation is not yet accurate to individual set rules.

## Challenges Faced

- Scryfall provides card data, but not sealed booster product images, so pack visuals had to be simulated from card artwork.
- Double-faced cards can store images differently from normal cards, so the API layer handles both `image_uris` and `card_faces[0].image_uris`.
- Some token cards live in separate token set codes, so token lookup needs fallback behavior.
- Real Magic sets vary in structure, rarity distribution, and card availability, which makes generic pack generation approximate.
- The collection needed to allow duplicate copies while still remaining easy to browse.
- The pack reveal flow needed to balance animation, touch interaction, keyboard fallback, and readable card display across screen sizes.

## Future Improvements

- More accurate pack collation by set
- Collector boosters
- User accounts
- Binder view
- Card detail pages
- Better duplicate tracking
- More advanced animations
