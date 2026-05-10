# Market Intel Public Portal — Build Plan

A phase-by-phase, step-by-step plan. Every phase opens with an ELI20 of what it does. Every step has its own ELI20, the detailed version, time commitment, and how hands-on you'll need to be.

---

## How to read this

**Hands-on legend:**
- 🪶 **Low** — describe what you want in chat, Cursor/Claude/Lovable does the work. You review and iterate by typing.
- ⚖ **Medium** — you open a tool yourself (Supabase dashboard, GitHub UI, Mapbox Studio, terminal), click, configure, paste paths back. Claude assists from chat.
- 🔨 **High** — extended work in an external tool requiring creative judgment, OR you're directing a freelancer over several days.

**Total project duration:** ~8 weeks part-time, faster if you push.

---

# Phase 0 — Setup the foundation

**ELI20 of the whole phase:** Get all your tools wired up before you start building anything real. It's the kitchen-prep before the cooking — boring, takes a day, but if you skip it everything downstream is harder.

**Phase duration:** 1–2 days  
**Phase output:** A live GitHub repo connected to Vercel, Lovable, and Supabase, with the basic Next.js scaffold running.

**Done-criteria (revised 2026-05-09):**
- ✅ Repo exists, code pushed, `npm run dev` boots locally
- ✅ shadcn/ui initialized (`components.json` present, `components/ui/` populated)
- ⏭ Boundary data deferred to Phase 1.x — not a Phase 0 gate
- ✅ Mapbox style URL chosen: `mapbox://styles/kuriandony/cmoyd2k8u000q01su80hf8dwa` (Dark 2D fork)
- ✅ Vercel project live at `market-intel-n5xz797lw-kuriandonyku-2996s-projects.vercel.app`
- ⏭ Lovable repo connection dropped — sandbox-only, ad-hoc from Phase 2
- ✅ `.env.local` populated with Supabase URL + publishable key + Mapbox token + style

---

### Step 0.1 — Fork a Next.js + Supabase starter

**ELI20:** Don't write a website from scratch. Copy someone else's empty website that already has all the boring plumbing done.

**Detailed:** Go to GitHub, find Vercel's official `next.js/examples/with-supabase` example. Click "Use this template." Name your repo something like `market-intel-portal`. Clone it locally with `git clone`. Run `npm install`, then `npm run dev`. You should see a default page on `http://localhost:3000`.

**Time:** 30 minutes  
**Hands-on:** ⚖ Medium — you click through GitHub UI, run a few terminal commands. Claude can write the exact commands for you.

---

### Step 0.2 — Install shadcn/ui

**ELI20:** Add a free library of pre-built buttons, cards, and other UI parts so you don't have to design any of them yourself.

**Detailed:** In your terminal at the project root, run `npx shadcn@latest init`. It'll ask you a few questions (style, base color, components folder). Pick defaults. This drops a `components/ui/` folder into your project. Anytime you need a button later, you'll run `npx shadcn add button` and it adds the button.

**Time:** 15 minutes  
**Hands-on:** ⚖ Medium — terminal command, answer a few prompts. Claude tells you which answers to pick.

---

### Step 0.3 — Get Australian boundary data *(Deferred — Director call 2026-05-09)*

**ELI20:** ~~Download the official map shapes for every Australian suburb. They're free.~~ *Deferred. At ~250 NSW SA2 polygons our scale doesn't need PMTiles or R2 infra. We'll load a static GeoJSON file directly.*

**Revised plan (Phase 1.x, when the motion prototype needs choropleth overlays):** Download the NSW SA2 GeoJSON from the ABS (ASGS boundaries), filter to NSW only, drop it in `public/data/nsw-sa2.geojson`. Mapbox GL JS loads it as a local source. No PMTiles conversion, no R2 upload needed.

**Original plan (superseded):** ~~Convert to PMTiles, upload to Cloudflare R2, point Mapbox at the public URL.~~

**Time:** 30 minutes when needed  
**Hands-on:** ⚖ Medium — one terminal command + one file copy.

---

### Step 0.4 — Pick a Mapbox starting style

**ELI20:** Pick a pre-made map look from Mapbox's gallery. Don't design your own yet — see what's possible first.

**Detailed:** Sign up for a free Mapbox account. Open Mapbox Studio. Browse the "Templates" and "Community" galleries. Pick a style that vibes with what you want — minimal, monochrome, painterly, whatever. Click "Edit a copy" so it's yours. Note the style URL. You'll fly the camera over this style in Phase 1.

**Time:** 1 hour browsing + 15 minutes setup  
**Hands-on:** ⚖ Medium — pure browsing and clicking.

---

### Step 0.5 — Connect GitHub → Vercel → Supabase env vars *(revised 2026-05-09)*

**ELI20:** Wire Vercel to your repo (auto-deploy on push) and give it the Supabase + Mapbox credentials.

**Detailed:**
- Vercel: import `KurianDony/Market-Intel-UI`, auto-deploys on push. Add 4 env vars in project Settings → Environment Variables.
- Supabase: project `lyurcephjxokyhiclmgm`. URL + publishable key added to `.env.local` and Vercel.
- Lovable: **repo connection dropped from Phase 0.** Lovable runs sandbox-only; pages will be prototyped ad-hoc in Phase 2+, then code copied into the main repo by hand. No persistent GitHub integration needed.

**Production URL:** `market-intel-n5xz797lw-kuriandonyku-2996s-projects.vercel.app`

**Time:** Done  
**Hands-on:** ⚖ Medium — clicking through dashboards.

---

# Phase 1 — Motion prototype (the one hero piece)

**ELI20 of the whole phase:** Build the cool zoom-into-the-map animation on its own page, with fake suburbs and fake numbers. Test it before you wire anything real to it. If it doesn't feel right, you find out fast and pivot — without throwing away real work.

**Phase duration:** 1–2 weeks  
**Phase output:** A standalone page at `/motion-prototype` where you can swipe, scroll, and click through State → Area → Suburb. Looks polished. No real data yet.

---

### Step 1.1 — Fork mapbox/storytelling

**ELI20:** Steal Mapbox's official scrollytelling template. It already does most of what you want.

**Detailed:** Clone `github.com/mapbox/storytelling` locally. Run it. It's a config-driven scroll experience where each "chapter" is a flyTo. Read their config file — that's where you'll define your levels later. Don't merge it into your main app yet; keep it in a sandbox folder so you can experiment freely.

**Time:** 2 hours (cloning + reading their docs + running the demo)  
**Hands-on:** ⚖ Medium — terminal + reading.

---

### Step 1.2 — Customize chapters for State → Area → Suburb

**ELI20:** Replace their example locations with yours: Australia, Sydney, Eastern Suburbs, Randwick.

**Detailed:** Open the `config.js` in the storytelling fork. Each chapter has a `location` object with center coordinates, zoom level, pitch, and bearing. Define five chapters (or however many drill steps you want): NSW bbox → Eastern Suburbs bbox → Randwick bbox. Use bounding boxes from your ABS GeoJSON. Tell Cursor + Claude: *"add chapters for these three bboxes with cinematic easing, 1.6s duration each."*

**Time:** Half a day  
**Hands-on:** 🪶 Low — Claude writes the config, you paste it in.

---

### Step 1.3 — Apply your custom Mapbox style

**ELI20:** Tell Mapbox to use the pretty map style you picked, not the default.

**Detailed:** In the storytelling config, find the `style` field. Replace the default Mapbox style URL with your custom one from Step 0.4. Reload. The map now looks like *your* map. Tweak in Mapbox Studio if it doesn't match what you imagined — you can iterate the style without touching code.

**Time:** 1 hour (most of it tweaking the style in Studio)  
**Hands-on:** 🔨 High — you're in Mapbox Studio playing with colors, fonts, layer visibility. This is where the "properly nice" comes from.

---

### Step 1.4 — Add swipe-between-states

**ELI20:** Make it so swiping left or right at the top zoom level switches between states like flicking through phone home screens.

**Detailed:** Use Framer Motion's `drag` prop on a wrapping `<motion.div>`. On drag-end, check the velocity — if positive past a threshold, fire `flyTo` to the next state. Negative = previous. Bind keyboard arrow keys for desktop. Tell Cursor + Claude: *"add horizontal swipe gesture at the top zoom level. Threshold 50px or 0.3 velocity. Bind arrow keys."*

**Time:** Half a day  
**Hands-on:** 🪶 Low — Claude writes it. You test by swiping.

---

### Step 1.5 — Add scroll-to-zoom

**ELI20:** Make scrolling down zoom into the next level (like Google Earth).

**Detailed:** The mapbox/storytelling fork already does this. You're just confirming the trigger zones feel right. Each chapter activates at a scroll position — adjust offset values in the config so the zoom feels triggered at the natural scroll rhythm, not too late or early.

**Time:** Half a day of tuning  
**Hands-on:** 🪶 Low — adjust numbers in config, reload, repeat.

---

### Step 1.6 — Label overlays and "see data →" buttons

**ELI20:** At each level, show a label and a button. Label = where you are. Button = leave the motion and go to the data page.

**Detailed:** Use Framer Motion `<AnimatePresence>` to fade labels in/out at zoom thresholds. The button is a shadcn `Button` component with `variant="default"`, fixed in the lower-right of the screen. Tell Cursor + Claude: *"at zoom level 6+, fade in a 'See data for [area name] →' button bottom-right."*

**Time:** Half a day  
**Hands-on:** 🪶 Low.

---

### Step 1.7 — Mobile test

**ELI20:** Open it on your phone. Make sure it doesn't suck on a small screen.

**Detailed:** Get the Vercel preview URL on your phone. Try the swipe (touch). Try the scroll. Try the buttons. Anything that doesn't work, screenshot, paste into Cursor, ask Claude to fix. Common fixes: bigger tap targets, longer easing, hide labels at small viewport widths.

**Time:** 2–3 hours  
**Hands-on:** ⚖ Medium — you're testing on a real phone.

---

### Step 1.8 — The "feels good" gate

**ELI20:** Show it to someone who isn't you. If they understand what's happening without you explaining, it works. If not, fix it before moving on.

**Detailed:** Put your phone in front of three people: ideally one non-tech, one tech, one designer if you have one. Tell them nothing. Watch them swipe and scroll. Ask: "What do you think this is?" "Did you understand what was happening?" If two of three people say yes, ship it. If not, iterate.

**Time:** A few hours of testing + however long the fixes take  
**Hands-on:** ⚖ Medium — you're showing real humans a real prototype.

---

# Phase 2 — Build the page template + data layer

**ELI20 of the whole phase:** Make one good page (the Suburb data page) with charts and a calculator, hooked up to real Supabase data. Once it works for one suburb, you'll copy the template for areas and states.

**Phase duration:** 1 week  
**Phase output:** `/nsw/eastern-suburbs/randwick-2031` shows real Randwick data with working charts and a working calculator.

---

### Step 2.1 — Lovable scaffolds the page

**ELI20:** Tell Lovable what you want, in plain English. It writes the first version.

**Detailed:** In Lovable, paste this prompt: *"Build a Next.js page at `/[state]/[area]/[suburb]` using shadcn/ui. Sections: hero with suburb name + freshness badge, stat strip (avg rent, WoW Δ, demand ratio, listings count), Recharts histogram (p10–p100 from `suburb_market` table), Recharts line chart of avg rent over weeks, filter calculator (bedrooms / bathrooms / occupants / type → output rent range), peer card grid showing 6 nearby suburbs. Read from Supabase tables: `suburbs`, `counts`, `listings`, `suburb_market`."* Wait. Review what it generated.

**Time:** 1 hour to prompt + 2 hours reviewing  
**Hands-on:** 🪶 Low — Lovable does the typing.

---

### Step 2.2 — Wire Supabase queries

**ELI20:** Make sure the page actually pulls real numbers from the database, not fake placeholder ones.

**Detailed:** Move the code into Cursor. Open the suburb page component. Confirm the Supabase queries match your real schema. Common issues Lovable will need help with: filtering by `slug`, joining `suburbs` and `suburb_market`, sorting `counts` by date desc and limiting to 1. Ask Claude in Cursor: *"verify these Supabase queries match the schema in SUPABASE_MIGRATION.md and rewrite anything that doesn't."*

**Time:** Half a day  
**Hands-on:** 🪶 Low — Claude reads your schema, fixes the queries.

---

### Step 2.3 — Charts (Recharts or Visx)

**ELI20:** Add the rent histogram and trend chart. Use shadcn's pre-built chart components — they look polished out of the box.

**Detailed:** Run `npx shadcn add chart`. shadcn drops in Chart components built on Recharts. The histogram = bar chart with 10 bars (p10..p100). The trend = line chart of `avg_rent` over `date`. Ask Claude to fill the data props from your Supabase response. If you want fancier later, swap in Visx — but only after the simple version ships.

**Time:** Half a day  
**Hands-on:** 🪶 Low.

---

### Step 2.4 — The filter calculator

**ELI20:** A few dropdowns at the top of the page that filter the listings to show "what rent range do 4BR / 2BA share-houses charge in this scope?"

**Detailed:** Inputs: shadcn `Select` for bedrooms (1–6), bathrooms (1–3), occupants (1–8), type (share-house, studio, etc.). Output: filter the `listings` rows in scope, compute min, p25, median, p75, max. Render as a small stat card. Same component used at every level — at suburb scope it filters that suburb's listings, at area scope it filters all listings in that area's suburbs.

**Time:** 1 day  
**Hands-on:** 🪶 Low — Claude writes the filter logic. Test with real data.

---

### Step 2.5 — Freshness badge + empty states

**ELI20:** Show users when the data was last updated. If a suburb has no recent data, say so honestly instead of pretending.

**Detailed:** Top of every data page: a small badge like *"Updated 4 days ago"* (relative time from the latest `counts.fetch_timestamp`). If the latest fetch is over 14 days old or the suburb is on the known-thin-data skip-list, replace charts with a friendly *"Limited data for this suburb — check back later"* empty state. Important for trust.

**Time:** Half a day  
**Hands-on:** 🪶 Low.

---

# Phase 3 — Replicate at all levels + wire motion to data

**ELI20 of the whole phase:** Take the suburb page you just built and clone it for state and area pages. Then add the buttons inside the motion graphic that send people to those data pages.

**Phase duration:** 3–5 days  
**Phase output:** Drilling through the motion → clicking "see data" → lands on the right data page. Search bar works. State toggle works.

---

### Step 3.1 — Clone the page template for `/state` and `/state/area`

**ELI20:** Same page layout, different data scope. Use the suburb page as the parent.

**Detailed:** Create `/[state]/page.tsx` and `/[state]/[area]/page.tsx`. They reuse the same `<DataPageTemplate>` component you built in Phase 2 — just pass it different props (scope = "state" or "area" instead of "suburb"). The template's queries change based on scope: at state scope, aggregate across all suburbs in that state; at area scope, aggregate across that area's suburbs.

**Time:** 1 day  
**Hands-on:** 🪶 Low — Claude clones and rewires.

---

### Step 3.2 — Adjust scoped queries

**ELI20:** Make sure the calculator and charts know whether they're showing one suburb's data or a whole area's data.

**Detailed:** The aggregation rules: average rent at area scope = mean of suburb avg_rents (or weighted by listings count, decide which). Histogram at area scope = combined histograms of all child suburbs. Demand ratio = sum of people_looking / sum of rooms_offered. Test with real numbers — sanity-check that `Eastern Suburbs` median feels right vs. `Randwick` median.

**Time:** 1 day  
**Hands-on:** ⚖ Medium — you're checking the math.

---

### Step 3.3 — "See data →" buttons inside the motion graphic

**ELI20:** When zoomed into Bondi inside the motion, a button appears that takes you to Bondi's data page.

**Detailed:** In the motion prototype, when active chapter = a suburb, a fixed-position button appears reading *"See data for Bondi →"*. On click, navigate to `/nsw/eastern-suburbs/bondi-2026`. Same pattern at area + state levels: *"See area data →"*, *"See state data →"*. Use Next.js `<Link>` with prefetching so the destination loads fast.

**Time:** Half a day  
**Hands-on:** 🪶 Low.

---

### Step 3.4 — Search bar (cmd-K palette)

**ELI20:** Press cmd-K (or click the top-bar search), type "Randwick," hit enter, jump straight there.

**Detailed:** Run `npx shadcn add command`. Drop the `Command` component in the top bar. Populate it with all your suburbs, areas, and (later) streets — pulled from Supabase. shadcn handles fuzzy matching. On select, navigate to that page. Bind cmd-K (mac) / ctrl-K (windows) globally.

**Time:** Half a day  
**Hands-on:** 🪶 Low.

---

### Step 3.5 — State toggle in the top bar

**ELI20:** A NSW / QLD / TAS switcher that lives at the top of every page.

**Detailed:** Run `npx shadcn add toggle-group`. Drop the toggle in the top bar to the left of the search. Active state syncs to the URL path (`/nsw/...`, `/qld/...`). Inactive states show a "Coming soon" badge if the data depth is below threshold (5 suburbs).

**Time:** Half a day  
**Hands-on:** 🪶 Low.

---

# Phase 4 — Polish kit + insights pages

**ELI20 of the whole phase:** Make it look properly nice without learning anything new. Paste in fancy backgrounds and hover effects from free component libraries. Then build the insights/rankings pages that drive traffic.

**Phase duration:** 1–1.5 weeks  
**Phase output:** Site looks designed, not engineered. Hottest / Coldest / Biggest swing pages live and clicking-through to data pages.

---

### Step 4.1 — Component shopping trip

**ELI20:** Open `ui.aceternity.com` and `magicui.design`. Pick the components you want. Tab them open.

**Detailed:** Spend 1–2 hours browsing. Specific shopping list:
- AuroraBackground (Aceternity) — for home page hero
- BackgroundBeams (Aceternity) — for insights page background
- Spotlight (Aceternity) — cursor-following glow on insights cards
- 3DCard (Aceternity) — for suburb peer cards in data pages
- HoverEffect (Aceternity) — for ranking lists
- NumberTicker (Magic UI) — animated number for headline stat (avg rent)
- AnimatedShinyText (Magic UI) — for the freshness badge
- DotPattern (Magic UI) — subtle background on insights pages

**Time:** 2 hours  
**Hands-on:** ⚖ Medium — browsing, copying URLs.

---

### Step 4.2 — Paste in backgrounds

**ELI20:** Drop AuroraBackground onto the home page. Drop BackgroundBeams onto the insights pages. Done.

**Detailed:** For each component, copy the source from Aceternity's site. Paste into a new file in `components/ui/`. Import where needed. Tell Claude: *"wrap the home page hero in <AuroraBackground>. Wrap the insights pages in <BackgroundBeams>."* Claude wires it up.

**Time:** Half a day for both pages  
**Hands-on:** 🪶 Low.

---

### Step 4.3 — Hover effects + 3D card tilts

**ELI20:** Make cards feel alive on hover.

**Detailed:** Replace plain peer-card components with Aceternity's 3DCard. Wrap insights ranking rows with HoverEffect or Spotlight. Test on desktop (where hover matters) and confirm graceful fallback on mobile (no hover, so it should still look good static).

**Time:** Half a day  
**Hands-on:** 🪶 Low.

---

### Step 4.4 — NumberTicker + animated badges

**ELI20:** When a data page loads, the avg rent number counts up from 0 to its real value. Tiny detail, very satisfying.

**Detailed:** Replace plain numbers in the stat strip with `<NumberTicker value={482} />`. Use AnimatedShinyText on the freshness badge so "Updated today" has a subtle shimmer.

**Time:** 1 hour  
**Hands-on:** 🪶 Low.

---

### Step 4.5 — Build the three insights pages

**ELI20:** Three lists: hottest suburbs, coldest, biggest changes. Each row clicks through to that suburb.

**Detailed:** Three routes: `/insights/hottest`, `/insights/coldest`, `/insights/swing`. Each is a Supabase query (e.g., hottest = top 50 by demand_ratio). Each row is a HoverEffect-wrapped card with suburb name, headline number, sparkline. Click → suburb data page. No motion, no fancy stuff. Direct, scannable.

**Time:** 2 days  
**Hands-on:** 🪶 Low — Claude writes most of it.

---

# Phase 5 — Ship the generic site

**ELI20 of the whole phase:** Make sure Google can find it, your phone shows it correctly, and it goes live on a real URL.

**Phase duration:** 3–5 days  
**Phase output:** Generic site live at your custom domain, indexable, mobile-tested, SEO-ready.

---

### Step 5.1 — SEO basics (sitemap + meta tags)

**ELI20:** Tell Google what pages exist and what each one is about.

**Detailed:** Install `next-sitemap`. It auto-generates a `sitemap.xml` from your routes after each build. Add per-page `<title>`, `<meta description>`, and Open Graph tags. Each suburb page should have meta like *"Randwick rental market — avg rent $470/wk, demand ratio 5.0"*. Claude writes the metadata function once.

**Time:** Half a day  
**Hands-on:** 🪶 Low.

---

### Step 5.2 — OG images (auto-generated)

**ELI20:** Make a pretty preview image for every page that shows up when someone shares the link on Twitter/Slack/Linkedin.

**Detailed:** Use Vercel's `@vercel/og` library. Define a single OG image template that renders dynamically for each route — suburb name, avg rent, demand ratio, on a branded background. Vercel renders this on-demand. Free.

**Time:** Half a day  
**Hands-on:** 🪶 Low.

---

### Step 5.3 — Mobile QA pass

**ELI20:** Go through every page on your phone. Find what's broken. Fix.

**Detailed:** On a real phone (not just Chrome devtools), open every page type: home, insights × 3, state, area, suburb. Tap every interactive element. Pay attention to: text legibility, tap target size (min 44px), motion graphic feel, calculator usability, chart readability. Common fixes: fonts too small, buttons too thin, charts overflowing. Screenshot anything wrong, paste to Claude, get fixes.

**Time:** Half a day testing + half a day fixing  
**Hands-on:** ⚖ Medium.

---

### Step 5.4 — Vercel production deploy + custom domain

**ELI20:** Buy a domain. Point it at Vercel. Site is live.

**Detailed:** Buy a domain (Namecheap, Cloudflare, Google Domains). In Vercel, add the custom domain to your project. Vercel walks you through the DNS setup — usually 2 records in your domain registrar's DNS panel. Wait 5–30 minutes for propagation. Visit your domain. Site is live.

**Time:** 1–2 hours (most of it waiting for DNS)  
**Hands-on:** ⚖ Medium.

---

# Phase 6 — CDA fork

**ELI20 of the whole phase:** Make a logged-in version of the same site with orange branding and three extra tables on the suburb page (CDA streets, houses, rooms).

**Phase duration:** ~1 week  
**Phase output:** A second site (or auth-gated section) at e.g. `cda.yoursite.com.au` that requires login, looks orange/branded, and shows CDA-only data on top of the public data.

---

### Step 6.1 — Theme swap with next-themes

**ELI20:** Define two color palettes. Swap by adding a class to the body.

**Detailed:** Install `next-themes`. Define your colors as CSS custom properties — `--brand`, `--brand-bg`, etc. — in `globals.css`. Two themes: `default` (blue/neutral, generic site) and `cda` (orange/brand, CDA site). Toggle by setting a class on `<html>`. ~30 lines of code total.

**Time:** Half a day  
**Hands-on:** 🪶 Low.

---

### Step 6.2 — Auth gate (Supabase Auth UI)

**ELI20:** Add a sign-in form. Block CDA pages from non-logged-in users.

**Detailed:** Install `@supabase/auth-ui-react`. Drop the pre-built sign-in component on `/login`. Use Next.js middleware to redirect unauthenticated users away from CDA routes. Pre-create user accounts directly in Supabase dashboard — no public sign-up.

**Time:** 1 day  
**Hands-on:** ⚖ Medium — you're in the Supabase dashboard creating users.

---

### Step 6.3 — Add CDA Supabase tables

**ELI20:** Three new tables: streets, houses, rooms. Joined to suburbs.

**Detailed:** Schema:
- `cda_streets(id, suburb_id, street_name)`
- `cda_houses(id, street_id, address, bedrooms, bathrooms)`
- `cda_rooms(id, house_id, advertised_rent, room_type)`

Backfill from your existing CDA Rental Portfolio sheet. Apply RLS so only authenticated users can read. Use the Supabase service-role key in your backfill script, never in the client.

**Time:** 1 day  
**Hands-on:** ⚖ Medium — you're writing the backfill script and running it once.

---

### Step 6.4 — Extend the suburb page with CDA sections

**ELI20:** On the suburb page, when logged in, show three extra tables underneath the public charts: streets in this suburb (CDA only), houses on each street, rooms in each house.

**Detailed:** Three collapsible sections at the bottom of the suburb data page, conditionally rendered if `user && theme === 'cda'`. Each is a plain shadcn `Table`. Click a street → filter houses. Click a house → expand room list. No motion graphics, no fancy stuff. Tabular, fast.

**Time:** 2 days  
**Hands-on:** 🪶 Low — Claude writes the components.

---

# Total summary

| Phase | Duration | Hands-on level (avg) |
|---|---|---|
| 0 — Setup | 1–2 days | ⚖ Medium |
| 1 — Motion | 1–2 weeks | ⚖ Medium (Mapbox Studio is the high-touch part) |
| 2 — Page template | 1 week | 🪶 Low |
| 3 — Replicate + wire | 3–5 days | 🪶 Low |
| 4 — Polish + insights | 1–1.5 weeks | 🪶 Low |
| 5 — Ship | 3–5 days | ⚖ Medium |
| 6 — CDA fork | ~1 week | 🪶 Low–Medium |

**Total: ~7–8 weeks part-time.** Faster if you push.

The single most hands-on hour of this whole project: tuning the Mapbox Studio style in Phase 1.3 and watching real humans react to the motion graphic in Phase 1.8. Everything else is paste-and-iterate.
