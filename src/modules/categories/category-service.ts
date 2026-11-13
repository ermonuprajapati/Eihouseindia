import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { INITIAL_CATEGORIES } from '@/config/categories';
import type { Category } from '@/types';

export async function fetchCategories(): Promise<Category[]> {
  try {
    const q = query(collection(db, 'categories'), orderBy('order', 'asc'));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      return INITIAL_CATEGORIES;
    }
    return snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        name: String(data.name || ''),
        slug: String(data.slug || docSnap.id),
        description: String(data.description || ''),
        order: Number(data.order || 99),
      };
    });
  } catch {
    return INITIAL_CATEGORIES;
  }
}

export function getStaticCategories(): Category[] {
  return INITIAL_CATEGORIES;
}
