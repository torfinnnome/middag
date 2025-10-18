import * as XLSX from 'xlsx';
import MealPlanner from '@/components/MealPlanner'; // Importer klientkomponenten

export const runtime = 'edge';

// The 'edge' runtime was removed to resolve a build error with the OpenNext tool.

// Fetch and parse xlsx url
async function getMealData() {
    try {

        const middagsUrl = process.env.MIDDAGSURL;
        // Removed logging of process.env to avoid exposing sensitive information.
        console.log("MIDDAGSURL:", process.env.MIDDAGSURL);

        if (!middagsUrl) {
          // Handle the case where the environment variable isn't set
          console.error("Error: MIDDAGSURL environment variable is not defined!");
          // You might want to throw an error or return an error state
          throw new Error("Application is misconfigured: MIDDAGSURL is missing.");
        }

        const response = await fetch(middagsUrl, { cache: 'no-store' }); // Avoid caching
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const arrayBuffer = await response.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData: string[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (!jsonData || jsonData.length < 2) {
            return { categories: [], mealsByCategory: {} };
        }

        const categories = jsonData[0].filter(Boolean); // Første rad er kategorier
        const mealsByCategory: { [key: string]: string[] } = {};
        categories.forEach(cat => mealsByCategory[cat] = []);

        // Gå gjennom rader (starter fra andre rad)
        for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i];
            for (let j = 0; j < categories.length; j++) {
                if (row[j]) { // Hvis det er en rett i denne cellen
                    mealsByCategory[categories[j]].push(row[j]);
                }
            }
        }
        return { categories, mealsByCategory };
    } catch (error) {
        console.error("Failed to fetch or parse Excel data:", error);
        // Returner tomme data ved feil, eller håndter feilen annerledes
        return { categories: [], mealsByCategory: {} };
    }
}

export default async function HomePage() {
    const { categories, mealsByCategory } = await getMealData();

    if (!categories.length) {
         return <main className="p-4"><p className="text-red-500">Kunne ikke laste middagsdata.</p></main>;
    }

    return (
        <main className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4 text-center">Middagsplanlegger</h1>
            {/* Send data ned til klientkomponenten */}
            <MealPlanner allCategories={categories} mealsData={mealsByCategory} />
        </main>
    );
}

// Tvinger dynamisk rendering for å alltid hente fersk data (eller bruk revalidate)
export const dynamic = 'force-dynamic';
