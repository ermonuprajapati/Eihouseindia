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
  ShoppingBag,
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
  deletePostAdmin,
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
import { deleteEditorialMedia, uploadEditorialImage } from '@/modules/storage/storage-service';
import {
  deleteProductAdmin,
  fetchProducts,
  POPULAR_SUPPLIER_PRESETS,
  saveProductAdmin,
  toggleProductStockAdmin,
} from '@/modules/products/product-service';
import { categorySchema, slugify } from '@/lib/validation';
import type {
  Category,
  Comment,
  MediaItem,
  ModerationLog,
  Post,
  Product,
  ReportItem,
  SiteSettings,
  Tag,
  UserProfile,
  UserRole,
} from '@/types';

type AdminSection =
  | 'dashboard'
  | 'all-articles'
  | 'products'
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

  // Delete post modal state
  const [deletePostTarget, setDeletePostTarget] = useState<Post | null>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [deletingPost, setDeletingPost] = useState(false);

  // Products state
  const [productsList, setProductsList] = useState<Product[]>([]);
  const [productModal, setProductModal] = useState<{
    id?: string;
    name: string;
    slug: string;
    category: string;
    badge: string;
    price: string;
    mrp: string;
    imageUrl: string;
    inStock: boolean;
    features: string;
    description: string;
    suppliers: Array<{
      id?: string;
      name: string;
      logoUrl: string;
      url: string;
      price: string;
      badge: string;
    }>;
    isNew: boolean;
  } | null>(null);
  const [deleteProductTarget, setDeleteProductTarget] = useState<Product | null>(null);
  const [uploadingProdImage, setUploadingProdImage] = useState(false);
  const [savingProduct, setSavingProduct] = useState(false);
  const [deletingProduct, setDeletingProduct] = useState(false);

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
        productsRes,
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
        fetchProducts().catch(() => []),
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
      setProductsList(productsRes || []);
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
      // Revalidate public cache
      fetch('/api/revalidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: post.slug }),
      }).catch(() => undefined);

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

  const handleConfirmDeletePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deletePostTarget || !profile) return;
    setDeletingPost(true);
    try {
      await deletePostAdmin({
        post: deletePostTarget,
        actor: profile,
        actorRole: effectiveRole,
        reason: deleteReason.trim() || 'Deleted by admin from Admin Console.',
      });
      toast.success('Article permanently deleted.');
      setDeletePostTarget(null);
      setDeleteReason('');
      loadAllAdminData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete article.');
    } finally {
      setDeletingPost(false);
    }
  };

  const handleToggleProductStock = async (prod: Product) => {
    if (!profile) return;
    try {
      await toggleProductStockAdmin(prod.id, !prod.inStock, profile, effectiveRole);
      toast.success(prod.inStock ? 'Product marked Out of Stock.' : 'Product marked In Stock.');
      loadAllAdminData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update stock status.');
    }
  };

  const handleProductImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile || !productModal) return;
    setUploadingProdImage(true);
    try {
      const mediaItem = await uploadEditorialImage(file, profile.uid);
      setProductModal((prev) => (prev ? { ...prev, imageUrl: mediaItem.url } : null));
      toast.success('Product image uploaded to Cloudinary.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to upload product image.');
    } finally {
      setUploadingProdImage(false);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productModal || !profile) return;
    if (!productModal.name.trim() || !productModal.price.trim()) {
      toast.error('Please enter product name and price.');
      return;
    }
    setSavingProduct(true);
    try {
      const featuresList = productModal.features
        .split('\n')
        .map((f) => f.trim())
        .filter((f) => f.length > 0);

      await saveProductAdmin(
        {
          id: productModal.id,
          name: productModal.name.trim(),
          slug: productModal.slug.trim() || slugify(productModal.name),
          category: productModal.category.trim() || 'General Hardware',
          badge: productModal.badge.trim() || undefined,
          price: productModal.price.trim(),
          mrp: productModal.mrp.trim() || undefined,
          imageUrl: productModal.imageUrl.trim() || undefined,
          inStock: productModal.inStock,
          features: featuresList,
          description: productModal.description.trim() || undefined,
          suppliers: productModal.suppliers
            .filter((s) => s.name.trim().length > 0 && s.url.trim().length > 0)
            .map((s) => ({
              id: s.id || `sup_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              name: s.name.trim(),
              logoUrl: s.logoUrl.trim() || undefined,
              url: s.url.trim(),
              price: s.price.trim() || undefined,
              badge: s.badge.trim() || undefined,
            })),
        },
        profile,
        effectiveRole
      );
      toast.success(productModal.isNew ? 'Product added successfully!' : 'Product updated successfully!');
      setProductModal(null);
      loadAllAdminData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save product.');
    } finally {
      setSavingProduct(false);
    }
  };

  const handleConfirmDeleteProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deleteProductTarget || !profile) return;
    setDeletingProduct(true);
    try {
      await deleteProductAdmin(deleteProductTarget.id, deleteProductTarget.name, profile, effectiveRole);
      toast.success('Product deleted.');
      setDeleteProductTarget(null);
      loadAllAdminData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete product.');
    } finally {
      setDeletingProduct(false);
    }
  };

  const handleAddSupplierRow = () => {
    if (!productModal) return;
    setProductModal({
      ...productModal,
      suppliers: [
        ...productModal.suppliers,
        { name: '', logoUrl: '', url: '', price: '', badge: '' },
      ],
    });
  };

  const handleRemoveSupplierRow = (index: number) => {
    if (!productModal) return;
    const next = [...productModal.suppliers];
    next.splice(index, 1);
    setProductModal({ ...productModal, suppliers: next });
  };

  const handleSupplierChange = (index: number, field: string, val: string) => {
    if (!productModal) return;
    const next = [...productModal.suppliers];
    next[index] = { ...next[index], [field]: val };
    setProductModal({ ...productModal, suppliers: next });
  };

  const handleSupplierPresetSelect = (index: number, presetName: string) => {
    if (!productModal) return;
    const preset = POPULAR_SUPPLIER_PRESETS.find((p) => p.name === presetName);
    if (!preset) return;
    const next = [...productModal.suppliers];
    next[index] = {
      ...next[index],
      name: preset.name,
      logoUrl: preset.logoUrl,
      badge: next[index].badge || preset.defaultBadge || '',
    };
    setProductModal({ ...productModal, suppliers: next });
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
    { id: 'products', label: `Store Products (${productsList.length})` },
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
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => {
                      setDeletePostTarget(post);
                      setDeleteReason('');
                    }}
                    title="Delete Article"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-red-600" />
                    <span>Delete</span>
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

                {section === 'products' && (
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h2 className="font-display text-2xl font-semibold text-[#0B1528]">
                          Store Products &amp; Suppliers Catalog ({productsList.length})
                        </h2>
                        <p className="text-xs text-slate-500">
                          Manage hardware items, stock status, direct prices, and trusted vendor purchase links with logos.
                        </p>
                      </div>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() =>
                          setProductModal({
                            name: '',
                            slug: '',
                            category: 'EI House Original Boards',
                            badge: 'New',
                            price: '₹',
                            mrp: '',
                            imageUrl: '',
                            inStock: true,
                            features: '',
                            description: '',
                            suppliers: [],
                            isNew: true,
                          })
                        }
                      >
                        <Plus className="h-4 w-4 mr-1.5" />
                        <span>Add New Product</span>
                      </Button>
                    </div>

                    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                      <table className="w-full text-left text-sm">
                        <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                          <tr>
                            <th className="px-4 py-3">Product</th>
                            <th className="px-4 py-3">Category</th>
                            <th className="px-4 py-3">Price / MRP</th>
                            <th className="px-4 py-3 text-center">In Stock?</th>
                            <th className="px-4 py-3">Verified Suppliers</th>
                            <th className="px-4 py-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {productsList.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                                No products in store catalog yet. Click &ldquo;Add New Product&rdquo; above.
                              </td>
                            </tr>
                          ) : (
                            productsList.map((prod) => (
                              <tr key={prod.id} className="hover:bg-slate-50/70">
                                <td className="px-4 py-3 max-w-xs">
                                  <div className="flex items-center gap-3">
                                    {prod.imageUrl ? (
                                      <div className="h-10 w-10 relative rounded bg-slate-100 shrink-0 border border-slate-200 overflow-hidden">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={prod.imageUrl} alt={prod.name} className="h-full w-full object-contain p-0.5" />
                                      </div>
                                    ) : (
                                      <div className="h-10 w-10 rounded bg-slate-100 flex items-center justify-center text-slate-400 shrink-0 border border-slate-200">
                                        <ShoppingBag className="h-4 w-4" />
                                      </div>
                                    )}
                                    <div className="min-w-0">
                                      <p className="font-medium text-[#0B1528] truncate">{prod.name}</p>
                                      <div className="flex items-center gap-1.5">
                                        {prod.badge && (
                                          <span className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.2 rounded font-semibold">
                                            {prod.badge}
                                          </span>
                                        )}
                                        <span className="text-xs text-slate-400 font-mono">/{prod.slug}</span>
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-slate-600 whitespace-nowrap text-xs">
                                  {prod.category}
                                </td>
                                <td className="px-4 py-3 text-slate-800 whitespace-nowrap text-xs">
                                  <span className="font-bold">{prod.price}</span>
                                  {prod.mrp && <span className="text-slate-400 line-through ml-1.5">{prod.mrp}</span>}
                                </td>
                                <td className="px-4 py-3 text-center whitespace-nowrap">
                                  <div className="flex items-center justify-center gap-2">
                                    <Switch
                                      checked={prod.inStock}
                                      onCheckedChange={() => handleToggleProductStock(prod)}
                                    />
                                    <span className={`text-xs font-semibold ${prod.inStock ? 'text-emerald-700' : 'text-rose-600'}`}>
                                      {prod.inStock ? 'In Stock' : 'Out of Stock'}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-xs text-slate-600">
                                  {prod.suppliers && prod.suppliers.length > 0 ? (
                                    <div className="flex flex-wrap gap-1 items-center">
                                      {prod.suppliers.map((s) => (
                                        <span
                                          key={s.id}
                                          className="inline-flex items-center gap-1 text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200"
                                        >
                                          {s.logoUrl && (
                                            /* eslint-disable-next-line @next/next/no-img-element */
                                            <img src={s.logoUrl} alt="" className="h-3 w-3 object-contain" />
                                          )}
                                          <span>{s.name}</span>
                                        </span>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="text-slate-400 italic">Direct Only</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-right whitespace-nowrap space-x-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      setProductModal({
                                        id: prod.id,
                                        name: prod.name,
                                        slug: prod.slug,
                                        category: prod.category,
                                        badge: prod.badge || '',
                                        price: prod.price,
                                        mrp: prod.mrp || '',
                                        imageUrl: prod.imageUrl || '',
                                        inStock: prod.inStock,
                                        features: (prod.features || []).join('\n'),
                                        description: prod.description || '',
                                        suppliers: prod.suppliers.map((s) => ({
                                          id: s.id,
                                          name: s.name,
                                          logoUrl: s.logoUrl || '',
                                          url: s.url,
                                          price: s.price || '',
                                          badge: s.badge || '',
                                        })),
                                        isNew: false,
                                      })
                                    }
                                  >
                                    Edit
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    onClick={() => setDeleteProductTarget(prod)}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    <span>Delete</span>
                                  </Button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
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

      {/* Delete Article Confirmation Dialog */}
      <Dialog open={Boolean(deletePostTarget)} onOpenChange={(o) => !o && setDeletePostTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <Trash2 className="h-5 w-5" /> Delete Article Permanently
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{deletePostTarget?.title}&rdquo;?
              This will remove the post completely and cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleConfirmDeletePost} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="del-post-reason" className="text-xs text-slate-600">
                Reason (optional, recorded in audit logs):
              </Label>
              <Input
                id="del-post-reason"
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="e.g. Duplicate article, outdated, author request..."
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDeletePostTarget(null)}
                disabled={deletingPost}
              >
                Cancel
              </Button>
              <Button type="submit" variant="destructive" disabled={deletingPost}>
                {deletingPost ? 'Deleting...' : 'Delete Article'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Product Add / Edit Dialog */}
      <Dialog open={Boolean(productModal)} onOpenChange={(o) => !o && setProductModal(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {productModal?.isNew ? 'Add New Hardware Product' : 'Edit Product'}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Configure product details, stock availability, and verified supplier outbound links with logos.
            </DialogDescription>
          </DialogHeader>

          {productModal && (
            <form onSubmit={handleSaveProduct} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="prod-name">Product Name *</Label>
                  <Input
                    id="prod-name"
                    value={productModal.name}
                    onChange={(e) =>
                      setProductModal({
                        ...productModal,
                        name: e.target.value,
                        slug: productModal.isNew ? slugify(e.target.value) : productModal.slug,
                      })
                    }
                    placeholder="e.g. EI House ESP32-S3 Pro"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="prod-slug">URL Slug *</Label>
                  <Input
                    id="prod-slug"
                    value={productModal.slug}
                    onChange={(e) =>
                      setProductModal({ ...productModal, slug: slugify(e.target.value) })
                    }
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="prod-cat">Category *</Label>
                  <Input
                    id="prod-cat"
                    value={productModal.category}
                    onChange={(e) =>
                      setProductModal({ ...productModal, category: e.target.value })
                    }
                    placeholder="e.g. Development Boards"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="prod-price">Direct Price (INR) *</Label>
                  <Input
                    id="prod-price"
                    value={productModal.price}
                    onChange={(e) =>
                      setProductModal({ ...productModal, price: e.target.value })
                    }
                    placeholder="e.g. ₹899"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="prod-mrp">MRP (Strikethrough)</Label>
                  <Input
                    id="prod-mrp"
                    value={productModal.mrp}
                    onChange={(e) =>
                      setProductModal({ ...productModal, mrp: e.target.value })
                    }
                    placeholder="e.g. ₹1,299"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                <div className="space-y-1.5">
                  <Label htmlFor="prod-badge">Badge (Optional)</Label>
                  <Input
                    id="prod-badge"
                    value={productModal.badge}
                    onChange={(e) =>
                      setProductModal({ ...productModal, badge: e.target.value })
                    }
                    placeholder="e.g. Bestseller, New Launch, Verified"
                  />
                </div>
                <div className="flex items-center gap-3 pt-6">
                  <Switch
                    id="prod-instock"
                    checked={productModal.inStock}
                    onCheckedChange={(v) =>
                      setProductModal({ ...productModal, inStock: v })
                    }
                  />
                  <Label htmlFor="prod-instock" className="cursor-pointer font-semibold text-sm">
                    {productModal.inStock ? 'In Stock (Direct Order Enabled)' : 'Out of Stock (Suppliers Only)'}
                  </Label>
                </div>
              </div>

              {/* Image Upload */}
              <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Product Image (Cloudinary)
                </Label>
                <div className="flex items-center gap-4">
                  {productModal.imageUrl ? (
                    <div className="h-16 w-16 relative rounded-lg border border-slate-200 bg-white p-1 shrink-0 overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={productModal.imageUrl} alt="Preview" className="h-full w-full object-contain" />
                    </div>
                  ) : (
                    <div className="h-16 w-16 rounded-lg border border-dashed border-slate-300 bg-white flex items-center justify-center text-slate-400 shrink-0">
                      <ShoppingBag className="h-6 w-6" />
                    </div>
                  )}
                  <div className="space-y-1 flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleProductImageUpload}
                      disabled={uploadingProdImage}
                      className="text-xs file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-[#172D4D] file:text-white hover:file:bg-[#0B1528] cursor-pointer"
                    />
                    <p className="text-[11px] text-slate-500">
                      {uploadingProdImage ? 'Uploading to Cloudinary...' : 'Uploads directly to Cloudinary CDN.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Key Features & Description */}
              <div className="space-y-1.5">
                <Label htmlFor="prod-features">Key Specifications (One bullet point per line)</Label>
                <Textarea
                  id="prod-features"
                  value={productModal.features}
                  onChange={(e) =>
                    setProductModal({ ...productModal, features: e.target.value })
                  }
                  placeholder="Dual Core 240MHz Xtensa LX7&#10;Built-in 0.96&quot; OLED Display&#10;USB-C Native Debug &amp; OTG"
                  rows={3}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="prod-desc">Product Description (Optional)</Label>
                <Textarea
                  id="prod-desc"
                  value={productModal.description}
                  onChange={(e) =>
                    setProductModal({ ...productModal, description: e.target.value })
                  }
                  placeholder="Full engineering description and pinout details..."
                  rows={2}
                />
              </div>

              {/* Verified Suppliers Section */}
              <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      Verified Supplier Outbound Links (With Logos)
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Add supplier links with logos (e.g. Robu, Amazon, Quartz, DigiKey). Users can buy directly from them.
                    </p>
                  </div>
                  <Button type="button" size="sm" variant="outline" onClick={handleAddSupplierRow}>
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    <span>Add Supplier</span>
                  </Button>
                </div>

                {productModal.suppliers.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-2 text-center">
                    No suppliers linked yet. Click &ldquo;Add Supplier&rdquo; to add external vendor purchase links.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {productModal.suppliers.map((sup, idx) => (
                      <div
                        key={idx}
                        className="rounded-lg border border-slate-200 bg-white p-3 space-y-3 relative shadow-xs"
                      >
                        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                          <span className="text-xs font-bold text-slate-700">Supplier #{idx + 1}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-slate-400">Quick Preset:</span>
                            <select
                              className="text-xs rounded border border-slate-200 px-2 py-1 bg-white font-medium"
                              onChange={(e) => handleSupplierPresetSelect(idx, e.target.value)}
                              defaultValue=""
                            >
                              <option value="" disabled>Select Preset Logo...</option>
                              {POPULAR_SUPPLIER_PRESETS.map((p) => (
                                <option key={p.name} value={p.name}>{p.name}</option>
                              ))}
                            </select>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="text-red-600 h-7 w-7 p-0"
                              onClick={() => handleRemoveSupplierRow(idx)}
                              title="Remove supplier"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-[11px]">Supplier Name *</Label>
                            <Input
                              value={sup.name}
                              onChange={(e) => handleSupplierChange(idx, 'name', e.target.value)}
                              placeholder="e.g. Robu.in or Amazon India"
                              required
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[11px]">Direct Product Link URL *</Label>
                            <Input
                              value={sup.url}
                              onChange={(e) => handleSupplierChange(idx, 'url', e.target.value)}
                              placeholder="https://robu.in/product/..."
                              required
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <Label className="text-[11px]">Supplier Logo URL</Label>
                            <Input
                              value={sup.logoUrl}
                              onChange={(e) => handleSupplierChange(idx, 'logoUrl', e.target.value)}
                              placeholder="https://.../logo.png"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[11px]">Supplier Price (Optional)</Label>
                            <Input
                              value={sup.price}
                              onChange={(e) => handleSupplierChange(idx, 'price', e.target.value)}
                              placeholder="e.g. ₹949"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[11px]">Supplier Badge (Optional)</Label>
                            <Input
                              value={sup.badge}
                              onChange={(e) => handleSupplierChange(idx, 'badge', e.target.value)}
                              placeholder="e.g. Prime, Fast Dispatch"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button type="button" variant="outline" onClick={() => setProductModal(null)} disabled={savingProduct}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={savingProduct}>
                  {savingProduct ? 'Saving Product...' : productModal.isNew ? 'Create Product' : 'Save Changes'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Product Confirmation Dialog */}
      <Dialog open={Boolean(deleteProductTarget)} onOpenChange={(o) => !o && setDeleteProductTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <Trash2 className="h-5 w-5" /> Delete Product Permanently
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{deleteProductTarget?.name}&rdquo;?
              This will remove the product and its supplier links from the store catalog.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleConfirmDeleteProduct} className="space-y-4">
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDeleteProductTarget(null)}
                disabled={deletingProduct}
              >
                Cancel
              </Button>
              <Button type="submit" variant="destructive" disabled={deletingProduct}>
                {deletingProduct ? 'Deleting...' : 'Delete Product'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <SiteFooter />
    </div>
  );
}
