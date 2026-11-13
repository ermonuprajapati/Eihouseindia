import { getPublishedPostsPaginated } from '@/modules/posts/post-service';
import type { Post } from '@/types';

export interface SearchFilters {
  query: string;
  categorySlug?: string;
  tag?: string;
  authorUsername?: string;
  limit?: number;
}

export interface SearchSuggestion {
  title: string;
  slug: string;
  categoryName: string;
}

export interface SearchProvider {
  searchPublishedPosts(filters: SearchFilters): Promise<Post[]>;
  getSuggestions(prefix: string): Promise<SearchSuggestion[]>;
}

/**
 * Firestore-compatible search provider.
 * Fetches strictly PUBLISHED posts (never drafts/pending/rejected) and filters across
 * title, excerpt, category, tags, and author fields. Designed behind SearchProvider so
 * Algolia, Typesense, or Meilisearch can replace this implementation later without UI changes.
 */
export class FirestoreSearchProvider implements SearchProvider {
  async searchPublishedPosts(filters: SearchFilters): Promise<Post[]> {
    let posts: Post[] = [];
    try {
      const res = await getPublishedPostsPaginated({ pageSize: 100 });
      posts = res.posts;
    } catch {
      posts = [];
    }
    const q = filters.query.trim().toLowerCase();
    const cat = filters.categorySlug?.trim().toLowerCase();
    const tag = filters.tag?.trim().toLowerCase();
    const author = filters.authorUsername?.trim().toLowerCase();

    const matched = posts.filter((post) => {
      if (post.status !== 'PUBLISHED') return false;
      if (cat && post.categorySlug?.toLowerCase() !== cat && post.categoryId.toLowerCase() !== cat) {
        return false;
      }
      if (tag && !post.tags.some((t) => t.toLowerCase() === tag)) {
        return false;
      }
      if (author && post.authorUsername?.toLowerCase() !== author) {
        return false;
      }
      if (!q) return true;

      const haystack = [
        post.title,
        post.excerpt,
        post.categoryName || '',
        post.authorName || '',
        post.authorUsername || '',
        post.tags.join(' '),
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(q);
    });

    return matched.slice(0, filters.limit ?? 30);
  }

  async getSuggestions(prefix: string): Promise<SearchSuggestion[]> {
    const q = prefix.trim().toLowerCase();
    if (q.length < 2) return [];
    const matches = await this.searchPublishedPosts({ query: q, limit: 6 });
    return matches.map((post) => ({
      title: post.title,
      slug: post.slug,
      categoryName: post.categoryName || 'Technology',
    }));
  }
}

export const searchProvider: SearchProvider = new FirestoreSearchProvider();
