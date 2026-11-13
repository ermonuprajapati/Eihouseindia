'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { PenLine, Trash2, ExternalLink, Bell, ShieldAlert, MailCheck } from 'lucide-react';
import { toast } from 'sonner';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/modules/auth/auth-context';
import {
  deleteAuthorDraft,
  getAuthorPostsPaginated,
  getUserNotifications,
  markNotificationRead,
  updateAuthorProfile,
} from '@/modules/posts/post-service';
import { uploadEditorialImage } from '@/modules/storage/storage-service';
import { profileUpdateSchema } from '@/lib/validation';
import type { NotificationItem, Post, PostStatus } from '@/types';

const STATUS_LABELS: Record<PostStatus, string> = {
  DRAFT: 'Draft',
  PENDING: 'Pending Review',
  PUBLISHED: 'Published',
  REJECTED: 'Rejected',
  ARCHIVED: 'Archived',
};

export default function AuthorDashboardPage() {
  const router = useRouter();
  const {
    firebaseUser,
    profile,
    loading: authLoading,
    isEditor,
    resendVerificationEmail,
    refreshProfile,
  } = useAuth();

  const [posts, setPosts] = useState<Post[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // Profile form state
  const [profileOverrides, setProfileOverrides] = useState<{
    displayName?: string;
    username?: string;
    bio?: string;
    website?: string;
    avatar?: string;
  }>({});
  const [savingProfile, setSavingProfile] = useState(false);

  const displayName = profileOverrides.displayName ?? profile?.displayName ?? '';
  const username = profileOverrides.username ?? profile?.username ?? '';
  const bio = profileOverrides.bio ?? profile?.bio ?? '';
  const website = profileOverrides.website ?? profile?.website ?? '';
  const avatar = profileOverrides.avatar ?? profile?.avatar ?? '';

  useEffect(() => {
    if (!authLoading && !firebaseUser) {
      router.replace('/auth/login');
    }
  }, [authLoading, firebaseUser, router]);

  useEffect(() => {
    if (!firebaseUser) return;
    let cancelled = false;
    Promise.all([
      getAuthorPostsPaginated({ authorId: firebaseUser.uid, pageSize: 50 }),
      getUserNotifications(firebaseUser.uid).catch(() => []),
    ])
      .then(([postRes, notifRes]) => {
        if (cancelled) return;
        setPosts(postRes.posts);
        setNotifications(notifRes);
      })
      .catch((error) => {
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : 'Unable to load your articles.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingData(false);
      });
    return () => {
      cancelled = true;
    };
  }, [firebaseUser]);

  const handleDeleteDraft = async (post: Post) => {
    if (post.status !== 'DRAFT') return;
    try {
      await deleteAuthorDraft(post.id);
      setPosts((prev) => prev.filter((p) => p.id !== post.id));
      toast.success('Draft deleted.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not delete draft.');
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    const parsed = profileUpdateSchema.safeParse({
      displayName,
      username,
      bio,
      website,
      avatar,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message || 'Check profile inputs.');
      return;
    }

    setSavingProfile(true);
    try {
      await updateAuthorProfile(profile.uid, parsed.data);
      toast.success('Author profile updated.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Profile update failed.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    try {
      const media = await uploadEditorialImage(file, profile.uid);
      setProfileOverrides((prev) => ({ ...prev, avatar: media.url }));
      toast.success('Avatar uploaded. Click Save Profile to apply.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Upload failed.');
    }
  };

  if (authLoading || !firebaseUser) {
    return (
      <div className="min-h-screen flex flex-col bg-[#FAFBFD]">
        <SiteHeader />
        <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8 space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
          </div>
          <Skeleton className="h-64 w-full" />
        </main>
        <SiteFooter />
      </div>
    );
  }

  const drafts = posts.filter((p) => p.status === 'DRAFT');
  const pending = posts.filter((p) => p.status === 'PENDING');
  const published = posts.filter((p) => p.status === 'PUBLISHED');
  const rejected = posts.filter((p) => p.status === 'REJECTED');
  const totalViews = posts.reduce((sum, p) => sum + (p.viewCount || 0), 0);

  const renderPostTable = (items: Post[], emptyText: string) => {
    if (loadingData) {
      return <Skeleton className="h-48 w-full" />;
    }
    if (items.length === 0) {
      return (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center space-y-3">
          <p className="text-sm text-slate-600">{emptyText}</p>
          <Button asChild size="sm" variant="primary">
            <Link href="/dashboard/editor">Write New Article</Link>
          </Button>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
            <tr>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Words</th>
              <th className="px-4 py-3 text-right">Views</th>
              <th className="px-4 py-3">Updated</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {items.map((post) => (
              <tr key={post.id} className="hover:bg-slate-50/70">
                <td className="px-4 py-3 max-w-xs">
                  <p className="font-medium text-[#0B1528] truncate">{post.title}</p>
                  {post.rejectionReason && (
                    <p className="mt-1 text-xs text-red-700">
                      Reviewer note: {post.rejectionReason}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                  {post.categoryName || post.categoryId}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-xs font-medium">
                  <span
                    className={
                      post.status === 'PUBLISHED'
                        ? 'text-emerald-700'
                        : post.status === 'REJECTED'
                        ? 'text-red-700'
                        : post.status === 'PENDING'
                        ? 'text-amber-700'
                        : 'text-slate-700'
                    }
                  >
                    {STATUS_LABELS[post.status]}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-600">
                  {post.wordCount}
                </td>
                <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-600">
                  {post.viewCount || 0}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-500">
                  {format(new Date(post.updatedAt), 'MMM d, yyyy')}
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap space-x-2">
                  {post.status === 'PUBLISHED' && (
                    <Link
                      href={`/blog/${post.slug}`}
                      className="inline-flex items-center gap-1 text-xs font-medium text-[#1D4ED8] hover:underline"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      <span>View</span>
                    </Link>
                  )}
                  <Link
                    href={`/dashboard/editor/${post.id}`}
                    className="inline-flex items-center text-xs font-medium text-[#0B1528] hover:underline"
                  >
                    Edit
                  </Link>
                  {post.status === 'DRAFT' && (
                    <button
                      type="button"
                      onClick={() => handleDeleteDraft(post)}
                      className="inline-flex items-center text-xs font-medium text-red-700 hover:underline cursor-pointer"
                      aria-label={`Delete ${post.title}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFBFD]">
      <SiteHeader />

      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8 space-y-8">
        {/* Top Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Contributor Workspace
            </p>
            <h1 className="font-display text-3xl font-semibold text-[#0B1528]">
              Welcome, {profile?.displayName || firebaseUser.displayName || 'Engineer'}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {isEditor && (
              <Button asChild variant="outline">
                <Link href="/admin">Admin Console</Link>
              </Button>
            )}
            <Button asChild variant="primary">
              <Link href="/dashboard/editor">
                <PenLine className="h-4 w-4" />
                <span>Write New Article</span>
              </Link>
            </Button>
          </div>
        </div>

        {/* Email verification notice */}
        {!firebaseUser.emailVerified && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm text-amber-900">
            <div className="flex items-start gap-2.5">
              <MailCheck className="h-5 w-5 shrink-0 mt-0.5 text-amber-700" />
              <div>
                <p className="font-semibold">Verify your email address</p>
                <p className="text-xs text-amber-800 mt-0.5">
                  Check your inbox for the Firebase verification link to confirm your account identity.
                </p>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  resendVerificationEmail()
                    .then(() => toast.success('Verification email sent.'))
                    .catch((e) => toast.error(e instanceof Error ? e.message : 'Failed to send email.'))
                }
              >
                Resend Email
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => refreshProfile()}
              >
                Refresh Status
              </Button>
            </div>
          </div>
        )}

        {/* Suspended Banner */}
        {profile?.status === 'SUSPENDED' && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 flex items-center gap-3 text-sm text-red-900">
            <ShieldAlert className="h-5 w-5 shrink-0 text-red-700" />
            <span>
              Your contributor account is currently suspended. You cannot submit new articles or
              comments until restored by an administrator.
            </span>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex flex-wrap h-auto gap-1">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="all">My Articles ({posts.length})</TabsTrigger>
            <TabsTrigger value="drafts">Drafts ({drafts.length})</TabsTrigger>
            <TabsTrigger value="pending">Pending Review ({pending.length})</TabsTrigger>
            <TabsTrigger value="published">Published ({published.length})</TabsTrigger>
            <TabsTrigger value="rejected">Rejected ({rejected.length})</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="profile">Profile Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-8">
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="rounded-lg border border-slate-200 bg-white p-5">
                <p className="text-xs text-slate-500">Total Articles</p>
                <p className="mt-1 font-mono text-2xl font-semibold text-[#0B1528] tabular-nums">
                  {posts.length}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-5">
                <p className="text-xs text-slate-500">Drafts</p>
                <p className="mt-1 font-mono text-2xl font-semibold text-[#0B1528] tabular-nums">
                  {drafts.length}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-5">
                <p className="text-xs text-slate-500">Pending Review</p>
                <p className="mt-1 font-mono text-2xl font-semibold text-amber-700 tabular-nums">
                  {pending.length}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-5">
                <p className="text-xs text-slate-500">Published</p>
                <p className="mt-1 font-mono text-2xl font-semibold text-emerald-700 tabular-nums">
                  {published.length}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-5">
                <p className="text-xs text-slate-500">Total Reads</p>
                <p className="mt-1 font-mono text-2xl font-semibold text-[#1D4ED8] tabular-nums">
                  {totalViews}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4">
                <h2 className="font-display text-xl font-semibold text-[#0B1528]">
                  Recent Activity
                </h2>
                {renderPostTable(posts.slice(0, 6), 'You have not created any articles yet.')}
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-slate-600" />
                  <h2 className="font-display text-xl font-semibold text-[#0B1528]">
                    Notifications
                  </h2>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white divide-y divide-slate-200">
                  {notifications.length === 0 ? (
                    <p className="p-5 text-sm text-slate-500">No editorial notifications yet.</p>
                  ) : (
                    notifications.slice(0, 6).map((n) => (
                      <div key={n.id} className={`p-4 space-y-1 ${n.read ? 'opacity-70' : 'bg-slate-50/50'}`}>
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium text-[#0B1528]">{n.title}</p>
                          {!n.read && (
                            <button
                              type="button"
                              onClick={() =>
                                markNotificationRead(n.id).then(() =>
                                  setNotifications((prev) =>
                                    prev.map((item) =>
                                      item.id === n.id ? { ...item, read: true } : item
                                    )
                                  )
                                )
                              }
                              className="text-xs text-[#1D4ED8] hover:underline cursor-pointer"
                            >
                              Mark read
                            </button>
                          )}
                        </div>
                        <p className="text-xs text-slate-600">{n.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="all">
            {renderPostTable(posts, 'You have not created any articles yet.')}
          </TabsContent>

          <TabsContent value="drafts">
            {renderPostTable(drafts, 'No saved drafts.')}
          </TabsContent>

          <TabsContent value="pending">
            {renderPostTable(pending, 'No articles currently awaiting editorial review.')}
          </TabsContent>

          <TabsContent value="published">
            {renderPostTable(published, 'No published articles yet.')}
          </TabsContent>

          <TabsContent value="rejected">
            {renderPostTable(rejected, 'No rejected submissions.')}
          </TabsContent>

          <TabsContent value="analytics">
            <div className="rounded-lg border border-slate-200 bg-white p-6 space-y-6">
              <div>
                <h2 className="font-display text-xl font-semibold text-[#0B1528]">
                  Author Readership & Output
                </h2>
                <p className="text-sm text-slate-600">
                  Live metrics aggregated strictly from your own published and drafted articles.
                </p>
              </div>
              {published.length === 0 ? (
                <p className="text-sm text-slate-500">
                  Publish your first article to track per-article reads and engagement.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-slate-200 text-xs font-semibold text-slate-500">
                      <tr>
                        <th className="py-2.5 pr-4">Article</th>
                        <th className="py-2.5 px-4 text-right">Word Count</th>
                        <th className="py-2.5 px-4 text-right">Reading Time</th>
                        <th className="py-2.5 pl-4 text-right">Views</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {published.map((p) => (
                        <tr key={p.id}>
                          <td className="py-3 pr-4 font-medium text-[#0B1528]">{p.title}</td>
                          <td className="py-3 px-4 text-right font-mono tabular-nums">{p.wordCount}</td>
                          <td className="py-3 px-4 text-right font-mono tabular-nums">{p.readingTime} min</td>
                          <td className="py-3 pl-4 text-right font-mono tabular-nums font-semibold text-[#1D4ED8]">
                            {p.viewCount || 0}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="profile">
            <form
              onSubmit={handleSaveProfile}
              className="max-w-2xl rounded-lg border border-slate-200 bg-white p-6 space-y-5"
            >
              <h2 className="font-display text-xl font-semibold text-[#0B1528]">
                Public Author Profile Settings
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="prof-name">Display Name</Label>
                  <Input
                    id="prof-name"
                    value={displayName}
                    onChange={(e) =>
                      setProfileOverrides((prev) => ({ ...prev, displayName: e.target.value }))
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prof-username">Username</Label>
                  <Input
                    id="prof-username"
                    value={username}
                    onChange={(e) =>
                      setProfileOverrides((prev) => ({
                        ...prev,
                        username: e.target.value.toLowerCase(),
                      }))
                    }
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="prof-bio">Engineering Bio</Label>
                <Textarea
                  id="prof-bio"
                  value={bio}
                  onChange={(e) => setProfileOverrides((prev) => ({ ...prev, bio: e.target.value }))}
                  rows={3}
                  maxLength={500}
                  placeholder="Hardware architect, embedded firmware engineer, or researcher..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="prof-website">Website / Portfolio</Label>
                  <Input
                    id="prof-website"
                    value={website}
                    onChange={(e) =>
                      setProfileOverrides((prev) => ({ ...prev, website: e.target.value }))
                    }
                    placeholder="https://example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prof-avatar">Avatar Image URL or Upload</Label>
                  <div className="flex gap-2">
                    <Input
                      id="prof-avatar"
                      value={avatar}
                      onChange={(e) =>
                        setProfileOverrides((prev) => ({ ...prev, avatar: e.target.value }))
                      }
                      placeholder="https://..."
                    />
                    <label className="inline-flex h-10 items-center justify-center rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-[#0B1528] hover:bg-slate-50 cursor-pointer whitespace-nowrap">
                      Upload
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/avif"
                        className="hidden"
                        onChange={handleAvatarUpload}
                      />
                    </label>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between">
                {profile?.username && (
                  <Link
                    href={`/author/${profile.username}`}
                    className="text-xs font-medium text-[#1D4ED8] hover:underline"
                  >
                    Preview public profile
                  </Link>
                )}
                <Button type="submit" variant="primary" disabled={savingProfile}>
                  {savingProfile ? 'Saving...' : 'Save Profile'}
                </Button>
              </div>
            </form>
          </TabsContent>
        </Tabs>
      </main>

      <SiteFooter />
    </div>
  );
}
