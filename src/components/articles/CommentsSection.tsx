'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { Flag } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/modules/auth/auth-context';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { commentSchema, reportSchema } from '@/lib/validation';
import { createArticleComment, createContentReport } from '@/modules/posts/post-service';
import type { Comment } from '@/types';

export function CommentsSection({
  postId,
  postTitle,
  initialComments,
}: {
  postId: string;
  postTitle: string;
  initialComments: Comment[];
}) {
  const { firebaseUser, profile } = useAuth();
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [content, setContent] = useState('');
  const [posting, setPosting] = useState(false);

  const [reportTarget, setReportTarget] = useState<{
    type: 'POST' | 'COMMENT';
    id: string;
    title: string;
  } | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [reporting, setReporting] = useState(false);

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) {
      toast.error('Please sign in to post a comment.');
      return;
    }
    if (profile.status === 'SUSPENDED') {
      toast.error('Your account is currently suspended from commenting.');
      return;
    }

    const parsed = commentSchema.safeParse({ postId, content });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message || 'Invalid comment.');
      return;
    }

    setPosting(true);
    try {
      const id = await createArticleComment({
        postId,
        author: profile,
        content: parsed.data.content,
      });

      const optimistic: Comment = {
        id,
        postId,
        authorId: profile.uid,
        authorName: profile.displayName,
        authorUsername: profile.username,
        authorAvatar: profile.avatar,
        content: parsed.data.content,
        status: 'VISIBLE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setComments((prev) => [optimistic, ...prev]);
      setContent('');
      toast.success('Comment published.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to post comment.');
    } finally {
      setPosting(false);
    }
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || !reportTarget) return;
    const parsed = reportSchema.safeParse({
      targetType: reportTarget.type,
      targetId: reportTarget.id,
      reason: reportReason,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message || 'Provide a clearer reason.');
      return;
    }

    setReporting(true);
    try {
      await createContentReport({
        targetType: reportTarget.type,
        targetId: reportTarget.id,
        targetTitle: reportTarget.title,
        reporterId: firebaseUser.uid,
        reason: parsed.data.reason,
      });
      toast.success('Report submitted to the moderation desk.');
      setReportTarget(null);
      setReportReason('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to submit report.');
    } finally {
      setReporting(false);
    }
  };

  return (
    <section className="mt-12 border-t border-slate-200 pt-10" aria-labelledby="comments-heading">
      <div className="flex items-center justify-between gap-4 mb-6">
        <h2 id="comments-heading" className="font-display text-2xl font-semibold text-[#0B1528]">
          Technical Discussion ({comments.length})
        </h2>
        {firebaseUser && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() =>
              setReportTarget({ type: 'POST', id: postId, title: postTitle })
            }
          >
            <Flag className="h-4 w-4 text-slate-500" />
            <span>Report Article</span>
          </Button>
        )}
      </div>

      {firebaseUser ? (
        <form onSubmit={handleCommentSubmit} className="mb-8 space-y-3">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Share engineering feedback, benchmarks, or questions..."
            rows={3}
            maxLength={2000}
            required
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 tabular-nums">
              {content.length}/2000 characters
            </span>
            <Button type="submit" disabled={posting}>
              {posting ? 'Posting...' : 'Post Comment'}
            </Button>
          </div>
        </form>
      ) : (
        <div className="mb-8 rounded-lg border border-slate-200 bg-slate-50 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <p className="text-sm text-slate-700">
            Sign in with your EIHOUSE INDIA account to join the technical discussion.
          </p>
          <Button asChild size="sm">
            <Link href="/auth/login">Sign In to Comment</Link>
          </Button>
        </div>
      )}

      {comments.length === 0 ? (
        <p className="text-sm text-slate-500 py-4">
          No comments yet. Be the first engineer to contribute to this discussion.
        </p>
      ) : (
        <div className="divide-y divide-slate-200">
          {comments.map((comment) => (
            <div key={comment.id} className="py-5">
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Link
                    href={`/author/${comment.authorUsername}`}
                    className="font-semibold text-sm text-[#0B1528] hover:underline"
                  >
                    {comment.authorName}
                  </Link>
                  <span aria-hidden="true">·</span>
                  <time dateTime={comment.createdAt}>
                    {format(new Date(comment.createdAt), 'MMM d, yyyy')}
                  </time>
                </div>
                {firebaseUser && (
                  <button
                    type="button"
                    onClick={() =>
                      setReportTarget({
                        type: 'COMMENT',
                        id: comment.id,
                        title: `Comment by ${comment.authorName}`,
                      })
                    }
                    className="text-xs text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                  >
                    Report
                  </button>
                )}
              </div>
              <p className="text-sm leading-relaxed text-slate-800 whitespace-pre-line">
                {comment.content}
              </p>
            </div>
          ))}
        </div>
      )}

      <Dialog open={Boolean(reportTarget)} onOpenChange={(open) => !open && setReportTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report Content</DialogTitle>
            <DialogDescription>
              Flagging: {reportTarget?.title}. Describe why this violates community or technical accuracy standards.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitReport} className="space-y-4">
            <Textarea
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              placeholder="Explain the issue (at least 10 characters)..."
              rows={4}
              required
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setReportTarget(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="destructive" disabled={reporting}>
                {reporting ? 'Submitting...' : 'Submit Report'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
