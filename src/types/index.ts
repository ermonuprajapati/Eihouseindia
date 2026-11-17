export type UserRole = 'USER' | 'EDITOR' | 'ADMIN';
export type UserStatus = 'ACTIVE' | 'SUSPENDED';
export * from './datasheet';

export type PostStatus =
  | 'DRAFT'
  | 'PENDING'
  | 'PUBLISHED'
  | 'REJECTED'
  | 'ARCHIVED';

export type CommentStatus = 'VISIBLE' | 'HIDDEN' | 'FLAGGED';
export type ReportStatus = 'OPEN' | 'RESOLVED' | 'DISMISSED';

export interface TiptapMark {
  type: string;
  attrs?: Record<string, unknown>;
}

export interface TiptapNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: TiptapNode[];
  marks?: TiptapMark[];
  text?: string;
}

export interface TiptapDocument {
  type: 'doc';
  content: TiptapNode[];
}

export interface UserProfile {
  uid: string;
  email: string;
  username: string;
  displayName: string;
  avatar: string;
  bio: string;
  website: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
}

export interface PublicAuthorProfile {
  uid: string;
  username: string;
  displayName: string;
  avatar: string;
  bio: string;
  website: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  order: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
  postCount?: number;
  createdAt?: string;
}

export interface Post {
  id: string;
  authorId: string;
  authorName?: string;
  authorUsername?: string;
  authorAvatar?: string;
  title: string;
  slug: string;
  excerpt: string;
  content: TiptapDocument;
  coverImage: string;
  categoryId: string;
  categoryName?: string;
  categorySlug?: string;
  tags: string[];
  status: PostStatus;
  metaTitle: string;
  metaDescription: string;
  canonicalUrl: string;
  locale: string;
  readingTime: number;
  wordCount: number;
  featured: boolean;
  viewCount?: number;
  reviewerId: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
  submittedAt: string | null;
  publishedAt: string | null;
}

export interface Comment {
  id: string;
  postId: string;
  postTitle?: string;
  authorId: string;
  authorName: string;
  authorUsername: string;
  authorAvatar: string;
  content: string;
  status: CommentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface MediaItem {
  id: string;
  uploaderId: string;
  url: string;
  storagePath: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'SUBMISSION' | 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED' | 'SYSTEM';
  postId?: string;
  read: boolean;
  createdAt: string;
}

export interface ReportItem {
  id: string;
  targetType: 'POST' | 'COMMENT';
  targetId: string;
  targetTitle?: string;
  reporterId: string;
  reason: string;
  status: ReportStatus;
  resolvedBy?: string | null;
  resolutionNote?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ModerationLog {
  id: string;
  actorId: string;
  actorEmail?: string;
  actorRole: UserRole;
  action:
    | 'APPROVE_POST'
    | 'REJECT_POST'
    | 'REQUEST_CHANGES'
    | 'ARCHIVE_POST'
    | 'DELETE_POST'
    | 'TOGGLE_FEATURED'
    | 'SUSPEND_USER'
    | 'RESTORE_USER'
    | 'ASSIGN_ROLE'
    | 'MANAGE_CATEGORY'
    | 'MODERATE_COMMENT'
    | 'RESOLVE_REPORT'
    | 'MANAGE_PRODUCT'
    | 'MANAGE_SUPPLIER'
    | 'DELETE_SUPPLIER'
    | 'MANAGE_TOOL'
    | 'DELETE_TOOL'
    | 'MANAGE_LIBRARY'
    | 'DELETE_LIBRARY'
    | 'REPLY_INQUIRY'
    | 'DELETE_INQUIRY'
    | 'UPDATE_SETTINGS';
  targetType: 'POST' | 'USER' | 'CATEGORY' | 'COMMENT' | 'REPORT' | 'SETTINGS' | 'PRODUCT' | 'SUPPLIER' | 'TOOL' | 'LIBRARY' | 'INQUIRY';
  targetId: string;
  reason?: string;
  createdAt: string;
}

export interface SiteSettings {
  id: string;
  siteName: string;
  tagline: string;
  description: string;
  contactEmail: string;
  allowRegistrations: boolean;
  requireEmailVerification: boolean;
  maintenanceMode: boolean;
  updatedAt: string;
}

export interface ComponentCategorySpec {
  slug: string;
  name: string;
  summary: string;
  plannedFields: string[];
}

export interface SupplierLink {
  id: string;
  name: string;
  logoUrl?: string;
  url: string;
  price?: string;
  badge?: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  category: string;
  badge?: string;
  price: string;
  mrp?: string;
  imageUrl?: string;
  images?: string[];
  inStock: boolean;
  features: string[];
  description?: string;
  suppliers: SupplierLink[];
  orderCount?: number;
  featured?: boolean;
  relatedBlogSlug?: string;
  relatedBlogTitle?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ContactInquiryItem {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: 'PENDING' | 'REPLIED';
  replyMessage?: string;
  repliedAt?: string;
  repliedBy?: string;
  createdAt: string;
}

export interface TrustedSupplier {
  id: string;
  name: string;
  logoUrl?: string;
  url: string;
  category?: string;
  badge?: string;
  description?: string;
  tags?: string[];
  order?: number;
  featured?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ToolCategory =
  | 'Electronics'
  | 'Mechanical'
  | '3D Printing'
  | 'Programming'
  | 'IT & Networking'
  | 'Simulation'
  | 'Calculators';

export type ToolLicenseType =
  | 'Open Source'
  | 'Free'
  | 'Freemium'
  | 'Commercial / Paid'
  | 'Student License';

export type ToolPlatformType =
  | 'Web Browser'
  | 'Desktop (Windows / Mac / Linux)'
  | 'Cloud / SaaS'
  | 'Cross-Platform';

export type EngineeringDomain =
  | 'Electronics & Embedded'
  | 'Mechanical & Robotics'
  | 'Computer Science & IT'
  | 'Networking & IoT'
  | '3D Printing & CAD'
  | 'General Engineering';

export interface EngineeringTool {
  id: string;
  name: string;
  slug: string;
  domain: EngineeringDomain;
  category?: ToolCategory | string;
  mainApplication?: string;
  officialWebsite?: string;
  licenseType?: ToolLicenseType | string;
  platform?: ToolPlatformType | string;
  requiresInstall?: boolean;
  requiresAccount?: boolean;
  badge?: string;
  summary: string;
  description: string;
  icon?: string;
  imageUrl?: string;
  officialLogoUrl?: string;
  screenshotSourceUrl?: string;
  imageAlt?: string;
  toolType: 'built-in' | 'external' | 'interactive' | 'software';
  externalUrl?: string;
  calculatorKey?: string;
  featured?: boolean;
  order?: number;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export type LibraryCategory =
  | 'Datasheet & Pinout'
  | 'Firmware Library & Driver'
  | 'Schematic & Reference Circuit'
  | 'Mechanical & 3D CAD Standard'
  | 'Programming Cheat Sheet'
  | 'Networking Protocol & Spec';

export interface LibraryItem {
  id: string;
  title: string;
  slug: string;
  domain: EngineeringDomain;
  category: LibraryCategory;
  badge?: string;
  summary: string;
  description?: string;
  imageUrl?: string;
  iconUrl?: string;
  imageAlt?: string;
  imageSource?: string;
  fileUrl?: string;
  externalUrl?: string;
  fileFormat?: string;
  fileSize?: string;
  version?: string;
  authorOrSource?: string;
  tags?: string[];
  featured?: boolean;
  downloadCount?: number;
  order?: number;
  createdAt: string;
  updatedAt: string;
}

