# MTG Pack Opener
App Available at https://mtgcardopener.vercel.app
MTG Pack Opener is a React app for opening simulated Magic: The Gathering packs with real card data from the Scryfall API. Users can choose sets, open Play Boosters or Collector Boosters, reveal cards through an interactive pack-opening flow, save pulls to a collection, inspect foil treatments, recycle duplicates for Pack Shards, buy cosmetics, organize binders, trade with friends, and play a simplified collection-based battle mode.

The project is built as an interactive collecting experience for MTG players, collectors, and fans of digital pack openings. It turns public card data into a polished app with account storage, collection management, visual effects, and lightweight game systems.

## Core Purpose and Audience

This app is designed for people who enjoy Magic cards, collecting, and the excitement of opening packs. It is not a replacement for official Magic products or rules software. Instead, it uses real API data to create a fun browser-based collection simulator with modern UI, motion, and social features.

The target audience includes:

- MTG collectors who want a digital pack-opening experience
- Players who enjoy browsing real card data by set
- Fans of foil, binder, and collection organization systems
- Reviewers, classmates, or hiring managers looking at a full-stack React project

## Tech Stack

- React
- Vite
- React Router
- Material UI
- Framer Motion
- Supabase
- Scryfall API
- Browser `localStorage` for guest fallback, settings, and some local preferences
- CSS and SVG-style effects for pack reveals, foils, cosmetics, and battle visuals

## External API

The app uses the public [Scryfall API](https://scryfall.com/docs/api) for real Magic card and set data.

Scryfall provides:

- Card names
- Card images
- Rarities
- Set codes and set names
- Collector numbers
- Prices when available
- Oracle text
- Mana costs and mana values
- Power and toughness
- Colors and color identity
- Keywords, layouts, card faces, and other metadata

Main endpoint types used by the app include:

- `sets` for browsing available Magic sets
- `cards/search` for set-specific card pools and pack generation
- `cards/named` and card detail endpoints for exact card lookup and enrichment
- Card metadata fields used for collection display, battle mapping, and pricing

Scryfall does not provide official sealed booster collation or official booster wrapper images, so booster contents and wrappers are simulated by the app.

## Key Features

- Set selection from Scryfall data
- Pack selection carousel with Play Booster and Collector Booster options
- Collector-only set locking for app-restricted products
- Swipe-based pack cutting and card reveal flow
- Stable reveal order so preview, reveal, summary, and saving use the same generated pack
- Foil treatments including rainbow, etched, galaxy, gilded, textured, neon, and other premium styles
- Special One-of-One The One Ring handling and animation support
- Supabase-backed collection saving for logged-in users
- Guest/local fallback where supported
- Card inspection with pricing, metadata, and foil shine
- Collection value and card pricing helpers
- Dynamic card recycling values based on rarity, foil status, and special treatments
- Duplicate Manager for bulk recycling extra copies
- Pack Shards economy
- Binder ownership, binder card storage, and binder customization
- Cosmetic shop catalog with ownership and equipped cosmetics
- Global app themes, opening scenes, sleeves, tear effects, reveal effects, profile cosmetics, binder cosmetics, display cases, trade skins, history frames, and home widgets
- Friends and friend request system
- Trading with specific user card copies
- Showcase display cases for favorite cards
- Binder Battle, a simplified battle game using cards from the user's collection
- PvP friend battle database support and AI friend-deck battle mode
- Supabase auth and profile system

## User Flow

A typical user flow looks like this:

1. Sign up or log in.
2. Choose a Magic set from the set browser.
3. Select a Play Booster or Collector Booster.
4. Open the pack and reveal each card.
5. Save the pulls to the collection.
6. Inspect cards, check values, and manage duplicates.
7. Recycle extra copies for Pack Shards.
8. Spend Pack Shards on binders, cosmetics, or Collector Boosters.
9. Organize cards into binders or display cases.
10. Trade with friends or build a Binder Battle deck.

## Setup Instructions

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

Create a `.env` file with your Supabase project values:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Do not commit real keys. Never place a Supabase service role key in the frontend.

Before using auth or database-backed features, run the Supabase SQL schema files in the `supabase/` folder. If the username/password flow uses generated internal emails, disable email confirmation in Supabase Auth for local testing.

## Supabase Setup

Supabase is used as the source of truth for logged-in users. LocalStorage is kept only where guest fallback, settings, or local preferences are still useful.

The database setup includes or supports:

- Auth users
- Profiles
- Pack Shard balances
- `user_cards` for saved collection cards
- Battle card metadata fields for type lines, oracle text, colors, power/toughness, keywords, and full Scryfall data
- Friend requests and accepted friends
- Trades and trade items
- Owned binders and binder cards
- Shop ownership and equipped cosmetics
- Display cases and display case cards
- Battle decks
- PvP battle challenges, matches, and match actions

Relevant SQL files are in `supabase/`, including:

- `schema.sql`
- `pack_shards_schema.sql`
- `shop_schema.sql`
- `battle_decks_schema.sql`
- `add_battle_card_fields.sql`
- `pvp_battle_schema.sql`

Row Level Security policies are expected so users can only access their own private collection, wallet, shop, binder, trade, and battle data.

## Data Fetching and Loading States

The app makes asynchronous requests to both Scryfall and Supabase.

Scryfall data is loaded for:

- Set lists
- Set-specific card pools
- Exact card details
- Missing battle metadata enrichment
- Enemy starter deck cards for Binder Battle

Supabase data is loaded for:

- Auth state
- Profiles
- Collection cards
- Pack Shards
- Binders
- Shop ownership and equipped cosmetics
- Friends and trades
- Battle decks and PvP matches

The UI uses loading indicators, empty states, error alerts, and fallback messages so users understand what is happening. Where older saved card rows may be missing metadata, the app can refresh or enrich battle data instead of crashing.

## Architecture Overview

The app is organized around pages, reusable components, API helpers, and utility modules.

Common areas include:

- `src/api/` for Supabase and Scryfall data access
- `src/pages/` for route-level screens
- `src/components/` for reusable UI and feature components
- `src/components/battle/` for Binder Battle UI
- `src/context/` for auth and cosmetics state
- `src/utils/` for pack generation, pricing, recycling, battle mapping, storage helpers, and catalog data
- `src/theme/` for Material UI theme and cosmetic theme variables
- `supabase/` for database schema files

Pack generation, collection saving, cosmetics, binders, trading, and battle systems are kept in separate modules so the app can grow without turning every page into one large file.

## Challenges

Several parts of the project required app-level decisions because the source data does not directly provide the desired behavior.

- Scryfall does not generate official boosters, so pack generation uses an approximation.
- Some cards have missing images, missing prices, unusual layouts, or inconsistent metadata.
- Double-faced cards and unusual power/toughness values require defensive parsing.
- Some collector-exclusive or collector-only products need manual app-level rules.
- Magic's full rules engine is extremely complex, so Binder Battle is intentionally simplified.
- Mobile foil and battle animations needed lighter paths to stay smooth.
- Supabase-backed data must stay synced across multiple signed-in devices.
- Trading and PvP battle actions need careful ownership and turn validation.

## Design Approach

The visual direction is a dark fantasy collectible-card interface with premium panels, glow accents, tactile motion, and card-focused layouts.

Design choices include:

- Material UI for consistent structure, dialogs, buttons, tabs, chips, and forms
- Framer Motion for pack reveals, card entrances, battle interactions, and result states
- Mobile-specific layouts for pack opening, collection inspection, shop cards, and Binder Battle
- CSS-based foil, atmosphere, sleeve, theme, and battle effects for performance
- Subtle animation fallbacks on mobile and reduced-motion support where appropriate
- Clear empty states and locked states so users understand what to do next

## Known Limitations

- Booster odds and pack collation are approximated, not official product collation.
- Collector-only set codes are maintained in an app-level list and may require manual updates.
- Card pricing is estimated from Scryfall fields and may be missing.
- Some card images or metadata may be unavailable depending on Scryfall data.
- Binder Battle is a simplified game mode and does not implement official Magic rules.
- Some cosmetics are visual only and do not affect gameplay or pack odds.
- Some features require Supabase schemas and RLS policies to be configured before they work.
- Local guest data does not sync across browsers or devices.

## Future Improvements

- More accurate set-specific booster collation
- More product-specific Collector Booster rules
- Stronger trade safety through additional RPC validation
- More cosmetics and cosmetic preview polish
- Full pack history records
- Achievements and collection milestones
- Wishlist and favorite-card tools
- AI-generated pack summaries or collection summaries
- Better Binder Battle AI and balance testing
- More PvP battle validation on the server
- More mobile polish and accessibility improvements

## Credits

- [Scryfall API](https://scryfall.com/docs/api) for public Magic card and set data
- [Supabase](https://supabase.com/) for auth, database, and realtime features
- [Material UI](https://mui.com/) for UI components
- [Framer Motion](https://www.framer.com/motion/) for animation tools

Magic: The Gathering card data and images belong to their respective owners. This project is for educational and demo purposes and is not affiliated with or endorsed by Wizards of the Coast.
