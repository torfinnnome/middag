# Middag: Yet Another Dinner Planner™️

Tired of the eternal question, "Hva skal vi ha til middag?" (What's for dinner?) Staring blankly into the fridge abyss? Arguing with your significant other/cat/inner monologue about whether it's a fish or fajita kind of day?

Fear not, for **Middag** is here! It's a surprisingly functional (most of the time) Next.js application designed to take the *thinking* (and maybe some of the arguing) out of your weekly dinner planning.

![Middag Screenshot](sh0t.png)
*(Yes, it actually looks like this!)*

## What Does It Actually Do?

This isn't just *any* dinner planner. This is a sophisticated piece of engineering that:

1.  Fetches meal ideas from a **mysterious Excel sheet** living somewhere on the internet (seriously, check the `.env` requirement).
2.  Lets you filter by meal categories because maybe you're *not* feeling "Rødt kjøtt" (Red meat) today.
3.  Generates a weekly meal plan using algorithms ranging from "pure chaos" (random) to "slightly less chaos" (weighted towards the top of your Excel list).
4.  Allows you to **lock in** those non-negotiable Taco Fridays 🌮.
5.  Features **drag-and-drop** reordering for when the generated plan feels *slightly* insulting.
6.  Supports **manual editing** double-click a meal to change it, because you're the boss, not the spreadsheet!
7.  Includes a handy **copy-to-clipboard** feature for easy sharing (or printing and sticking to the fridge with questionable magnets).
8.  Speaks multiple languages! (Currently NO 🇳🇴, EN 🇬🇧, ES 🇪🇸) - ¡Olé!

Built with modern web tech and deployed serverlessly on the edge via Cloudflare Pages, because why not?

## Key Features Rundown ✨

*   🍽️ Fetches meal data from an online Excel file (`.xlsx`).
*   ✅ Select/deselect meal categories.
*   🎲 Random or Weighted meal plan generation.
*   🔒 Lock/Unlock specific days.
*   👆 Drag-and-drop reordering of the meal plan.
*   ✏️ Manually edit meals directly in the plan.
*   📋 Copy plan to clipboard.
*   🌍 Multi-language support (NO, EN, ES).
*   🚀 Deployed on Cloudflare Pages using OpenNext.

## Tech Stack 🛠️

*   **Framework:** Next.js 15 (React 19)
*   **Language:** TypeScript
*   **Styling:** Tailwind CSS 4 & PostCSS
*   **Drag & Drop:** @dnd-kit
*   **Excel Parsing:** SheetJS (xlsx)
*   **Deployment:** Cloudflare Pages + OpenNext + Wrangler
*   **Linting:** ESLint
*   **IDs:** UUID

## Getting Started Locally 🚀

Want to run this masterpiece (or disasterpiece, depending on the day) yourself?

1.  **Clone the repo:**
    ```bash
    git clone https://github.com/torfinnnome/middag.git
    cd middag
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    # or yarn install or pnpm install
    ```
3.  **Configure the magic spreadsheet URL:**
    *   Create a `.env.local` file in the root directory.
    *   Add the following line, replacing the URL with the *actual, publicly accessible* URL to your `.xlsx` file:
        ```dotenv
        MIDDAGSURL="https://your-spreadsheet-url-here.xlsx"
        ```
    *   **Spreadsheet Format:** The Excel file should have categories in the first row (A1, B1, C1, ...) and the corresponding meals listed below each category header. Like this:

        | Fisk      | Vegetar       | Annet           |
        | :-------- | :------------ | :-------------- |
        | Laks      | Linsegryte    | Taco            |
        | Torsk     | Kikertcurry   | Hjemmelaget Pizza |
        | Sei       | Bønneburger   | Fajitas         |
        | ...       | ...           | ...             |

4.  **Run the development server:**
    ```bash
    npm run dev
    ```
5.  Open [http://localhost:3000](http://localhost:3000) and behold the dinner-planning glory!

## Deployment ☁️

This project is set up for deployment to Cloudflare Pages via the OpenNext adapter and Wrangler.

*   Configuration is in `wrangler.json`.
*   Make sure your `MIDDAGSURL` is set as an environment variable in your Cloudflare Pages project settings.
*   Run `npm run deploy` to build and deploy. (Requires Wrangler to be configured).
*   Run `npm run preview` to build and test locally using Wrangler & Miniflare.

## Available Scripts 📜

*   `dev`: Starts the local development server.
*   `build`: Builds the application using OpenNext for Cloudflare.
*   `deploy`: Builds and deploys to Cloudflare Pages via Wrangler.
*   `lint`: Runs ESLint to check for code style issues.
*   `preview`: Runs a local preview build using Wrangler.
*   `types`: Generates Cloudflare environment types (`env.d.ts`).
*   `check`: Does a full build, type check, and dry-run deploy.

## Future Enhancements (Maybe?) 🤔

*   Storing meal data in a *real* database instead of a rogue spreadsheet.
*   User accounts? Probably too much effort.
*   Preventing the same meal twice in one week (unless it's pizza, obviously).
*   AI suggestions based on leftover yogurt and that one questionable vegetable in the back of the fridge (highly unlikely).
*   More languages? Submit a PR!

## License

MIT License

---

Vel bekomme! (Enjoy your meal!)
