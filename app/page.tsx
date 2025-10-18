import MealPlanner from '@/components/MealPlanner';

// Edge runtime is required for Cloudflare Pages deployment
export const runtime = 'edge';

// Pass the data URL as an environment variable to the client component
export default function HomePage() {
    const middagsUrl = process.env.MIDDAGSURL || '';

    return (
        <main className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4 text-center">Middagsplanlegger</h1>
            <MealPlanner middagsUrl={middagsUrl} />
        </main>
    );
}

export const dynamic = 'force-dynamic';
