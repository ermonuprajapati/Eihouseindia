'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@/modules/auth/auth-context';
import { recordPostView } from '@/modules/posts/post-service';

export function ArticleViewTracker({ postId }: { postId: string }) {
  const { firebaseUser } = useAuth();
  const recorded = useRef(false);

  useEffect(() => {
    if (recorded.current) return;
    recorded.current = true;
    recordPostView(postId, firebaseUser?.uid).catch(() => undefined);
  }, [postId, firebaseUser?.uid]);

  return null;
}
