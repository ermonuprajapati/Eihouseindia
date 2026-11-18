import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    revalidatePath('/');
    revalidatePath('/articles');
    revalidatePath('/engineering-lab');
    if (body?.slug && typeof body.slug === 'string') {
      revalidatePath(`/blog/${body.slug}`);
    }
    return NextResponse.json({ revalidated: true, timestamp: Date.now() });
  } catch (err) {
    return NextResponse.json(
      { revalidated: false, error: err instanceof Error ? err.message : 'Revalidation error' },
      { status: 500 }
    );
  }
}
