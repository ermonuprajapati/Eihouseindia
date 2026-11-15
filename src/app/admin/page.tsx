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
  Mail,
  MessageCircle,
  Send,
  Inbox,
  ChevronDown,
  ChevronUp,
  Wrench,
  BookOpen,
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
  deleteInquiryAdmin,
  deletePostAdmin,
  deleteTagAdmin,
  getAdminDashboardStats,
  getAllTagsAdmin,
  getAllUsersForAdmin,
  getCommentsForAdmin,
  getInquiriesForAdmin,
  getMediaLibraryAdmin,
  getModerationLogsAdmin,
  getPostsForAdmin,
  getReportsForAdmin,
  getSiteSettingsClient,
  moderateCommentAdmin,
  moderatePostDecision,
  replyToInquiryAdmin,
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
  saveProductAdmin,
  toggleProductStockAdmin,
} from '@/modules/products/product-service';
import {
  deleteSupplierAdmin,
  fetchSuppliers,
  saveSupplierAdmin,
  seedInitialSuppliers,
} from '@/modules/suppliers/supplier-service';
import {
  fetchTools,
  saveToolAdmin,
  deleteToolAdmin,
  ENGINEERING_DOMAINS,
  TOOL_CATEGORIES,
  TOOL_LICENSES,
} from '@/modules/tools/tool-service';
import {
  fetchLibraryItems,
  saveLibraryItemAdmin,
  deleteLibraryItemAdmin,
  LIBRARY_CATEGORIES,
} from '@/modules/library/library-service';
import { categorySchema, slugify } from '@/lib/validation';
import type {
  Category,
  Comment,
  ContactInquiryItem,
  EngineeringDomain,
  EngineeringTool,
  LibraryCategory,
  LibraryItem,
  MediaItem,
  ModerationLog,
  Post,
  Product,
  ReportItem,
  SiteSettings,
  Tag,
  ToolCategory,
  ToolLicenseType,
  TrustedSupplier,
  UserProfile,
  UserRole,
} from '@/types';

type AdminSection =
  | 'dashboard'
  | 'all-articles'
  | 'products'
  | 'tools'
  | 'library'
  | 'suppliers'
  | 'inquiries'
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
    relatedBlogSlug: string;
    relatedBlogTitle: string;
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

  // Inquiries state
  const [inquiries, setInquiries] = useState<ContactInquiryItem[]>([]);
  const [replyInquiryTarget, setReplyInquiryTarget] = useState<ContactInquiryItem | null>(null);
  const [replyMessageText, setReplyMessageText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [deleteInquiryTarget, setDeleteInquiryTarget] = useState<ContactInquiryItem | null>(null);
  const [deletingInquiry, setDeletingInquiry] = useState(false);
  const [inquiryFilter, setInquiryFilter] = useState<'ALL' | 'PENDING' | 'REPLIED'>('ALL');
  const [expandedInquiryId, setExpandedInquiryId] = useState<string | null>(null);

  // Verified Suppliers state
  const [suppliersList, setSuppliersList] = useState<TrustedSupplier[]>([]);
  const [supplierModal, setSupplierModal] = useState<{
    id?: string;
    name: string;
    url: string;
    logoUrl: string;
    category: string;
    badge: string;
    description: string;
    order: number;
    featured: boolean;
    isNew: boolean;
  } | null>(null);
  const [deleteSupplierTarget, setDeleteSupplierTarget] = useState<TrustedSupplier | null>(null);
  const [savingSupplier, setSavingSupplier] = useState(false);
  const [deletingSupplier, setDeletingSupplier] = useState(false);
  const [uploadingSupplierLogo, setUploadingSupplierLogo] = useState(false);

  // Tools & Software Directory state
  const [toolsList, setToolsList] = useState<EngineeringTool[]>([]);
  const [toolModal, setToolModal] = useState<{
    id?: string;
    name: string;
    slug: string;
    domain: EngineeringDomain;
    category: ToolCategory | string;
    mainApplication: string;
    officialWebsite: string;
    licenseType: ToolLicenseType | string;
    platform: string;
    badge: string;
    summary: string;
    description: string;
    toolType: 'built-in' | 'external' | 'interactive' | 'software';
    externalUrl: string;
    calculatorKey: string;
    featured: boolean;
    order: number;
    tags: string;
    isNew: boolean;
  } | null>(null);
  const [deleteToolTarget, setDeleteToolTarget] = useState<EngineeringTool | null>(null);
  const [savingTool, setSavingTool] = useState(false);
  const [deletingTool, setDeletingTool] = useState(false);

  // Library state
  const [libraryList, setLibraryList] = useState<LibraryItem[]>([]);
  const [libraryModal, setLibraryModal] = useState<{
    id?: string;
    title: string;
    slug: string;
    domain: EngineeringDomain;
    category: LibraryCategory;
    badge: string;
    summary: string;
    description: string;
    imageUrl: string;
    fileUrl: string;
    externalUrl: string;
    fileFormat: string;
    fileSize: string;
    version: string;
    authorOrSource: string;
    tags: string;
    featured: boolean;
    order: number;
    isNew: boolean;
  } | null>(null);
  const [deleteLibraryTarget, setDeleteLibraryTarget] = useState<LibraryItem | null>(null);
  const [savingLibrary, setSavingLibrary] = useState(false);
  const [deletingLibrary, setDeletingLibrary] = useState(false);

  const loadAllAdminData = useCallback(async (showSpinner = false) => {
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
        inquiriesRes,
        suppliersRes,
        toolsRes,
        libraryRes,
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
        getInquiriesForAdmin().catch(() => []),
        fetchSuppliers().catch(() => []),
        fetchTools().catch(() => []),
        fetchLibraryItems().catch(() => []),
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
      setInquiries(inquiriesRes || []);
      setSuppliersList(suppliersRes || []);
      setToolsList(toolsRes || []);
      setLibraryList(libraryRes || []);
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
          relatedBlogSlug: productModal.relatedBlogSlug.trim() || undefined,
          relatedBlogTitle: productModal.relatedBlogTitle.trim() || undefined,
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

  const extractPhoneFromText = (text: string): string | null => {
    const match = text.match(/(?:\+91[\-\s]?)?[6789]\d{9}/);
    if (!match) return null;
    const digits = match[0].replace(/\D/g, '');
    return digits.length === 10 ? `91${digits}` : digits;
  };

  const handleOpenReplyModal = (inquiry: ContactInquiryItem) => {
    setReplyInquiryTarget(inquiry);
    setReplyMessageText('');
  };

  const handleSendInquiryReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyInquiryTarget || !profile || !replyMessageText.trim()) return;
    setSendingReply(true);
    try {
      await replyToInquiryAdmin({
        inquiry: replyInquiryTarget,
        replyMessage: replyMessageText.trim(),
        actor: profile,
        actorRole: effectiveRole,
      });
      toast.success(`Reply email sent to ${replyInquiryTarget.email}`);
      setReplyInquiryTarget(null);
      setReplyMessageText('');
      loadAllAdminData(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to send reply.');
    } finally {
      setSendingReply(false);
    }
  };

  const handleConfirmDeleteInquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deleteInquiryTarget || !profile) return;
    setDeletingInquiry(true);
    try {
      await deleteInquiryAdmin({
        inquiryId: deleteInquiryTarget.id,
        actor: profile,
        actorRole: effectiveRole,
      });
      toast.success('Inquiry permanently deleted.');
      setDeleteInquiryTarget(null);
      loadAllAdminData(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete inquiry.');
    } finally {
      setDeletingInquiry(false);
    }
  };

  const handleSupplierLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile || !supplierModal) return;
    setUploadingSupplierLogo(true);
    try {
      const mediaItem = await uploadEditorialImage(file, profile.uid);
      setSupplierModal((prev) => (prev ? { ...prev, logoUrl: mediaItem.url } : null));
      toast.success('Supplier logo uploaded to Cloudinary.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Upload failed.');
    } finally {
      setUploadingSupplierLogo(false);
    }
  };

  const handleSupplierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierModal || !profile) return;
    if (!supplierModal.name.trim()) {
      toast.error('Supplier name is required.');
      return;
    }
    if (!supplierModal.url.trim()) {
      toast.error('Supplier website URL is required.');
      return;
    }
    setSavingSupplier(true);
    try {
      await saveSupplierAdmin(
        {
          id: supplierModal.id,
          name: supplierModal.name.trim(),
          url: supplierModal.url.trim(),
          logoUrl: supplierModal.logoUrl.trim(),
          category: supplierModal.category.trim() || 'General Hardware',
          badge: supplierModal.badge.trim(),
          description: supplierModal.description.trim(),
          order: Number(supplierModal.order) || 1,
          featured: supplierModal.featured,
        },
        supplierModal.isNew,
        profile,
        effectiveRole
      );
      toast.success(supplierModal.isNew ? 'New verified supplier added!' : 'Supplier details updated!');
      setSupplierModal(null);
      loadAllAdminData(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save supplier.');
    } finally {
      setSavingSupplier(false);
    }
  };

  const handleConfirmDeleteSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deleteSupplierTarget || !profile) return;
    setDeletingSupplier(true);
    try {
      await deleteSupplierAdmin(deleteSupplierTarget.id, profile, effectiveRole);
      toast.success('Supplier removed from directory.');
      setDeleteSupplierTarget(null);
      loadAllAdminData(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete supplier.');
    } finally {
      setDeletingSupplier(false);
    }
  };

  const handleToolSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!toolModal || !profile) return;
    if (!toolModal.name.trim()) {
      toast.error('Tool name is required.');
      return;
    }
    setSavingTool(true);
    try {
      await saveToolAdmin(
        {
          id: toolModal.id,
          name: toolModal.name.trim(),
          slug: toolModal.slug.trim() || slugify(toolModal.name),
          domain: toolModal.domain,
          category: toolModal.category as ToolCategory,
          mainApplication: toolModal.mainApplication.trim(),
          officialWebsite: toolModal.officialWebsite.trim(),
          licenseType: toolModal.licenseType as ToolLicenseType,
          platform: toolModal.platform.trim(),
          badge: toolModal.badge.trim(),
          summary: toolModal.summary.trim(),
          description: toolModal.description.trim(),
          toolType: toolModal.toolType,
          externalUrl: toolModal.officialWebsite.trim() || toolModal.externalUrl.trim(),
          calculatorKey: toolModal.calculatorKey.trim(),
          featured: toolModal.featured,
          order: Number(toolModal.order) || 1,
          tags: toolModal.tags.split(',').map((t) => t.trim()).filter(Boolean),
        },
        toolModal.isNew,
        profile,
        effectiveRole
      );
      toast.success(toolModal.isNew ? 'New engineering tool created!' : 'Tool updated successfully!');
      setToolModal(null);
      loadAllAdminData(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save tool.');
    } finally {
      setSavingTool(false);
    }
  };

  const handleConfirmDeleteTool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deleteToolTarget || !profile) return;
    setDeletingTool(true);
    try {
      await deleteToolAdmin(deleteToolTarget.id, profile, effectiveRole);
      toast.success('Tool deleted from catalog.');
      setDeleteToolTarget(null);
      loadAllAdminData(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete tool.');
    } finally {
      setDeletingTool(false);
    }
  };

  const handleLibrarySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!libraryModal || !profile) return;
    if (!libraryModal.title.trim()) {
      toast.error('Resource title is required.');
      return;
    }
    setSavingLibrary(true);
    try {
      await saveLibraryItemAdmin(
        {
          id: libraryModal.id,
          title: libraryModal.title.trim(),
          slug: libraryModal.slug.trim() || slugify(libraryModal.title),
          domain: libraryModal.domain,
          category: libraryModal.category,
          badge: libraryModal.badge.trim(),
          summary: libraryModal.summary.trim(),
          description: libraryModal.description.trim(),
          imageUrl: libraryModal.imageUrl.trim(),
          fileUrl: libraryModal.fileUrl.trim(),
          externalUrl: libraryModal.externalUrl.trim(),
          fileFormat: libraryModal.fileFormat.trim() || 'PDF Reference',
          fileSize: libraryModal.fileSize.trim(),
          version: libraryModal.version.trim(),
          authorOrSource: libraryModal.authorOrSource.trim(),
          featured: libraryModal.featured,
          order: Number(libraryModal.order) || 1,
          tags: libraryModal.tags.split(',').map((t) => t.trim()).filter(Boolean),
        },
        libraryModal.isNew,
        profile,
        effectiveRole
      );
      toast.success(libraryModal.isNew ? 'New library resource added!' : 'Resource updated successfully!');
      setLibraryModal(null);
      loadAllAdminData(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save library resource.');
    } finally {
      setSavingLibrary(false);
    }
  };

  const handleConfirmDeleteLibrary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deleteLibraryTarget || !profile) return;
    setDeletingLibrary(true);
    try {
      await deleteLibraryItemAdmin(deleteLibraryTarget.id, profile, effectiveRole);
      toast.success('Resource removed from library.');
      setDeleteLibraryTarget(null);
      loadAllAdminData(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete library resource.');
    } finally {
      setDeletingLibrary(false);
    }
  };

  const pendingPosts = posts.filter((p) => p.status === 'PENDING');
  const publishedPosts = posts.filter((p) => p.status === 'PUBLISHED');
  const rejectedPosts = posts.filter((p) => p.status === 'REJECTED');
  const pendingInquiries = inquiries.filter((i) => i.status === 'PENDING');
  const repliedInquiries = inquiries.filter((i) => i.status === 'REPLIED');

  const filteredInquiries = inquiries.filter((i) => {
    if (inquiryFilter === 'PENDING') return i.status === 'PENDING';
    if (inquiryFilter === 'REPLIED') return i.status === 'REPLIED';
    return true;
  });

  const navItems: Array<{ id: AdminSection; label: string; adminOnly?: boolean }> = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'pending', label: `Pending Reviews (${pendingPosts.length})` },
    { id: 'inquiries', label: `Inquiries (${pendingInquiries.length})` },
    { id: 'products', label: `Store Products (EI House) (${productsList.length})` },
    { id: 'tools', label: `Engineering Tools (${toolsList.length})` },
    { id: 'library', label: `Engineering Library (${libraryList.length})` },
    { id: 'suppliers', label: `Suppliers (Not in Store) (${suppliersList.length})` },
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
            {loadingData && !stats && posts.length === 0 ? (
              <div className="space-y-4">
                <Skeleton className="h-10 w-48" />
                <Skeleton className="h-96 w-full rounded-2xl" />
              </div>
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
                    {/* Link banner to Suppliers Directory */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-amber-200 bg-amber-50/70 text-amber-900 shadow-xs">
                      <div className="space-y-0.5">
                        <p className="text-xs font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
                          <ShoppingBag className="h-4 w-4" />
                          <span>Jo Product hamare paas nahi hai uske Suppliers manage karein</span>
                        </p>
                        <p className="text-xs text-amber-700">
                          Hamare store par jo specialized components nahi hain, unke verified external suppliers (Robu, Quartz, DigiKey, etc.) ko Suppliers Directory se Add, Edit aur Delete karein.
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-amber-400 bg-white hover:bg-amber-100 text-amber-900 text-xs shrink-0 font-semibold"
                        onClick={() => setSection('suppliers')}
                      >
                        Manage Verified Suppliers ({suppliersList.length}) →
                      </Button>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h2 className="font-display text-2xl font-semibold text-[#0B1528]">
                          Store Products (EI House Hardware) ({productsList.length})
                        </h2>
                        <p className="text-xs text-slate-500">
                          Manage products manufactured and stocked directly by EI House (in stock status, prices, direct pre-orders &amp; WhatsApp orders).
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
                            relatedBlogSlug: '',
                            relatedBlogTitle: '',
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
                            <th className="px-4 py-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {productsList.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
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
                                        suppliers: (prod.suppliers || []).map((s) => ({
                                          id: s.id,
                                          name: s.name,
                                          logoUrl: s.logoUrl || '',
                                          url: s.url,
                                          price: s.price || '',
                                          badge: s.badge || '',
                                        })),
                                        relatedBlogSlug: prod.relatedBlogSlug || '',
                                        relatedBlogTitle: prod.relatedBlogTitle || '',
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

                {section === 'tools' && (
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h2 className="font-display text-2xl font-semibold text-[#0B1528] flex items-center gap-2">
                          <Wrench className="h-6 w-6 text-primary" />
                          Engineering Software &amp; Tools Directory ({toolsList.length})
                        </h2>
                        <p className="text-xs text-slate-500">
                          Manage recommended engineering software, simulators, CAD suites, and interactive solvers. Control official website links and license models.
                        </p>
                      </div>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() =>
                          setToolModal({
                            name: '',
                            slug: '',
                            domain: 'Electronics & Embedded',
                            category: 'Electronics',
                            mainApplication: '',
                            officialWebsite: '',
                            licenseType: 'Free',
                            platform: 'Desktop (Windows / Mac / Linux)',
                            badge: 'Recommended',
                            summary: '',
                            description: '',
                            toolType: 'software',
                            externalUrl: '',
                            calculatorKey: '',
                            featured: false,
                            order: toolsList.length + 1,
                            tags: '',
                            isNew: true,
                          })
                        }
                      >
                        <Plus className="h-4 w-4 mr-1.5" />
                        <span>Add New Software / Tool</span>
                      </Button>
                    </div>

                    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                      <table className="w-full text-left text-sm">
                        <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                          <tr>
                            <th className="px-4 py-3">Tool / Software Name</th>
                            <th className="px-4 py-3">Category</th>
                            <th className="px-4 py-3">Main Application</th>
                            <th className="px-4 py-3">License &amp; Platform</th>
                            <th className="px-4 py-3">Official Website</th>
                            <th className="px-4 py-3 text-center">Order</th>
                            <th className="px-4 py-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {toolsList.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                                No software or tools configured yet. Click &ldquo;Add New Software / Tool&rdquo; above.
                              </td>
                            </tr>
                          ) : (
                            toolsList.map((tool) => (
                              <tr key={tool.id} className="hover:bg-slate-50/70">
                                <td className="px-4 py-3 max-w-xs">
                                  <div className="space-y-0.5">
                                    <div className="flex items-center gap-1.5">
                                      <p className="font-semibold text-[#0B1528]">{tool.name}</p>
                                      {tool.featured && (
                                        <span className="text-[10px] bg-amber-100 text-amber-800 border border-amber-300 px-1.5 py-0.2 rounded font-semibold">
                                          Top 12 Featured
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-xs text-slate-500 line-clamp-1">{tool.summary}</p>
                                  </div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-xs">
                                  <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium">
                                    {tool.category || tool.domain}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-xs text-slate-600 max-w-xs truncate">
                                  {tool.mainApplication || '—'}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-xs">
                                  <div className="space-y-1">
                                    <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded border bg-blue-50 text-blue-700 border-blue-200">
                                      {tool.licenseType || 'Free'}
                                    </span>
                                    <p className="text-[11px] text-slate-400 truncate max-w-[140px]">
                                      {tool.platform || 'Cross-Platform'}
                                    </p>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-xs max-w-xs">
                                  {tool.officialWebsite ? (
                                    <a
                                      href={tool.officialWebsite}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-primary hover:underline truncate block max-w-[150px]"
                                    >
                                      {tool.officialWebsite}
                                    </a>
                                  ) : tool.calculatorKey ? (
                                    <span className="font-mono text-emerald-700 font-medium">
                                      Solver: {tool.calculatorKey}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 italic">Built-in</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-center font-mono text-xs text-slate-500">
                                  {tool.order ?? 1}
                                </td>
                                <td className="px-4 py-3 text-right whitespace-nowrap space-x-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      setToolModal({
                                        id: tool.id,
                                        name: tool.name,
                                        slug: tool.slug,
                                        domain: tool.domain,
                                        category: tool.category || 'Electronics',
                                        mainApplication: tool.mainApplication || '',
                                        officialWebsite: tool.officialWebsite || tool.externalUrl || '',
                                        licenseType: tool.licenseType || 'Free',
                                        platform: tool.platform || 'Desktop (Windows / Mac / Linux)',
                                        badge: tool.badge || '',
                                        summary: tool.summary,
                                        description: tool.description,
                                        toolType: tool.toolType || 'software',
                                        externalUrl: tool.externalUrl || '',
                                        calculatorKey: tool.calculatorKey || '',
                                        featured: Boolean(tool.featured),
                                        order: tool.order ?? 1,
                                        tags: (tool.tags || []).join(', '),
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
                                    onClick={() => setDeleteToolTarget(tool)}
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

                {section === 'library' && (
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h2 className="font-display text-2xl font-semibold text-[#0B1528] flex items-center gap-2">
                          <BookOpen className="h-6 w-6 text-primary" />
                          Engineering Library &amp; Resources ({libraryList.length})
                        </h2>
                        <p className="text-xs text-slate-500">
                          Manage pinouts, datasheets, open-source firmware drivers, schematics, and mechanical CAD standards.
                        </p>
                      </div>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() =>
                          setLibraryModal({
                            title: '',
                            slug: '',
                            domain: 'Electronics & Embedded',
                            category: 'Datasheet & Pinout',
                            badge: 'New',
                            summary: '',
                            description: '',
                            imageUrl: '',
                            fileUrl: '',
                            externalUrl: '',
                            fileFormat: 'PDF Reference',
                            fileSize: '1.2 MB',
                            version: 'v1.0',
                            authorOrSource: 'EI House Hardware Lab',
                            tags: '',
                            featured: false,
                            order: libraryList.length + 1,
                            isNew: true,
                          })
                        }
                      >
                        <Plus className="h-4 w-4 mr-1.5" />
                        <span>Add New Resource</span>
                      </Button>
                    </div>

                    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                      <table className="w-full text-left text-sm">
                        <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                          <tr>
                            <th className="px-4 py-3">Resource Title</th>
                            <th className="px-4 py-3">Domain</th>
                            <th className="px-4 py-3">Category</th>
                            <th className="px-4 py-3">Format / Size</th>
                            <th className="px-4 py-3 text-center">Order</th>
                            <th className="px-4 py-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {libraryList.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                                No library items configured yet. Click &ldquo;Add New Resource&rdquo; above.
                              </td>
                            </tr>
                          ) : (
                            libraryList.map((item) => (
                              <tr key={item.id} className="hover:bg-slate-50/70">
                                <td className="px-4 py-3 max-w-sm">
                                  <div className="space-y-0.5">
                                    <div className="flex items-center gap-1.5">
                                      <p className="font-semibold text-[#0B1528]">{item.title}</p>
                                      {item.badge && (
                                        <span className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.2 rounded font-semibold">
                                          {item.badge}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-xs text-slate-500 line-clamp-1">{item.summary}</p>
                                  </div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-xs">
                                  <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium">
                                    {item.domain}
                                  </span>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-xs font-semibold text-primary">
                                  {item.category}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-600">
                                  <span className="font-mono">{item.fileFormat}</span>
                                  {item.fileSize && <span className="text-slate-400 ml-1">({item.fileSize})</span>}
                                </td>
                                <td className="px-4 py-3 text-center font-mono text-xs text-slate-500">
                                  {item.order ?? 1}
                                </td>
                                <td className="px-4 py-3 text-right whitespace-nowrap space-x-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      setLibraryModal({
                                        id: item.id,
                                        title: item.title,
                                        slug: item.slug,
                                        domain: item.domain,
                                        category: item.category,
                                        badge: item.badge || '',
                                        summary: item.summary,
                                        description: item.description || '',
                                        imageUrl: item.imageUrl || '',
                                        fileUrl: item.fileUrl || '',
                                        externalUrl: item.externalUrl || '',
                                        fileFormat: item.fileFormat || 'PDF Reference',
                                        fileSize: item.fileSize || '',
                                        version: item.version || '',
                                        authorOrSource: item.authorOrSource || '',
                                        tags: (item.tags || []).join(', '),
                                        featured: Boolean(item.featured),
                                        order: item.order ?? 1,
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
                                    onClick={() => setDeleteLibraryTarget(item)}
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

                {section === 'suppliers' && (
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="font-display text-2xl font-semibold text-[#0B1528] flex items-center gap-2">
                            <ShoppingBag className="h-6 w-6 text-primary" />
                            Suppliers Directory ({suppliersList.length})
                          </h2>
                          <span className="text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded">
                            Jo products hamare paas nahi hain
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          Store page ke &ldquo;Looking for Components Not Available in Our Store?&rdquo; section ke trusted suppliers ko yahan se Add, Edit aur Delete karein.
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (!profile) return;
                            seedInitialSuppliers(profile, effectiveRole).then(() => {
                              toast.success('Seeded 8 default suppliers in Firestore.');
                              loadAllAdminData(false);
                            });
                          }}
                        >
                          Sync Default 8 Suppliers
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() =>
                            setSupplierModal({
                              name: '',
                              url: '',
                              logoUrl: '',
                              category: 'Electronics & Sensors',
                              badge: 'Verified Silicon',
                              description: '',
                              order: suppliersList.length + 1,
                              featured: true,
                              isNew: true,
                            })
                          }
                        >
                          <Plus className="h-4 w-4 mr-1.5" />
                          <span>Add New Supplier</span>
                        </Button>
                      </div>
                    </div>

                    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
                      <table className="w-full text-left text-sm">
                        <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                          <tr>
                            <th className="px-4 py-3">Supplier Logo &amp; Name</th>
                            <th className="px-4 py-3">Website URL</th>
                            <th className="px-4 py-3">Category &amp; Trust Badge</th>
                            <th className="px-4 py-3">Description</th>
                            <th className="px-4 py-3 text-center">Order</th>
                            <th className="px-4 py-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {suppliersList.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                                No suppliers configured yet. Click &ldquo;Add New Supplier&rdquo; above.
                              </td>
                            </tr>
                          ) : (
                            suppliersList.map((sup) => (
                              <tr key={sup.id} className="hover:bg-slate-50/70 transition">
                                <td className="px-4 py-3 align-top min-w-[180px]">
                                  <div className="flex items-center gap-2.5">
                                    <div className="h-9 w-16 relative rounded bg-slate-50 p-1 border border-slate-200 flex items-center justify-center shrink-0">
                                      {sup.logoUrl ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                          src={sup.logoUrl}
                                          alt={sup.name}
                                          className="max-h-full max-w-full object-contain"
                                        />
                                      ) : (
                                        <span className="text-xs font-bold text-slate-500">
                                          {sup.name.slice(0, 3)}
                                        </span>
                                      )}
                                    </div>
                                    <span className="font-semibold text-[#0B1528]">{sup.name}</span>
                                  </div>
                                </td>

                                <td className="px-4 py-3 align-top max-w-xs">
                                  <a
                                    href={sup.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-primary hover:underline flex items-center gap-1 truncate"
                                  >
                                    <span className="truncate">{sup.url}</span>
                                    <ArrowRight className="h-3 w-3 shrink-0" />
                                  </a>
                                </td>

                                <td className="px-4 py-3 align-top whitespace-nowrap">
                                  <span className="text-xs font-medium text-slate-700 block">
                                    {sup.category || 'General'}
                                  </span>
                                  {sup.badge && (
                                    <span className="inline-block mt-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                      {sup.badge}
                                    </span>
                                  )}
                                </td>

                                <td className="px-4 py-3 align-top max-w-xs text-xs text-slate-600">
                                  <p className="line-clamp-2">{sup.description || '—'}</p>
                                </td>

                                <td className="px-4 py-3 align-top text-center font-mono text-xs text-slate-500">
                                  {sup.order ?? 1}
                                </td>

                                <td className="px-4 py-3 align-top text-right whitespace-nowrap">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-8 text-xs"
                                      onClick={() =>
                                        setSupplierModal({
                                          id: sup.id,
                                          name: sup.name,
                                          url: sup.url,
                                          logoUrl: sup.logoUrl || '',
                                          category: sup.category || 'Electronics & Sensors',
                                          badge: sup.badge || '',
                                          description: sup.description || '',
                                          order: sup.order ?? 1,
                                          featured: sup.featured ?? true,
                                          isNew: false,
                                        })
                                      }
                                    >
                                      Edit
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                      onClick={() => setDeleteSupplierTarget(sup)}
                                      title="Delete supplier"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {section === 'inquiries' && (
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h2 className="font-display text-2xl font-semibold text-[#0B1528] flex items-center gap-2">
                          <Inbox className="h-6 w-6 text-primary" />
                          Customer Inquiries &amp; Order Messages ({inquiries.length})
                        </h2>
                        <p className="text-xs text-slate-500">
                          Review messages received from the Contact page and Store Product inquiry modal. Reply directly via email or WhatsApp.
                        </p>
                      </div>

                      <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 text-xs">
                        <button
                          type="button"
                          onClick={() => setInquiryFilter('ALL')}
                          className={`rounded px-3 py-1.5 font-medium transition ${
                            inquiryFilter === 'ALL'
                              ? 'bg-[#0B1528] text-white'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          All ({inquiries.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setInquiryFilter('PENDING')}
                          className={`rounded px-3 py-1.5 font-medium transition ${
                            inquiryFilter === 'PENDING'
                              ? 'bg-amber-500 text-white'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Pending ({pendingInquiries.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setInquiryFilter('REPLIED')}
                          className={`rounded px-3 py-1.5 font-medium transition ${
                            inquiryFilter === 'REPLIED'
                              ? 'bg-emerald-600 text-white'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Replied ({repliedInquiries.length})
                        </button>
                      </div>
                    </div>

                    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
                      <table className="w-full text-left text-sm">
                        <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                          <tr>
                            <th className="px-4 py-3">Customer Details</th>
                            <th className="px-4 py-3">Subject &amp; Message</th>
                            <th className="px-4 py-3">Date &amp; Status</th>
                            <th className="px-4 py-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {filteredInquiries.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="px-4 py-12 text-center text-slate-500">
                                <Inbox className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                                No customer inquiries in this filter.
                              </td>
                            </tr>
                          ) : (
                            filteredInquiries.map((inq) => {
                              const phone = extractPhoneFromText(`${inq.subject} ${inq.message}`);
                              const isExpanded = expandedInquiryId === inq.id;

                              return (
                                <React.Fragment key={inq.id}>
                                  <tr className="hover:bg-slate-50/70 transition">
                                    <td className="px-4 py-3 align-top min-w-[200px]">
                                      <p className="font-semibold text-[#0B1528]">{inq.name || 'Anonymous Visitor'}</p>
                                      <a
                                        href={`mailto:${inq.email}`}
                                        className="text-xs text-primary hover:underline flex items-center gap-1 mt-0.5"
                                      >
                                        <Mail className="h-3 w-3" />
                                        <span>{inq.email}</span>
                                      </a>
                                      {phone && (
                                        <span className="inline-flex items-center gap-1 mt-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                          <MessageCircle className="h-3 w-3" /> +{phone}
                                        </span>
                                      )}
                                    </td>

                                    <td className="px-4 py-3 align-top max-w-md">
                                      <div className="flex items-start justify-between gap-2">
                                        <p className="font-medium text-[#0B1528] text-sm">
                                          {inq.subject || 'Inquiry'}
                                        </p>
                                        <button
                                          type="button"
                                          onClick={() => setExpandedInquiryId(isExpanded ? null : inq.id)}
                                          className="text-slate-400 hover:text-slate-600"
                                          title={isExpanded ? 'Collapse' : 'Expand full message'}
                                        >
                                          {isExpanded ? (
                                            <ChevronUp className="h-4 w-4" />
                                          ) : (
                                            <ChevronDown className="h-4 w-4" />
                                          )}
                                        </button>
                                      </div>

                                      <p className="mt-1 text-xs text-slate-600 line-clamp-2">
                                        {inq.message}
                                      </p>

                                      {inq.status === 'REPLIED' && inq.replyMessage && !isExpanded && (
                                        <div className="mt-2 text-[11px] text-emerald-800 bg-emerald-50/80 rounded px-2 py-1 border border-emerald-200/60 truncate">
                                          <strong>Replied:</strong> {inq.replyMessage}
                                        </div>
                                      )}
                                    </td>

                                    <td className="px-4 py-3 align-top whitespace-nowrap">
                                      <p className="text-xs text-slate-500">
                                        {inq.createdAt ? format(new Date(inq.createdAt), 'MMM d, yyyy h:mm a') : '—'}
                                      </p>
                                      <div className="mt-1.5">
                                        {inq.status === 'REPLIED' ? (
                                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
                                            <CheckCircle2 className="h-3 w-3" />
                                            Replied
                                          </span>
                                        ) : (
                                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 border border-amber-200">
                                            Pending
                                          </span>
                                        )}
                                      </div>
                                      {inq.repliedBy && (
                                        <p className="mt-1 text-[10px] text-slate-400">
                                          by {inq.repliedBy}
                                        </p>
                                      )}
                                    </td>

                                    <td className="px-4 py-3 align-top text-right whitespace-nowrap">
                                      <div className="flex items-center justify-end gap-1.5">
                                        <Button
                                          size="sm"
                                          variant="primary"
                                          onClick={() => handleOpenReplyModal(inq)}
                                          className="h-8 text-xs"
                                        >
                                          <Send className="h-3 w-3 mr-1" />
                                          {inq.status === 'REPLIED' ? 'Reply Again' : 'Reply Email'}
                                        </Button>

                                        {phone && (
                                          <a
                                            href={`https://wa.me/${phone}?text=${encodeURIComponent(
                                              `Hello ${inq.name}, thank you for reaching out to EI HOUSE INDIA regarding your inquiry "${inq.subject}". How can we help you today?`
                                            )}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 h-8 px-2.5 rounded text-xs font-medium bg-[#25D366] text-white hover:bg-[#1EBE5D] transition shadow-xs"
                                            title="Reply directly on WhatsApp"
                                          >
                                            <MessageCircle className="h-3.5 w-3.5" />
                                            <span>WhatsApp</span>
                                          </a>
                                        )}

                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                          onClick={() => setDeleteInquiryTarget(inq)}
                                          title="Delete inquiry"
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                      </div>
                                    </td>
                                  </tr>

                                  {isExpanded && (
                                    <tr className="bg-slate-50/50">
                                      <td colSpan={4} className="px-6 py-4 border-t border-slate-100">
                                        <div className="space-y-3">
                                          <div>
                                            <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                                              Full Customer Inquiry:
                                            </p>
                                            <div className="mt-1.5 bg-white p-3 rounded border border-slate-200 text-sm text-slate-800 whitespace-pre-wrap">
                                              {inq.message}
                                            </div>
                                          </div>

                                          {inq.replyMessage && (
                                            <div className="bg-emerald-50/70 border border-emerald-200 rounded p-3">
                                              <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wide flex items-center justify-between">
                                                <span>Admin Response:</span>
                                                {inq.repliedAt && (
                                                  <span className="text-[11px] font-normal text-emerald-600">
                                                    Sent {format(new Date(inq.repliedAt), 'MMM d, yyyy h:mm a')}
                                                  </span>
                                                )}
                                              </p>
                                              <div className="mt-1 text-sm text-slate-800 whitespace-pre-wrap">
                                                {inq.replyMessage}
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                </React.Fragment>
                              );
                            })
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

              {/* Related Blog Tutorial / Guide */}
              <div className="space-y-2.5 rounded-xl border border-sky-150 bg-sky-50/60 p-3.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="prod-blog-select" className="text-xs font-semibold text-sky-950 flex items-center gap-1.5">
                    <BookOpen className="h-4 w-4 text-sky-600" />
                    <span>Related Blog Tutorial / Student Guide (Optional)</span>
                  </Label>
                  <span className="text-[10px] bg-sky-100 text-sky-800 border border-sky-200 px-2 py-0.5 rounded font-semibold">
                    Tutorial Link
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Agar is component ya development board ka koi practical blog ya tutorial website par published hai, to use yahan link karein. Store page par product card par &ldquo;Read Blog: [Tutorial Title]&rdquo; ka button show hoga. Agar koi blog nahi hai to link automatically hide rahega.
                </p>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-700">Choose from Published Articles:</label>
                  <select
                    id="prod-blog-select"
                    value={productModal.relatedBlogSlug || ''}
                    onChange={(e) => {
                      const selectedSlug = e.target.value;
                      const matched = publishedPosts.find((p) => p.slug === selectedSlug);
                      setProductModal({
                        ...productModal,
                        relatedBlogSlug: selectedSlug,
                        relatedBlogTitle: matched ? matched.title : '',
                      });
                    }}
                    className="w-full text-xs rounded-md border border-slate-300 bg-white px-2.5 py-2 text-slate-800 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  >
                    <option value="">-- No explicit link / Auto-match keyword --</option>
                    {publishedPosts.map((p) => (
                      <option key={p.id || p.slug} value={p.slug}>
                        {p.title} (/blog/{p.slug})
                      </option>
                    ))}
                  </select>
                </div>

                {productModal.relatedBlogSlug && (
                  <div className="space-y-1 pt-1">
                    <label className="text-[11px] font-medium text-slate-700">Display Title / Button Text:</label>
                    <Input
                      value={productModal.relatedBlogTitle || ''}
                      onChange={(e) =>
                        setProductModal({ ...productModal, relatedBlogTitle: e.target.value })
                      }
                      placeholder="e.g. Getting Started with ESP32-S3 & Pinout Guide"
                      className="text-xs bg-white"
                    />
                    <p className="text-[10px] text-slate-500">
                      Destination URL: <code className="font-mono text-sky-700">/blog/{productModal.relatedBlogSlug}</code>
                    </p>
                  </div>
                )}
              </div>

              {/* Fulfillment Note */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 space-y-1">
                <p className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                  <ShoppingBag className="h-4 w-4 text-[#172D4D]" />
                  <span>EI House Direct Store Item</span>
                </p>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Yeh product EI House direct fulfill karta hai. Customer website ke Order Form aur WhatsApp se direct order karenge. Isme kisi external supplier link ki zaroorat nahi hai.
                </p>
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

      {/* Inquiry Reply Dialog */}
      <Dialog open={Boolean(replyInquiryTarget)} onOpenChange={(o) => !o && setReplyInquiryTarget(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#0B1528]">
              <Send className="h-5 w-5 text-primary" />
              Reply to Customer Inquiry
            </DialogTitle>
            <DialogDescription>
              Sending official email response to <strong>{replyInquiryTarget?.name}</strong> ({replyInquiryTarget?.email}).
            </DialogDescription>
          </DialogHeader>

          {replyInquiryTarget && (
            <form onSubmit={handleSendInquiryReply} className="space-y-4">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="font-semibold text-slate-700">Subject: {replyInquiryTarget.subject}</span>
                  <span>{replyInquiryTarget.createdAt ? format(new Date(replyInquiryTarget.createdAt), 'MMM d, yyyy') : ''}</span>
                </div>
                <div className="text-xs text-slate-700 bg-white p-2.5 rounded border border-slate-200/80 max-h-32 overflow-y-auto whitespace-pre-wrap">
                  {replyInquiryTarget.message}
                </div>
              </div>

              {replyInquiryTarget.replyMessage && (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800">
                  <strong>Previous reply:</strong> {replyInquiryTarget.replyMessage}
                </div>
              )}

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="replyText" className="text-xs font-semibold text-slate-700">
                    Your Response Message *
                  </Label>
                  <span className="text-[11px] text-slate-400">Will be emailed from official site address</span>
                </div>

                {/* Quick Templates */}
                <div className="flex flex-wrap gap-1.5 pb-1">
                  <button
                    type="button"
                    onClick={() =>
                      setReplyMessageText(
                        `Hello ${replyInquiryTarget.name},\n\nThank you for reaching out to EI HOUSE INDIA. We have received your query and would be glad to assist you. Our engineering team is currently looking into your request and will follow up shortly.`
                      )
                    }
                    className="text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-0.5 rounded border border-slate-200 transition"
                  >
                    + Gratitude &amp; Follow-up
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setReplyMessageText(
                        `Hello ${replyInquiryTarget.name},\n\nThank you for your order inquiry! This item is currently available for dispatch. Please share your delivery address and contact number so we can calculate shipping and share payment details.`
                      )
                    }
                    className="text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-0.5 rounded border border-slate-200 transition"
                  >
                    + Product Order Confirmation
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setReplyMessageText(
                        `Hello ${replyInquiryTarget.name},\n\nThank you for reaching out. We also provide direct purchase links to verified suppliers directly on our store page. Feel free to connect directly on our WhatsApp (+91 7080768737) for custom component requests.`
                      )
                    }
                    className="text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-0.5 rounded border border-slate-200 transition"
                  >
                    + Verified Supplier Guidance
                  </button>
                </div>

                <Textarea
                  id="replyText"
                  rows={6}
                  value={replyMessageText}
                  onChange={(e) => setReplyMessageText(e.target.value)}
                  placeholder="Type your official reply to the customer..."
                  className="font-sans text-sm"
                  required
                />
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setReplyInquiryTarget(null)}
                  disabled={sendingReply}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={sendingReply || !replyMessageText.trim()}
                >
                  <Send className="h-4 w-4 mr-1.5" />
                  {sendingReply ? 'Dispatching Email...' : 'Send Reply via Email'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Inquiry Confirmation Dialog */}
      <Dialog open={Boolean(deleteInquiryTarget)} onOpenChange={(o) => !o && setDeleteInquiryTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <Trash2 className="h-5 w-5" /> Delete Customer Inquiry
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete the inquiry from &ldquo;{deleteInquiryTarget?.name}&rdquo; ({deleteInquiryTarget?.email})?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleConfirmDeleteInquiry} className="space-y-4">
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDeleteInquiryTarget(null)}
                disabled={deletingInquiry}
              >
                Cancel
              </Button>
              <Button type="submit" variant="destructive" disabled={deletingInquiry}>
                {deletingInquiry ? 'Deleting...' : 'Delete Inquiry'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Supplier Add/Edit Dialog */}
      <Dialog open={Boolean(supplierModal)} onOpenChange={(o) => !o && setSupplierModal(null)}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#0B1528]">
              <ShoppingBag className="h-5 w-5 text-primary" />
              {supplierModal?.isNew ? 'Add Verified Component Supplier' : 'Edit Supplier Details'}
            </DialogTitle>
            <DialogDescription>
              This supplier will be shown in the dedicated &ldquo;Trusted Suppliers&rdquo; section on the Store page so customers can procure components not in stock.
            </DialogDescription>
          </DialogHeader>

          {supplierModal && (
            <form onSubmit={handleSupplierSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="supName">Supplier Name *</Label>
                  <Input
                    id="supName"
                    value={supplierModal.name}
                    onChange={(e) => setSupplierModal({ ...supplierModal, name: e.target.value })}
                    placeholder="e.g. Robu.in, Quartz, DigiKey"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="supUrl">Website URL *</Label>
                  <Input
                    id="supUrl"
                    type="url"
                    value={supplierModal.url}
                    onChange={(e) => setSupplierModal({ ...supplierModal, url: e.target.value })}
                    placeholder="https://robu.in"
                    required
                  />
                </div>
              </div>

              {/* Logo Upload & URL */}
              <div className="space-y-1.5 p-3 rounded-lg border border-slate-200 bg-slate-50">
                <Label className="text-xs font-semibold text-slate-700">Supplier Logo</Label>
                <div className="flex items-center gap-3">
                  {supplierModal.logoUrl ? (
                    <div className="h-10 w-24 relative rounded bg-white p-1 border border-slate-200 flex items-center justify-center shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={supplierModal.logoUrl}
                        alt="Logo Preview"
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                  ) : (
                    <div className="h-10 w-24 rounded bg-slate-200 text-slate-400 text-xs flex items-center justify-center shrink-0">
                      No Logo
                    </div>
                  )}

                  <div className="flex-1 space-y-1">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleSupplierLogoUpload}
                      disabled={uploadingSupplierLogo}
                      className="text-xs"
                    />
                    <Input
                      value={supplierModal.logoUrl}
                      onChange={(e) => setSupplierModal({ ...supplierModal, logoUrl: e.target.value })}
                      placeholder="Or paste Direct Image URL"
                      className="text-xs"
                    />
                  </div>
                </div>
                {uploadingSupplierLogo && (
                  <p className="text-[11px] text-blue-600">Uploading logo to Cloudinary...</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="supCategory">Specialty / Category</Label>
                  <Input
                    id="supCategory"
                    value={supplierModal.category}
                    onChange={(e) => setSupplierModal({ ...supplierModal, category: e.target.value })}
                    placeholder="e.g. Sensors & Discrete ICs, Robotics"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="supBadge">Trust Badge</Label>
                  <Input
                    id="supBadge"
                    value={supplierModal.badge}
                    onChange={(e) => setSupplierModal({ ...supplierModal, badge: e.target.value })}
                    placeholder="e.g. Fast Shipping in India, Prime Delivery"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="supDesc">Brief Description / What they sell</Label>
                <Textarea
                  id="supDesc"
                  rows={2}
                  value={supplierModal.description}
                  onChange={(e) => setSupplierModal({ ...supplierModal, description: e.target.value })}
                  placeholder="e.g. Best store for Arduino, Raspberry Pi, sensors, and LiPo batteries with pan-India dispatch."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="supOrder">Display Order</Label>
                  <Input
                    id="supOrder"
                    type="number"
                    value={supplierModal.order}
                    onChange={(e) => setSupplierModal({ ...supplierModal, order: Number(e.target.value) })}
                    min={1}
                  />
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSupplierModal(null)}
                  disabled={savingSupplier}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={savingSupplier}>
                  {savingSupplier
                    ? 'Saving Supplier...'
                    : supplierModal.isNew
                    ? 'Add Supplier'
                    : 'Save Changes'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Supplier Confirmation Dialog */}
      <Dialog open={Boolean(deleteSupplierTarget)} onOpenChange={(o) => !o && setDeleteSupplierTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <Trash2 className="h-5 w-5" /> Delete Supplier from Directory
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to remove &ldquo;{deleteSupplierTarget?.name}&rdquo; from the verified suppliers list?
              Visitors will no longer see this partner link on the store page.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleConfirmDeleteSupplier} className="space-y-4">
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDeleteSupplierTarget(null)}
                disabled={deletingSupplier}
              >
                Cancel
              </Button>
              <Button type="submit" variant="destructive" disabled={deletingSupplier}>
                {deletingSupplier ? 'Removing...' : 'Delete Supplier'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Tool Add/Edit Dialog */}
      <Dialog open={Boolean(toolModal)} onOpenChange={(o) => !o && setToolModal(null)}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#0B1528]">
              <Wrench className="h-5 w-5 text-primary" />
              {toolModal?.isNew ? 'Add Engineering Software / Tool' : 'Edit Software & Tool Details'}
            </DialogTitle>
            <DialogDescription>
              Configure software directory details, official vendor URLs, license models, and calculation parameters.
            </DialogDescription>
          </DialogHeader>

          {toolModal && (
            <form onSubmit={handleToolSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="toolName">Software / Tool Name *</Label>
                  <Input
                    id="toolName"
                    value={toolModal.name}
                    onChange={(e) => setToolModal({ ...toolModal, name: e.target.value })}
                    placeholder="e.g. KiCad, Autodesk Fusion, Wokwi"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="toolSlug">URL Slug</Label>
                  <Input
                    id="toolSlug"
                    value={toolModal.slug}
                    onChange={(e) => setToolModal({ ...toolModal, slug: e.target.value })}
                    placeholder="e.g. kicad, autodesk-fusion"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="toolCategory">Category *</Label>
                  <select
                    id="toolCategory"
                    className="w-full rounded-md border border-slate-200 bg-white p-2 text-sm"
                    value={toolModal.category}
                    onChange={(e) =>
                      setToolModal({ ...toolModal, category: e.target.value as ToolCategory })
                    }
                  >
                    {TOOL_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="toolDomain">Engineering Domain *</Label>
                  <select
                    id="toolDomain"
                    className="w-full rounded-md border border-slate-200 bg-white p-2 text-sm"
                    value={toolModal.domain}
                    onChange={(e) =>
                      setToolModal({ ...toolModal, domain: e.target.value as EngineeringDomain })
                    }
                  >
                    {ENGINEERING_DOMAINS.map((dom) => (
                      <option key={dom} value={dom}>{dom}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="toolMainApp">Main Application *</Label>
                <Input
                  id="toolMainApp"
                  value={toolModal.mainApplication}
                  onChange={(e) => setToolModal({ ...toolModal, mainApplication: e.target.value })}
                  placeholder="e.g. Professional schematic capture & PCB layout design"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="toolWebsite">Official Website URL</Label>
                  <Input
                    id="toolWebsite"
                    value={toolModal.officialWebsite}
                    onChange={(e) => setToolModal({ ...toolModal, officialWebsite: e.target.value })}
                    placeholder="https://www.kicad.org/"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="toolLicense">License / Pricing Model *</Label>
                  <select
                    id="toolLicense"
                    className="w-full rounded-md border border-slate-200 bg-white p-2 text-sm"
                    value={toolModal.licenseType}
                    onChange={(e) =>
                      setToolModal({ ...toolModal, licenseType: e.target.value as ToolLicenseType })
                    }
                  >
                    {TOOL_LICENSES.map((lic) => (
                      <option key={lic} value={lic}>{lic}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="toolPlatform">Platform / Installation</Label>
                  <Input
                    id="toolPlatform"
                    value={toolModal.platform}
                    onChange={(e) => setToolModal({ ...toolModal, platform: e.target.value })}
                    placeholder="e.g. Desktop (Windows / Mac / Linux) or Web Browser"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="toolBadge">Trust / Highlight Badge</Label>
                  <Input
                    id="toolBadge"
                    value={toolModal.badge}
                    onChange={(e) => setToolModal({ ...toolModal, badge: e.target.value })}
                    placeholder="e.g. Open Source, Top Pick, Interactive"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="toolSummary">Short Summary *</Label>
                <Textarea
                  id="toolSummary"
                  rows={2}
                  value={toolModal.summary}
                  onChange={(e) => setToolModal({ ...toolModal, summary: e.target.value })}
                  placeholder="One or two sentences describing what the software is best for..."
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="toolDescription">Extended Details / Usage Notes</Label>
                <Textarea
                  id="toolDescription"
                  rows={3}
                  value={toolModal.description}
                  onChange={(e) => setToolModal({ ...toolModal, description: e.target.value })}
                  placeholder="Full technical details, system requirements, licensing specifics..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="toolCalcKey">Interactive Calculator Key (Optional)</Label>
                  <select
                    id="toolCalcKey"
                    className="w-full rounded-md border border-slate-200 bg-white p-2 text-xs font-mono"
                    value={toolModal.calculatorKey}
                    onChange={(e) => setToolModal({ ...toolModal, calculatorKey: e.target.value })}
                  >
                    <option value="">None / External Software</option>
                    <option value="ohms-law">ohms-law (V, I, R, P)</option>
                    <option value="resistor-color-code">resistor-color-code (4/5 Band)</option>
                    <option value="voltage-divider">voltage-divider (Vin, R1, R2)</option>
                    <option value="led-resistor">led-resistor (Vs, Vf, If)</option>
                    <option value="555-timer">555-timer (R1, R2, C)</option>
                    <option value="pcb-trace">pcb-trace (IPC-2221 Track Width)</option>
                    <option value="motor-torque">motor-torque (RPM, Torque, Watts)</option>
                    <option value="gear-ratio">gear-ratio (Teeth T1, T2, Speed)</option>
                    <option value="cylinder-force">cylinder-force (Pneumatic/Hydraulic)</option>
                    <option value="base64-encoder">base64-encoder (Base64/URL)</option>
                    <option value="number-converter">number-converter (Dec, Hex, Bin, ASCII)</option>
                    <option value="subnet-calculator">subnet-calculator (IPv4 CIDR)</option>
                    <option value="3d-print-cost">3d-print-cost (Grams, Electricity)</option>
                    <option value="stepper-calibration">stepper-calibration (Steps/mm)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="toolOrder">Display Order</Label>
                  <Input
                    id="toolOrder"
                    type="number"
                    value={toolModal.order}
                    onChange={(e) => setToolModal({ ...toolModal, order: Number(e.target.value) })}
                    min={1}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="toolTags">Tags (Comma-separated)</Label>
                <Input
                  id="toolTags"
                  value={toolModal.tags}
                  onChange={(e) => setToolModal({ ...toolModal, tags: e.target.value })}
                  placeholder="e.g. PCB Design, Open Source, CAD, Simulation"
                />
              </div>

              <div className="flex items-center space-x-2 pt-2 border-t border-slate-100">
                <Switch
                  id="toolFeatured"
                  checked={toolModal.featured}
                  onCheckedChange={(v) => setToolModal({ ...toolModal, featured: v })}
                />
                <Label htmlFor="toolFeatured" className="text-xs font-semibold text-slate-800">
                  Feature in &ldquo;Top 12 Featured Tools&rdquo; Showcase on Directory
                </Label>
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button type="button" variant="outline" onClick={() => setToolModal(null)} disabled={savingTool}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={savingTool}>
                  {savingTool ? 'Saving Tool...' : toolModal.isNew ? 'Create Tool' : 'Save Changes'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Tool Confirmation Dialog */}
      <Dialog open={Boolean(deleteToolTarget)} onOpenChange={(o) => !o && setDeleteToolTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <Trash2 className="h-5 w-5" /> Delete Engineering Tool
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{deleteToolTarget?.name}&rdquo; from the tools suite?
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleConfirmDeleteTool} className="space-y-4">
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setDeleteToolTarget(null)} disabled={deletingTool}>
                Cancel
              </Button>
              <Button type="submit" variant="destructive" disabled={deletingTool}>
                {deletingTool ? 'Deleting...' : 'Delete Tool'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Library Add/Edit Dialog */}
      <Dialog open={Boolean(libraryModal)} onOpenChange={(o) => !o && setLibraryModal(null)}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#0B1528]">
              <BookOpen className="h-5 w-5 text-primary" />
              {libraryModal?.isNew ? 'Add Engineering Resource' : 'Edit Library Item'}
            </DialogTitle>
            <DialogDescription>
              Add datasheets, pinout charts, open-source firmware drivers, or mechanical CAD standards.
            </DialogDescription>
          </DialogHeader>

          {libraryModal && (
            <form onSubmit={handleLibrarySubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="libTitle">Resource Title *</Label>
                  <Input
                    id="libTitle"
                    value={libraryModal.title}
                    onChange={(e) => setLibraryModal({ ...libraryModal, title: e.target.value })}
                    placeholder="e.g. ESP32-S3 Complete Pinout Matrix"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="libSlug">URL Slug</Label>
                  <Input
                    id="libSlug"
                    value={libraryModal.slug}
                    onChange={(e) => setLibraryModal({ ...libraryModal, slug: e.target.value })}
                    placeholder="e.g. esp32-s3-pinout"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="libDomain">Engineering Domain *</Label>
                  <select
                    id="libDomain"
                    className="w-full rounded-md border border-slate-200 bg-white p-2 text-sm"
                    value={libraryModal.domain}
                    onChange={(e) =>
                      setLibraryModal({ ...libraryModal, domain: e.target.value as EngineeringDomain })
                    }
                  >
                    {ENGINEERING_DOMAINS.map((dom) => (
                      <option key={dom} value={dom}>{dom}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="libCategory">Resource Category *</Label>
                  <select
                    id="libCategory"
                    className="w-full rounded-md border border-slate-200 bg-white p-2 text-sm"
                    value={libraryModal.category}
                    onChange={(e) =>
                      setLibraryModal({ ...libraryModal, category: e.target.value as LibraryCategory })
                    }
                  >
                    {LIBRARY_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="libSummary">Summary Description *</Label>
                <Textarea
                  id="libSummary"
                  rows={2}
                  value={libraryModal.summary}
                  onChange={(e) => setLibraryModal({ ...libraryModal, summary: e.target.value })}
                  placeholder="Summary shown on resource card..."
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="libFormat">File Format</Label>
                  <Input
                    id="libFormat"
                    value={libraryModal.fileFormat}
                    onChange={(e) => setLibraryModal({ ...libraryModal, fileFormat: e.target.value })}
                    placeholder="e.g. PDF, KiCad, STEP"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="libSize">File Size</Label>
                  <Input
                    id="libSize"
                    value={libraryModal.fileSize}
                    onChange={(e) => setLibraryModal({ ...libraryModal, fileSize: e.target.value })}
                    placeholder="e.g. 2.4 MB"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="libVersion">Version / Standard</Label>
                  <Input
                    id="libVersion"
                    value={libraryModal.version}
                    onChange={(e) => setLibraryModal({ ...libraryModal, version: e.target.value })}
                    placeholder="e.g. v2.1, ISO 261"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="libFileUrl">Direct File Download URL</Label>
                  <Input
                    id="libFileUrl"
                    value={libraryModal.fileUrl}
                    onChange={(e) => setLibraryModal({ ...libraryModal, fileUrl: e.target.value })}
                    placeholder="https://.../resource.pdf"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="libExtUrl">External Specs / Docs URL</Label>
                  <Input
                    id="libExtUrl"
                    value={libraryModal.externalUrl}
                    onChange={(e) => setLibraryModal({ ...libraryModal, externalUrl: e.target.value })}
                    placeholder="https://espressif.com/..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="libAuthor">Author / Source Organization</Label>
                  <Input
                    id="libAuthor"
                    value={libraryModal.authorOrSource}
                    onChange={(e) => setLibraryModal({ ...libraryModal, authorOrSource: e.target.value })}
                    placeholder="e.g. EI House Hardware Lab, STMicroelectronics"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="libOrder">Display Order</Label>
                  <Input
                    id="libOrder"
                    type="number"
                    value={libraryModal.order}
                    onChange={(e) => setLibraryModal({ ...libraryModal, order: Number(e.target.value) })}
                    min={1}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="libTags">Tags (Comma-separated)</Label>
                <Input
                  id="libTags"
                  value={libraryModal.tags}
                  onChange={(e) => setLibraryModal({ ...libraryModal, tags: e.target.value })}
                  placeholder="e.g. ESP32, Pinout, GPIO, IoT"
                />
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button type="button" variant="outline" onClick={() => setLibraryModal(null)} disabled={savingLibrary}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={savingLibrary}>
                  {savingLibrary ? 'Saving Resource...' : libraryModal.isNew ? 'Create Resource' : 'Save Changes'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Library Confirmation Dialog */}
      <Dialog open={Boolean(deleteLibraryTarget)} onOpenChange={(o) => !o && setDeleteLibraryTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <Trash2 className="h-5 w-5" /> Delete Library Resource
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to remove &ldquo;{deleteLibraryTarget?.title}&rdquo; from the engineering library?
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleConfirmDeleteLibrary} className="space-y-4">
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setDeleteLibraryTarget(null)} disabled={deletingLibrary}>
                Cancel
              </Button>
              <Button type="submit" variant="destructive" disabled={deletingLibrary}>
                {deletingLibrary ? 'Deleting...' : 'Delete Resource'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <SiteFooter />
    </div>
  );
}
