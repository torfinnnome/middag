import { NextResponse } from 'next/server';

// The CloudflareEnv interface is globally available after running `npm run types`.
// No need to re-declare it here.

export async function POST(request: Request) {
  try {
    const recipe = await request.json();
    const id = crypto.randomUUID();

    const kv = process.env.RECIPES_KV as unknown as KVNamespace;
    if (!kv) {
      return new Response('Cloudflare KV binding RECIPES_KV is not available.', { status: 500 });
    }

    await kv.put(id, JSON.stringify(recipe));

    return NextResponse.json({ id });
  } catch (error) {
    console.error(error);
    if (error instanceof Error) {
        return new Response(error.message, { status: 500 });
    }
    return new Response('An unknown error occurred', { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return new Response('Recipe ID is required', { status: 400 });
    }

    const kv = process.env.RECIPES_KV as unknown as KVNamespace;
    if (!kv) {
      return new Response('Cloudflare KV binding RECIPES_KV is not available.', { status: 500 });
    }

    const recipe = await kv.get(id);

    if (!recipe) {
      return new Response('Recipe not found', { status: 404 });
    }

    return NextResponse.json(JSON.parse(recipe));
  } catch (error) {
    console.error(error);
    if (error instanceof Error) {
        return new Response(error.message, { status: 500 });
    }
    return new Response('An unknown error occurred', { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return new Response('Recipe ID is required', { status: 400 });
    }

    const recipe = await request.json();
    const kv = process.env.RECIPES_KV as unknown as KVNamespace;

    if (!kv) {
      return new Response('Cloudflare KV binding RECIPES_KV is not available.', { status: 500 });
    }

    const existingRecipe = await kv.get(id);
    if (!existingRecipe) {
        return new Response('Recipe not found', { status: 404 });
    }

    await kv.put(id, JSON.stringify(recipe));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    if (error instanceof Error) {
        return new Response(error.message, { status: 500 });
    }
    return new Response('An unknown error occurred', { status: 500 });
  }
}
