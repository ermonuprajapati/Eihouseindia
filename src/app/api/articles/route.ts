import { NextResponse } from 'next/server';
import { getPublishedPostsFeed } from '@/modules/posts/public-queries';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '9', 10)));
    const categoryId = searchParams.get('categoryId') || undefined;

    const feed = await getPublishedPostsFeed({
      offset,
      limit,
      categoryId: categoryId && categoryId.trim() !== '' ? categoryId.trim() : undefined,
    });

    return NextResponse.json(feed, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    });
  } catch (error) {
    console.error('Failed to get articles feed:', error);
    return NextResponse.json(
      { posts: [], hasMore: false, total: 0 },
      { status: 500 }
    );
  }
}
