'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import {
  CheckCircle2,
  XCircle,
  MessageSquareWarning,
  Star,
  Plus,
  Trash2,
  ShieldAlert,
  RefreshCw,
  ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { UserTrafficAnalytics } from '@/components/admin/UserTrafficAnalytics';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/modules/auth/auth-context';
import {
  deleteCategoryAdmin,
  deleteTagAdmin,
  getAdminDashboardStats,
  getAllTagsAdmin,
  getAllUsersForAdmin,
  getCommentsForAdmin,
  getMediaLibraryAdmin,
  getModerationLogsAdmin,
  getPostsForAdmin,
  getReportsForAdmin,
  getSiteSettingsClient,
  moderateCommentAdmin,
  moderatePostDecision,
  resolveReportAdmin,
  saveCategoryAdmin,
  saveSiteSettingsAdmin,
  seedInitialCategories,
  togglePostFeatured,
  updateUserRoleAndStatus,
  type AdminDashboardStats,
} from '@/modules/admin/admin-service';
import { fetchCategories } from '@/modules/categories/category-service';
import { deleteEditorialMedia } from '@/modules/storage/storage-service';
import { categorySchema, slugify } from '@/lib/validation';
import type {
  Category,
  Comment,
  MediaItem,
  ModerationLog,
  Post,
  ReportItem,
  SiteSettings,
  Tag,
  UserProfile,
  UserRole,
} from '@/types';

type AdminSection =
  | 'dashboard'
  | 'all-articles'
  | 'pending'
  | 'published'
  | 'rejected'
  | 'users'
  | 'categories'
  | 'tags'
  | 'comments'
  | 'media'
  | 'reports'
  | 'analytics'
  | 'settings';

export default function AdminPanelPage() {
  const router = useRouter();
  const { firebaseUser, profile, loading: authLoading, isAdmin, isEditor, effectiveRole } = useAuth();

  const [section, setSection] = useState<AdminSection>('dashboard');
  const [loadingData, setLoadingData] = useState(true);
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [logs, setLogs] = useState<ModerationLog[]>([]);
  const [settings, setSettings] = useState<SiteSettings | null>(null);

  // Moderation modal state
  const [modModal, setModModal] = useState<{
    post: Post;
    decision: 'REJECT' | 'REQUEST_CHANGES';
  } | null>(null);
  const [modReason, setModReason] = useState('');
  const [submittingMod, setSubmittingMod] = useState(false);

  // Category modal state
  const [catForm, setCatForm] = useState<{
    id: string;
    name: string;
    slug: string;
    description: string;
    order: number;
    isNew: boolean;
  } | null>(null);

  const loadAllAdminData = useCallback(async (showSpinner = true) => {
    if (!firebaseUser || !isEditor) return;
    if (showSpinner) {
      setLoadingData(true);
    }
    try {
      const [
        statsRes,
        postsRes,
        catsRes,
        tagsRes,
        commentsRes,
        mediaRes,
        reportsRes,
        logsRes,
        settingsRes,
        usersRes,
      ] = await Promise.all([
        getAdminDashboardStats().catch(() => null),
        getPostsForAdmin().catch(() => []),
        fetchCategories(),
        getAllTagsAdmin().catch(() => []),
        getCommentsForAdmin().catch(() => []),
        getMediaLibraryAdmin().catch(() => []),
        getReportsForAdmin().catch(() => []),
        getModerationLogsAdmin().catch(() => []),
        getSiteSettingsClient(),
        isAdmin ? getAllUsersForAdmin().catch(() => []) : Promise.resolve([]),
      ]);

      setStats(statsRes);
      setPosts(postsRes);
      setCategories(catsRes);
      setTags(tagsRes);
      setComments(commentsRes);
      setMedia(mediaRes);
      setReports(reportsRes);
      setLogs(logsRes);
      setSettings(settingsRes);
      setUsers(usersRes);
    } finally {
      setLoadingData(false);
    }
  }, [firebaseUser, isAdmin, isEditor]);

  useEffect(() => {
    if (!authLoading && !firebaseUser) {
      router.replace('/auth/login');
    }
  }, [authLoading, firebaseUser, router]);

  useEffect(() => {
    if (firebaseUser && isEditor) {
      void Promise.resolve().then(() => loadAllAdminData(false));
    }
  }, [firebaseUser, isEditor, loadAllAdminData]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-[#FAFBFD]">
        <SiteHeader />
        <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-12 space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-96 w-full" />
        </main>
        <SiteFooter />
      </div>
    );
  }

  if (!firebaseUser || !isEditor || !profile) {
    return (
      <div className="min-h-screen flex flex-col bg-[#FAFBFD]">
        <SiteHeader />
        <main className="flex-1 mx-auto max-w-2xl px-4 py-20 text-center space-y-4">
          <ShieldAlert className="h-10 w-10 text-red-700 mx-auto" />
          <h1 className="font-display text-3xl font-semibold text-[#0B1528]">
            Editorial Access Required
          </h1>
          <p className="text-sm text-slate-600">
            This console is restricted to verified EIHOUSE INDIA Editors and Administrators.
          </p>
          <Button asChild variant="outline">
            <Link href="/dashboard">Return to Author Dashboard</Link>
          </Button>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const handleApprove = async (post: Post) => {
    try {
      await moderatePostDecision({
        post,
        decision: 'APPROVE',
        actor: profile,
        actorRole: effectiveRole,
      });
      // Non-blocking author email trigger
      const targetUser = users.find((u) => u.uid === post.authorId);
      if (targetUser?.email) {
        fetch('/api/notifications/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: targetUser.email,
            event: 'ARTICLE_APPROVED',
            recipientName: targetUser.displayName,
            articleTitle: post.title,
            articleSlug: post.slug,
          }),
        }).catch(() => undefined);
      }
      toast.success(`Published "${post.title}".`);
      loadAllAdminData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Approval failed.');
    }
  };

  const handleModModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modModal) return;
    setSubmittingMod(true);
    try {
      await moderatePostDecision({
        post: modModal.post,
        decision: modModal.decision,
        reason: modReason,
        actor: profile,
        actorRole: effectiveRole,
      });
      const targetUser = users.find((u) => u.uid === modModal.post.authorId);
      if (targetUser?.email) {
        fetch('/api/notifications/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: targetUser.email,
            event: modModal.decision === 'REJECT' ? 'ARTICLE_REJECTED' : 'CHANGES_REQUESTED',
            recipientName: targetUser.displayName,
            articleTitle: modModal.post.title,
            reason: modReason,
          }),
        }).catch(() => undefined);
      }
      toast.success(
        modModal.decision === 'REJECT' ? 'Submission rejected.' : 'Changes requested.'
      );
      setModModal(null);
      setModReason('');
      loadAllAdminData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Moderation failed.');
    } finally {
      setSubmittingMod(false);
    }
  };

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catForm) return;
    const parsed = categorySchema.safeParse({
      name: catForm.name,
      slug: slugify(catForm.slug || catForm.name),
      description: catForm.description,
      order: Number(catForm.order),
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message || 'Invalid category data.');
      return;
    }

    const catId = catForm.isNew ? parsed.data.slug : catForm.id;
    try {
      await saveCategoryAdmin(
        {
          id: catId,
          name: parsed.data.name,
          slug: parsed.data.slug,
          description: parsed.data.description,
          order: parsed.data.order,
        },
        catForm.isNew,
        profile
      );
      toast.success(catForm.isNew ? 'Category created.' : 'Category updated.');
      setCatForm(null);
      loadAllAdminData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save category.');
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    try {
      await saveSiteSettingsAdmin(
        {
          siteName: settings.siteName,
          tagline: settings.tagline,
          description: settings.description,
          contactEmail: settings.contactEmail,
          allowRegistrations: settings.allowRegistrations,
          requireEmailVerification: settings.requireEmailVerification,
          maintenanceMode: settings.maintenanceMode,
        },
        profile
      );
      toast.success('Website settings saved.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save settings.');
    }
  };

  const pendingPosts = posts.filter((p) => p.status === 'PENDING');
  const publishedPosts = posts.filter((p) => p.status === 'PUBLISHED');
  const rejectedPosts = posts.filter((p) => p.status === 'REJECTED');

  const navItems: Array<{ id: AdminSection; label: string; adminOnly?: boolean }> = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'pending', label: `Pending Reviews (${pendingPosts.length})` },
    { id: 'all-articles', label: 'All Articles' },
    { id: 'published', label: 'Published Articles' },
    { id: 'rejected', label: 'Rejected Articles' },
    { id: 'users', label: 'Users Management', adminOnly: true },
    { id: 'categories', label: 'Categories', adminOnly: true },
    { id: 'tags', label: 'Tags' },
    { id: 'comments', label: 'Comments' },
    { id: 'media', label: 'Media Library' },
    { id: 'reports', label: 'Reports' },
    { id: 'analytics', label: 'Traffic & Analytics' },
    { id: 'settings', label: 'Website Settings', adminOnly: true },
  ];

  const renderPostsTable = (list: Post[]) => (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
          <tr>
            <th className="px-4 py-3">Article</th>
            <th className="px-4 py-3">Author</th>
            <th className="px-4 py-3">Category</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3 text-right">Views</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {list.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                No articles in this queue.
              </td>
            </tr>
          ) : (
            list.map((post) => (
              <tr key={post.id} className="hover:bg-slate-50/70">
                <td className="px-4 py-3 max-w-xs">
                  <p className="font-medium text-[#0B1528] truncate">{post.title}</p>
                  <p className="text-xs font-mono text-slate-400 truncate">/{post.slug}</p>
                  {post.rejectionReason && (
                    <p className="mt-1 text-xs text-red-700">Note: {post.rejectionReason}</p>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                  {post.authorName || post.authorUsername}
                </td>
                <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                  {post.categoryName || post.categoryId}
                </td>
                <td className="px-4 py-3 text-xs font-semibold whitespace-nowrap">
                  {post.status}
                </td>
                <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-600">
                  {post.viewCount || 0}
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap space-x-2">
                  {post.status !== 'PUBLISHED' && (
                    <Button size="sm" variant="primary" onClick={() => handleApprove(post)}>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Approve</span>
                    </Button>
                  )}
                  {post.status === 'PENDING' && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setModModal({ post, decision: 'REQUEST_CHANGES' });
                          setModReason('');
                        }}
                      >
                        <MessageSquareWarning className="h-3.5 w-3.5" />
                        <span>Request Changes</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          setModModal({ post, decision: 'REJECT' });
                          setModReason('');
                        }}
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        <span>Reject</span>
                      </Button>
                    </>
                  )}
                  {post.status === 'PUBLISHED' && (
                    <Button
                      size="sm"
                      variant={post.featured ? 'default' : 'outline'}
                      onClick={() =>
                        togglePostFeatured(post, !post.featured, profile, effectiveRole).then(() => {
                          toast.success(post.featured ? 'Unfeatured article.' : 'Marked as featured.');
                          loadAllAdminData();
                        })
                      }
                    >
                      <Star className="h-3.5 w-3.5" />
                      <span>{post.featured ? 'Featured' : 'Feature'}</span>
                    </Button>
                  )}
                  <Button asChild size="sm" variant="ghost">
                    <Link href={`/dashboard/editor/${post.id}`}>Edit</Link>
                  </Button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFBFD]">
      <SiteHeader />

      <div className="flex-1 mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6 mb-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#1D4ED8]">
              {effectiveRole} Editorial Console
            </p>
            <h1 className="font-display text-3xl font-semibold text-[#0B1528]">
              EIHOUSE INDIA Administration
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => void loadAllAdminData()}>
              <RefreshCw className="h-4 w-4" />
              <span>Refresh</span>
            </Button>
            <Button asChild variant="primary" size="sm">
              <Link href="/dashboard/editor">Write & Publish Article</Link>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Sidebar */}
          <aside className="lg:col-span-3">
            <nav className="rounded-lg border border-slate-200 bg-white p-2 space-y-1">
              {navItems
                .filter((item) => !item.adminOnly || isAdmin)
                .map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSection(item.id)}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                      section === item.id
                        ? 'bg-[#0B1528] text-white'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
            </nav>
          </aside>

          {/* Main Admin Viewport */}
          <div className="lg:col-span-9 space-y-6">
            {loadingData ? (
              <Skeleton className="h-96 w-full" />
            ) : (
              <>
                {section === 'dashboard' && (
                  <div className="space-y-8">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      <div className="rounded-lg border border-slate-200 bg-white p-5">
                        <p className="text-xs text-slate-500">Total Users</p>
                        <p className="mt-1 font-mono text-2xl font-semibold tabular-nums">
                          {stats?.totalUsers ?? 0}
                        </p>
                      </div>
                      <div className="rounded-lg border border-slate-200 bg-white p-5">
                        <p className="text-xs text-slate-500">Total Articles</p>
                        <p className="mt-1 font-mono text-2xl font-semibold tabular-nums">
                          {stats?.totalArticles ?? posts.length}
                        </p>
                      </div>
                      <div className="rounded-lg border border-slate-200 bg-white p-5">
                        <p className="text-xs text-slate-500">Published Articles</p>
                        <p className="mt-1 font-mono text-2xl font-semibold text-emerald-700 tabular-nums">
                          {stats?.publishedArticles ?? publishedPosts.length}
                        </p>
                      </div>
                      <div className="rounded-lg border border-slate-200 bg-white p-5">
                        <p className="text-xs text-slate-500">Pending Review</p>
                        <p className="mt-1 font-mono text-2xl font-semibold text-amber-700 tabular-nums">
                          {stats?.pendingArticles ?? pendingPosts.length}
                        </p>
                      </div>
                      <div className="rounded-lg border border-slate-200 bg-white p-5">
                        <p className="text-xs text-slate-500">Rejected Articles</p>
                        <p className="mt-1 font-mono text-2xl font-semibold text-red-700 tabular-nums">
                          {stats?.rejectedArticles ?? rejectedPosts.length}
                        </p>
                      </div>
                      <div className="rounded-lg border border-slate-200 bg-white p-5">
                        <p className="text-xs text-slate-500">Total Comments</p>
                        <p className="mt-1 font-mono text-2xl font-semibold tabular-nums">
                          {stats?.totalComments ?? comments.length}
                        </p>
                      </div>

                      {/* Quick link to live analytics */}
                      <button
                        type="button"
                        onClick={() => setSection('analytics')}
                        className="rounded-lg border border-slate-200 bg-gradient-to-r from-slate-50 to-white p-5 text-left hover:border-slate-300 transition-all group col-span-2 sm:col-span-3 flex items-center justify-between"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-xs font-semibold text-[#172D4D]">
                            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span>Live User Traffic Telemetry</span>
                          </div>
                          <p className="font-display text-base font-bold text-[#0B1528]">
                            View 24h, 30-Day &amp; 3-Month Visitor Analytics →
                          </p>
                          <p className="text-xs text-slate-500">
                            See how many unique users are arriving, top pages viewed, and device distributions.
                          </p>
                        </div>
                        <div className="h-10 w-10 rounded-xl bg-[#172D4D] text-white flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                          <ArrowRight className="h-5 w-5" />
                        </div>
                      </button>
                    </div>

                    <div className="space-y-3">
                      <h2 className="font-display text-xl font-semibold text-[#0B1528]">
                        Recent Submissions Queue
                      </h2>
                      {renderPostsTable(stats?.recentSubmissions || pendingPosts.slice(0, 5))}
                    </div>

                    <div className="space-y-3">
                      <h2 className="font-display text-xl font-semibold text-[#0B1528]">
                        Popular Published Articles
                      </h2>
                      {renderPostsTable(stats?.popularArticles || publishedPosts.slice(0, 5))}
                    </div>
                  </div>
                )}

                {section === 'pending' && (
                  <div className="space-y-4">
                    <h2 className="font-display text-2xl font-semibold text-[#0B1528]">
                      Pending Editorial Reviews
                    </h2>
                    {renderPostsTable(pendingPosts)}
                  </div>
                )}

                {section === 'all-articles' && (
                  <div className="space-y-4">
                    <h2 className="font-display text-2xl font-semibold text-[#0B1528]">
                      All Articles ({posts.length})
                    </h2>
                    {renderPostsTable(posts)}
                  </div>
                )}

                {section === 'published' && (
                  <div className="space-y-4">
                    <h2 className="font-display text-2xl font-semibold text-[#0B1528]">
                      Published Articles ({publishedPosts.length})
                    </h2>
                    {renderPostsTable(publishedPosts)}
                  </div>
                )}

                {section === 'rejected' && (
                  <div className="space-y-4">
                    <h2 className="font-display text-2xl font-semibold text-[#0B1528]">
                      Rejected Articles ({rejectedPosts.length})
                    </h2>
                    {renderPostsTable(rejectedPosts)}
                  </div>
                )}

                {section === 'users' && isAdmin && (
                  <div className="space-y-4">
                    <h2 className="font-display text-2xl font-semibold text-[#0B1528]">
                      Users Management
                    </h2>
                    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                      <table className="w-full text-left text-sm">
                        <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                          <tr>
                            <th className="px-4 py-3">User</th>
                            <th className="px-4 py-3">Email</th>
                            <th className="px-4 py-3">Role</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {users.map((u) => (
                            <tr key={u.uid}>
                              <td className="px-4 py-3">
                                <p className="font-medium text-[#0B1528]">{u.displayName}</p>
                                <p className="text-xs text-slate-500">@{u.username}</p>
                              </td>
                              <td className="px-4 py-3 text-slate-600">{u.email}</td>
                              <td className="px-4 py-3">
                                <select
                                  value={u.role}
                                  aria-label={`Role for ${u.displayName}`}
                                  onChange={(e) => {
                                    const nextRole = e.target.value as UserRole;
                                    updateUserRoleAndStatus({
                                      targetUser: u,
                                      role: nextRole,
                                      status: u.status,
                                      actor: profile,
                                    }).then(() => {
                                      toast.success(`Updated role to ${nextRole}.`);
                                      loadAllAdminData();
                                    });
                                  }}
                                  className="rounded border border-slate-200 px-2 py-1 text-xs"
                                >
                                  <option value="USER">USER</option>
                                  <option value="EDITOR">EDITOR</option>
                                  <option value="ADMIN">ADMIN</option>
                                </select>
                              </td>
                              <td className="px-4 py-3 text-xs font-semibold">
                                <span className={u.status === 'ACTIVE' ? 'text-emerald-700' : 'text-red-700'}>
                                  {u.status}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <Button
                                  size="sm"
                                  variant={u.status === 'ACTIVE' ? 'destructive' : 'outline'}
                                  onClick={() =>
                                    updateUserRoleAndStatus({
                                      targetUser: u,
                                      role: u.role,
                                      status: u.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE',
                                      actor: profile,
                                    }).then(() => {
                                      toast.success(
                                        u.status === 'ACTIVE' ? 'User suspended.' : 'User restored.'
                                      );
                                      loadAllAdminData();
                                    })
                                  }
                                >
                                  {u.status === 'ACTIVE' ? 'Suspend' : 'Restore'}
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {section === 'categories' && isAdmin && (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h2 className="font-display text-2xl font-semibold text-[#0B1528]">
                        Editorial Categories
                      </h2>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            seedInitialCategories(profile).then(() => {
                              toast.success('Seeded 10 initial categories in Firestore.');
                              loadAllAdminData();
                            })
                          }
                        >
                          Sync Default 10 Categories
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() =>
                            setCatForm({
                              id: '',
                              name: '',
                              slug: '',
                              description: '',
                              order: categories.length + 1,
                              isNew: true,
                            })
                          }
                        >
                          <Plus className="h-4 w-4" />
                          <span>New Category</span>
                        </Button>
                      </div>
                    </div>

                    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                      <table className="w-full text-left text-sm">
                        <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                          <tr>
                            <th className="px-4 py-3">Order</th>
                            <th className="px-4 py-3">Name</th>
                            <th className="px-4 py-3">Slug</th>
                            <th className="px-4 py-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {categories.map((cat) => (
                            <tr key={cat.id}>
                              <td className="px-4 py-3 font-mono tabular-nums">{cat.order}</td>
                              <td className="px-4 py-3 font-medium text-[#0B1528]">{cat.name}</td>
                              <td className="px-4 py-3 font-mono text-xs text-slate-500">{cat.slug}</td>
                              <td className="px-4 py-3 text-right space-x-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setCatForm({ ...cat, isNew: false })}
                                >
                                  Edit
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-red-700"
                                  onClick={() =>
                                    deleteCategoryAdmin(cat.id, profile).then(() => {
                                      toast.success('Category deleted.');
                                      loadAllAdminData();
                                    })
                                  }
                                >
                                  Delete
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {section === 'tags' && (
                  <div className="space-y-4">
                    <h2 className="font-display text-2xl font-semibold text-[#0B1528]">
                      Tags ({tags.length})
                    </h2>
                    <div className="rounded-lg border border-slate-200 bg-white divide-y divide-slate-200">
                      {tags.length === 0 ? (
                        <p className="p-6 text-sm text-slate-500">No tags created yet.</p>
                      ) : (
                        tags.map((tag) => (
                          <div key={tag.id} className="px-4 py-3 flex items-center justify-between text-sm">
                            <div>
                              <span className="font-medium text-[#0B1528]">{tag.name}</span>
                              <span className="ml-2 font-mono text-xs text-slate-400">#{tag.slug}</span>
                            </div>
                            {isAdmin && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-700"
                                onClick={() =>
                                  deleteTagAdmin(tag.id).then(() => {
                                    toast.success('Tag removed.');
                                    loadAllAdminData();
                                  })
                                }
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {section === 'comments' && (
                  <div className="space-y-4">
                    <h2 className="font-display text-2xl font-semibold text-[#0B1528]">
                      Comments Moderation ({comments.length})
                    </h2>
                    <div className="rounded-lg border border-slate-200 bg-white divide-y divide-slate-200">
                      {comments.length === 0 ? (
                        <p className="p-6 text-sm text-slate-500">No reader comments yet.</p>
                      ) : (
                        comments.map((c) => (
                          <div key={c.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="space-y-1">
                              <p className="text-xs text-slate-500">
                                <span className="font-semibold text-[#0B1528]">{c.authorName}</span> · {c.status}
                              </p>
                              <p className="text-sm text-slate-800">{c.content}</p>
                            </div>
                            <div className="flex gap-2 shrink-0">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  moderateCommentAdmin(
                                    c.id,
                                    c.status === 'VISIBLE' ? 'HIDDEN' : 'VISIBLE',
                                    profile,
                                    effectiveRole
                                  ).then(() => {
                                    toast.success('Comment visibility updated.');
                                    loadAllAdminData();
                                  })
                                }
                              >
                                {c.status === 'VISIBLE' ? 'Hide' : 'Restore'}
                              </Button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {section === 'media' && (
                  <div className="space-y-4">
                    <h2 className="font-display text-2xl font-semibold text-[#0B1528]">
                      Media Library ({media.length})
                    </h2>
                    {media.length === 0 ? (
                      <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-500">
                        No uploaded images recorded in Firebase Storage yet.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {media.map((m) => (
                          <div key={m.id} className="rounded-lg border border-slate-200 bg-white overflow-hidden">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={m.url}
                              alt={m.fileName}
                              referrerPolicy="no-referrer"
                              className="aspect-[4/3] w-full object-cover bg-slate-100"
                            />
                            <div className="p-3 flex items-center justify-between gap-2 text-xs">
                              <span className="truncate text-slate-700">{m.fileName}</span>
                              {isAdmin && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-red-700"
                                  onClick={() =>
                                    deleteEditorialMedia(m).then(() => {
                                      toast.success('Media deleted.');
                                      loadAllAdminData();
                                    })
                                  }
                                >
                                  Delete
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {section === 'reports' && (
                  <div className="space-y-4">
                    <h2 className="font-display text-2xl font-semibold text-[#0B1528]">
                      Content Reports ({reports.length})
                    </h2>
                    <div className="rounded-lg border border-slate-200 bg-white divide-y divide-slate-200">
                      {reports.length === 0 ? (
                        <p className="p-6 text-sm text-slate-500">No open or historical reports.</p>
                      ) : (
                        reports.map((rep) => (
                          <div key={rep.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="space-y-1">
                              <p className="text-xs font-semibold text-slate-500">
                                {rep.targetType} · {rep.status}
                              </p>
                              <p className="text-sm font-medium text-[#0B1528]">
                                {rep.targetTitle || rep.targetId}
                              </p>
                              <p className="text-sm text-slate-700">{rep.reason}</p>
                            </div>
                            {rep.status === 'OPEN' && (
                              <div className="flex gap-2 shrink-0">
                                <Button
                                  size="sm"
                                  variant="primary"
                                  onClick={() =>
                                    resolveReportAdmin({
                                      reportId: rep.id,
                                      status: 'RESOLVED',
                                      resolutionNote: 'Reviewed and actioned by editorial desk.',
                                      actor: profile,
                                      actorRole: effectiveRole,
                                    }).then(() => {
                                      toast.success('Report resolved.');
                                      loadAllAdminData();
                                    })
                                  }
                                >
                                  Resolve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    resolveReportAdmin({
                                      reportId: rep.id,
                                      status: 'DISMISSED',
                                      resolutionNote: 'No policy violation found.',
                                      actor: profile,
                                      actorRole: effectiveRole,
                                    }).then(() => {
                                      toast.success('Report dismissed.');
                                      loadAllAdminData();
                                    })
                                  }
                                >
                                  Dismiss
                                </Button>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {section === 'analytics' && (
                  <div className="space-y-10">
                    <UserTrafficAnalytics users={users} />

                    <div className="space-y-4 pt-6 border-t border-slate-200">
                      <div>
                        <h2 className="font-display text-xl font-bold text-[#0B1528]">
                          Moderation &amp; Administrative Audit Logs
                        </h2>
                        <p className="text-xs text-slate-500">
                          Immutable security logs of actions taken by editors and administrators
                        </p>
                      </div>
                      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                        <table className="w-full text-left text-sm">
                          <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                            <tr>
                              <th className="px-4 py-3">Timestamp</th>
                              <th className="px-4 py-3">Actor</th>
                              <th className="px-4 py-3">Action</th>
                              <th className="px-4 py-3">Target</th>
                              <th className="px-4 py-3">Details</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {logs.length === 0 ? (
                              <tr>
                                <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                                  No moderation actions logged yet.
                                </td>
                              </tr>
                            ) : (
                              logs.map((log) => (
                                <tr key={log.id}>
                                  <td className="px-4 py-3 font-mono text-xs text-slate-500 whitespace-nowrap">
                                    {format(new Date(log.createdAt), 'MMM d, HH:mm')}
                                  </td>
                                  <td className="px-4 py-3 text-xs text-slate-700">
                                    {log.actorEmail || log.actorId} ({log.actorRole})
                                  </td>
                                  <td className="px-4 py-3 font-mono text-xs font-semibold text-[#0B1528]">
                                    {log.action}
                                  </td>
                                  <td className="px-4 py-3 font-mono text-xs text-slate-600">
                                    {log.targetType}:{log.targetId}
                                  </td>
                                  <td className="px-4 py-3 text-xs text-slate-600">{log.reason}</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {section === 'settings' && isAdmin && settings && (
                  <form
                    onSubmit={handleSaveSettings}
                    className="max-w-2xl rounded-lg border border-slate-200 bg-white p-6 space-y-5"
                  >
                    <h2 className="font-display text-2xl font-semibold text-[#0B1528]">
                      Website Settings
                    </h2>
                    <div className="space-y-2">
                      <Label htmlFor="set-name">Site Name</Label>
                      <Input
                        id="set-name"
                        value={settings.siteName}
                        onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="set-tagline">Tagline</Label>
                      <Input
                        id="set-tagline"
                        value={settings.tagline}
                        onChange={(e) => setSettings({ ...settings, tagline: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="set-desc">Meta Description</Label>
                      <Textarea
                        id="set-desc"
                        value={settings.description}
                        onChange={(e) => setSettings({ ...settings, description: e.target.value })}
                        rows={3}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="set-email">Editorial Contact Email</Label>
                      <Input
                        id="set-email"
                        value={settings.contactEmail}
                        onChange={(e) => setSettings({ ...settings, contactEmail: e.target.value })}
                      />
                    </div>

                    <div className="space-y-3 border-t border-slate-200 pt-4">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="set-reg">Allow New Registrations</Label>
                        <Switch
                          id="set-reg"
                          checked={settings.allowRegistrations}
                          onCheckedChange={(v) =>
                            setSettings({ ...settings, allowRegistrations: v })
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="set-verify">Require Email Verification for Submissions</Label>
                        <Switch
                          id="set-verify"
                          checked={settings.requireEmailVerification}
                          onCheckedChange={(v) =>
                            setSettings({ ...settings, requireEmailVerification: v })
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="set-maint">Maintenance Mode</Label>
                        <Switch
                          id="set-maint"
                          checked={settings.maintenanceMode}
                          onCheckedChange={(v) => setSettings({ ...settings, maintenanceMode: v })}
                        />
                      </div>
                    </div>

                    <Button type="submit" variant="primary">
                      Save Website Settings
                    </Button>
                  </form>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Reject / Request Changes Dialog */}
      <Dialog open={Boolean(modModal)} onOpenChange={(o) => !o && setModModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {modModal?.decision === 'REJECT' ? 'Reject Submission' : 'Request Editorial Changes'}
            </DialogTitle>
            <DialogDescription>
              Provide clear technical or editorial feedback for &ldquo;{modModal?.post.title}&rdquo;.
              This note is visible to the author and logged in moderationLogs.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleModModalSubmit} className="space-y-4">
            <Textarea
              value={modReason}
              onChange={(e) => setModReason(e.target.value)}
              placeholder="Explain required revisions or rejection reason..."
              rows={4}
              required
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModModal(null)}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant={modModal?.decision === 'REJECT' ? 'destructive' : 'primary'}
                disabled={submittingMod}
              >
                {submittingMod ? 'Saving...' : 'Confirm Decision'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Category Create/Edit Dialog */}
      <Dialog open={Boolean(catForm)} onOpenChange={(o) => !o && setCatForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{catForm?.isNew ? 'Create Category' : 'Edit Category'}</DialogTitle>
          </DialogHeader>
          {catForm && (
            <form onSubmit={handleCategorySubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cat-name">Name</Label>
                <Input
                  id="cat-name"
                  value={catForm.name}
                  onChange={(e) =>
                    setCatForm({
                      ...catForm,
                      name: e.target.value,
                      slug: catForm.isNew ? slugify(e.target.value) : catForm.slug,
                    })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cat-slug">Slug</Label>
                <Input
                  id="cat-slug"
                  value={catForm.slug}
                  onChange={(e) => setCatForm({ ...catForm, slug: slugify(e.target.value) })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cat-order">Display Order</Label>
                <Input
                  id="cat-order"
                  type="number"
                  min={1}
                  max={100}
                  value={catForm.order}
                  onChange={(e) => setCatForm({ ...catForm, order: Number(e.target.value) })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cat-desc">Description</Label>
                <Textarea
                  id="cat-desc"
                  value={catForm.description}
                  onChange={(e) => setCatForm({ ...catForm, description: e.target.value })}
                  rows={3}
                  required
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setCatForm(null)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary">
                  Save Category
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <SiteFooter />
    </div>
  );
}
