'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import LinkExtension from '@tiptap/extension-link';
import ImageExtension from '@tiptap/extension-image';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  Quote,
  Code,
  Link2,
  ImagePlus,
  Table as TableIcon,
  Eye,
  Edit3,
  Upload,
  Send,
  Save,
  Plus,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/modules/auth/auth-context';
import { fetchCategories } from '@/modules/categories/category-service';
import { saveOrSubmitAuthorPost } from '@/modules/posts/post-service';
import { uploadEditorialImage } from '@/modules/storage/storage-service';
import { calculateReadingStats, extractPlainTextFromTiptap, slugify } from '@/lib/validation';
import { TiptapArticleRenderer } from '@/lib/tiptap-renderer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import type { Category, Post, TiptapDocument } from '@/types';

const DEFAULT_DOC: TiptapDocument = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [],
    },
  ],
};

export function TiptapEditor({ initialPost }: { initialPost?: Post | null }) {
  const router = useRouter();
  const { profile, isEditor } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [postId, setPostId] = useState<string | undefined>(initialPost?.id);
  const [title, setTitle] = useState(initialPost?.title || '');
  const [slug, setSlug] = useState(initialPost?.slug || '');
  const [slugTouched, setSlugTouched] = useState(Boolean(initialPost?.slug));
  const [excerpt, setExcerpt] = useState(initialPost?.excerpt || '');
  const [coverImage, setCoverImage] = useState(initialPost?.coverImage || '');
  const [categoryId, setCategoryId] = useState(initialPost?.categoryId || 'electronics-components');
  const [tags, setTags] = useState<string[]>(initialPost?.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [metaTitle, setMetaTitle] = useState(initialPost?.metaTitle || '');
  const [metaDescription, setMetaDescription] = useState(initialPost?.metaDescription || '');
  const [previewMode, setPreviewMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [autosaveStatus, setAutosaveStatus] = useState<string>('Idle');
  const [currentDoc, setCurrentDoc] = useState<TiptapDocument>(initialPost?.content || DEFAULT_DOC);

  const coverFileInputRef = useRef<HTMLInputElement>(null);
  const inlineImageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchCategories().then((cats) => {
      setCategories(cats);
      if (!initialPost?.categoryId && cats.length > 0) {
        setCategoryId(cats[0].id);
      }
    });
  }, [initialPost?.categoryId]);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4],
        },
      }),
      Underline,
      LinkExtension.configure({
        openOnClick: false,
        HTMLAttributes: {
          rel: 'noopener noreferrer nofollow',
          target: '_blank',
        },
      }),
      ImageExtension.configure({
        allowBase64: false,
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      Placeholder.configure({
        placeholder: 'Write your technical deep dive, circuit analysis, or implementation guide...',
      }),
      CharacterCount,
    ],
    content: initialPost?.content || DEFAULT_DOC,
    onUpdate: ({ editor: ed }) => {
      const json = ed.getJSON() as TiptapDocument;
      setCurrentDoc(json);
    },
  });

  // Local autosave backup
  const draftStorageKey = `eihouse_draft_${postId || 'new'}`;

  useEffect(() => {
    if (!title && !excerpt) return;
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(
          draftStorageKey,
          JSON.stringify({
            title,
            slug,
            excerpt,
            coverImage,
            categoryId,
            tags,
            metaTitle,
            metaDescription,
            content: currentDoc,
            savedAt: new Date().toISOString(),
          })
        );
        setAutosaveStatus(`Autosaved ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
      } catch {
        setAutosaveStatus('Local autosave unavailable');
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [title, slug, excerpt, coverImage, categoryId, tags, metaTitle, metaDescription, currentDoc, draftStorageKey]);

  const { wordCount, readingTime } = calculateReadingStats(currentDoc);

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    setUploadingCover(true);
    try {
      const media = await uploadEditorialImage(file, profile.uid);
      setCoverImage(media.url);
      toast.success('Cover image uploaded.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Cover upload failed.');
    } finally {
      setUploadingCover(false);
      if (coverFileInputRef.current) coverFileInputRef.current.value = '';
    }
  };

  const handleInlineImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile || !editor) return;
    try {
      const media = await uploadEditorialImage(file, profile.uid);
      editor.chain().focus().setImage({ src: media.url, alt: file.name }).run();
      toast.success('Image inserted into article.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Image upload failed.');
    } finally {
      if (inlineImageInputRef.current) inlineImageInputRef.current.value = '';
    }
  };

  const handleInsertLink = () => {
    if (!editor) return;
    const prevUrl = editor.getAttributes('link').href || 'https://';
    const url = window.prompt('Enter destination URL (https://...):', prevUrl);
    if (url === null) return;
    if (url.trim() === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run();
  };

  const handleInsertImageUrl = () => {
    if (!editor) return;
    const url = window.prompt('Enter image URL (https://...):');
    if (url && url.trim()) {
      editor.chain().focus().setImage({ src: url.trim(), alt: title || 'Diagram' }).run();
    }
  };

  const addTag = () => {
    const clean = tagInput.trim().slice(0, 40);
    if (!clean) return;
    if (tags.length >= 10) {
      toast.error('Maximum 10 tags allowed.');
      return;
    }
    if (!tags.includes(clean)) {
      setTags((prev) => [...prev, clean]);
    }
    setTagInput('');
  };

  const handleSave = useCallback(
    async (intent: 'SAVE_DRAFT' | 'SUBMIT_REVIEW' | 'PUBLISH_DIRECT') => {
      if (!profile) {
        toast.error('Please sign in first.');
        return;
      }
      const selectedCategory =
        categories.find((c) => c.id === categoryId) || categories[0];
      if (!selectedCategory) {
        toast.error('Select a valid category.');
        return;
      }

      setSaving(true);
      try {
        let activeExcerpt = excerpt.trim();
        if (activeExcerpt.length < 20) {
          const plain = extractPlainTextFromTiptap(currentDoc).trim();
          if (plain.length >= 20) {
            activeExcerpt = plain.slice(0, 300).trim();
            setExcerpt(activeExcerpt);
          }
        }

        const result = await saveOrSubmitAuthorPost(
          {
            postId,
            title,
            slug,
            excerpt: activeExcerpt,
            content: currentDoc,
            coverImage,
            category: selectedCategory,
            tags,
            metaTitle,
            metaDescription,
            intent,
          },
          profile,
          isEditor
        );

        setPostId(result.postId);
        try {
          localStorage.removeItem(draftStorageKey);
        } catch {
          // ignore
        }

        if (intent === 'PUBLISH_DIRECT') {
          toast.success('Article published directly to EIHOUSE INDIA.');
          router.push(`/blog/${result.slug}`);
        } else if (intent === 'SUBMIT_REVIEW') {
          // Trigger non-blocking submission email notification
          fetch('/api/notifications/email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: profile.email,
              event: 'ARTICLE_SUBMITTED',
              recipientName: profile.displayName,
              articleTitle: title,
            }),
          }).catch(() => undefined);

          toast.success('Submitted for editorial review.');
          router.push('/dashboard');
        } else {
          toast.success(
            result.status === 'PENDING'
              ? 'Updated and queued for re-review.'
              : 'Draft saved.'
          );
        }
      } catch (error) {
        let msg = 'Unable to save article.';
        if (error instanceof Error) {
          msg = error.message;
          if (msg.startsWith('[') && msg.includes('message')) {
            try {
              const issues = JSON.parse(msg);
              if (Array.isArray(issues) && issues[0]?.message) {
                msg = issues[0].message;
              }
            } catch {
              // ignore JSON parse error
            }
          }
        }
        toast.error(msg);
      } finally {
        setSaving(false);
      }
    },
    [
      profile,
      categories,
      categoryId,
      postId,
      title,
      slug,
      excerpt,
      currentDoc,
      coverImage,
      tags,
      metaTitle,
      metaDescription,
      isEditor,
      draftStorageKey,
      router,
    ]
  );

  return (
    <div className="space-y-8">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-4 text-xs text-slate-500">
          <span className="font-mono tabular-nums">{wordCount} words</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono tabular-nums">{readingTime} min read</span>
          <span aria-hidden="true">·</span>
          <span>{autosaveStatus}</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPreviewMode((p) => !p)}
          >
            {previewMode ? (
              <>
                <Edit3 className="h-4 w-4" />
                <span>Edit Mode</span>
              </>
            ) : (
              <>
                <Eye className="h-4 w-4" />
                <span>Preview</span>
              </>
            )}
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={saving}
            onClick={() => handleSave('SAVE_DRAFT')}
          >
            <Save className="h-4 w-4" />
            <span>Save Draft</span>
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            disabled={saving}
            onClick={() => handleSave('SUBMIT_REVIEW')}
          >
            <Send className="h-4 w-4" />
            <span>Submit for Review</span>
          </Button>
          {isEditor && (
            <Button
              type="button"
              variant="default"
              size="sm"
              disabled={saving}
              onClick={() => handleSave('PUBLISH_DIRECT')}
            >
              <span>Publish Now</span>
            </Button>
          )}
        </div>
      </div>

      {initialPost?.status === 'REJECTED' && initialPost.rejectionReason && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          <p className="font-semibold">Previous Rejection Reason</p>
          <p className="mt-1">{initialPost.rejectionReason}</p>
        </div>
      )}

      {initialPost?.status === 'PUBLISHED' && !isEditor && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Editing a published article invalidates its previous approval and places it back into editorial review.
        </div>
      )}

      {previewMode ? (
        <article className="mx-auto max-w-3xl rounded-lg border border-slate-200 bg-white p-8 sm:p-12">
          <div className="mb-3 text-xs text-slate-500">
            <span>{categories.find((c) => c.id === categoryId)?.name || 'Category'}</span>
            <span aria-hidden="true"> · </span>
            <span className="tabular-nums">{readingTime} min read</span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold text-[#0B1528] leading-tight">
            {title || 'Untitled Article'}
          </h1>
          <p className="mt-4 text-lg text-slate-600 leading-relaxed">{excerpt}</p>
          {coverImage && (
            <div className="my-8 overflow-hidden rounded-lg border border-slate-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={coverImage}
                alt={title || 'Cover preview'}
                referrerPolicy="no-referrer"
                className="w-full h-auto object-cover"
              />
            </div>
          )}
          <div className="mt-8 border-t border-slate-200 pt-8">
            <TiptapArticleRenderer document={currentDoc} />
          </div>
        </article>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Writing Column */}
          <div className="lg:col-span-2 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="article-title">Article Title</Label>
              <Input
                id="article-title"
                value={title}
                onChange={(e) => {
                  const nextTitle = e.target.value;
                  setTitle(nextTitle);
                  if (!slugTouched) {
                    setSlug(slugify(nextTitle));
                  }
                }}
                placeholder="Designing Low-EMI 4-Layer PCBs for SiC Motor Inverters"
                maxLength={160}
                className="h-12 text-lg font-medium"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="article-slug">URL Slug</Label>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-slate-500">/blog/</span>
                <Input
                  id="article-slug"
                  value={slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    setSlug(slugify(e.target.value));
                  }}
                  placeholder="designing-low-emi-4-layer-pcbs"
                  maxLength={140}
                  className="font-mono text-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="article-excerpt">Short Excerpt</Label>
              <Textarea
                id="article-excerpt"
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                placeholder="A concise technical summary (min 20 characters). If left blank, it will be automatically generated from your article."
                rows={3}
                maxLength={400}
              />
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Min 20 characters (auto-generated from article if empty)</span>
                <span className="tabular-nums">{excerpt.length}/400</span>
              </div>
            </div>

            {/* Tiptap Toolbar & Surface */}
            <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
              <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 bg-slate-50 p-2">
                {(['1', '2', '3', '4'] as const).map((lvl) => {
                  const level = Number(lvl) as 1 | 2 | 3 | 4;
                  const active = editor?.isActive('heading', { level });
                  return (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => editor?.chain().focus().toggleHeading({ level }).run()}
                      className={`px-2 py-1.5 rounded text-xs font-mono font-semibold cursor-pointer ${
                        active ? 'bg-[#0B1528] text-white' : 'text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      H{lvl}
                    </button>
                  );
                })}
                <span className="mx-1 h-5 w-px bg-slate-200" />
                <button
                  type="button"
                  onClick={() => editor?.chain().focus().toggleBold().run()}
                  aria-label="Bold"
                  className={`p-1.5 rounded cursor-pointer ${
                    editor?.isActive('bold') ? 'bg-[#0B1528] text-white' : 'text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <Bold className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => editor?.chain().focus().toggleItalic().run()}
                  aria-label="Italic"
                  className={`p-1.5 rounded cursor-pointer ${
                    editor?.isActive('italic') ? 'bg-[#0B1528] text-white' : 'text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <Italic className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => editor?.chain().focus().toggleUnderline().run()}
                  aria-label="Underline"
                  className={`p-1.5 rounded cursor-pointer ${
                    editor?.isActive('underline') ? 'bg-[#0B1528] text-white' : 'text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <UnderlineIcon className="h-4 w-4" />
                </button>
                <span className="mx-1 h-5 w-px bg-slate-200" />
                <button
                  type="button"
                  onClick={() => editor?.chain().focus().toggleBulletList().run()}
                  aria-label="Bullet list"
                  className={`p-1.5 rounded cursor-pointer ${
                    editor?.isActive('bulletList') ? 'bg-[#0B1528] text-white' : 'text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <List className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                  aria-label="Ordered list"
                  className={`p-1.5 rounded cursor-pointer ${
                    editor?.isActive('orderedList') ? 'bg-[#0B1528] text-white' : 'text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <ListOrdered className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => editor?.chain().focus().toggleBlockquote().run()}
                  aria-label="Blockquote"
                  className={`p-1.5 rounded cursor-pointer ${
                    editor?.isActive('blockquote') ? 'bg-[#0B1528] text-white' : 'text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <Quote className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
                  aria-label="Code block"
                  className={`p-1.5 rounded cursor-pointer ${
                    editor?.isActive('codeBlock') ? 'bg-[#0B1528] text-white' : 'text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <Code className="h-4 w-4" />
                </button>
                <span className="mx-1 h-5 w-px bg-slate-200" />
                <button
                  type="button"
                  onClick={handleInsertLink}
                  aria-label="Insert link"
                  className={`p-1.5 rounded cursor-pointer ${
                    editor?.isActive('link') ? 'bg-[#0B1528] text-white' : 'text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <Link2 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => inlineImageInputRef.current?.click()}
                  aria-label="Upload inline image"
                  title="Upload inline image"
                  className="p-1.5 rounded text-slate-700 hover:bg-slate-200 cursor-pointer"
                >
                  <ImagePlus className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={handleInsertImageUrl}
                  className="px-2 py-1 rounded text-xs text-slate-700 hover:bg-slate-200 cursor-pointer"
                >
                  Img URL
                </button>
                <button
                  type="button"
                  onClick={() =>
                    editor
                      ?.chain()
                      .focus()
                      .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                      .run()
                  }
                  aria-label="Insert table"
                  title="Insert 3x3 table"
                  className="p-1.5 rounded text-slate-700 hover:bg-slate-200 cursor-pointer"
                >
                  <TableIcon className="h-4 w-4" />
                </button>
                {editor?.isActive('table') && (
                  <>
                    <button
                      type="button"
                      onClick={() => editor.chain().focus().addRowAfter().run()}
                      className="px-2 py-1 rounded text-xs text-slate-700 hover:bg-slate-200 cursor-pointer"
                    >
                      +Row
                    </button>
                    <button
                      type="button"
                      onClick={() => editor.chain().focus().addColumnAfter().run()}
                      className="px-2 py-1 rounded text-xs text-slate-700 hover:bg-slate-200 cursor-pointer"
                    >
                      +Col
                    </button>
                    <button
                      type="button"
                      onClick={() => editor.chain().focus().deleteTable().run()}
                      className="px-2 py-1 rounded text-xs text-red-700 hover:bg-red-50 cursor-pointer"
                    >
                      Del Table
                    </button>
                  </>
                )}
              </div>

              <input
                ref={inlineImageInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                className="hidden"
                onChange={handleInlineImageUpload}
              />

              <div className="p-5 sm:p-6">
                <EditorContent editor={editor} />
              </div>
            </div>
          </div>

          {/* Right Metadata & SEO Sidebar */}
          <aside className="space-y-6">
            <div className="rounded-lg border border-slate-200 bg-white p-5 space-y-5">
              <h2 className="text-base font-semibold text-[#0B1528]">Publication Metadata</h2>

              <div className="space-y-2">
                <Label htmlFor="article-category">Category</Label>
                <select
                  id="article-category"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-[#0B1528] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D4ED8]"
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label>Cover Image</Label>
                <div className="flex gap-2">
                  <Input
                    value={coverImage}
                    onChange={(e) => setCoverImage(e.target.value)}
                    placeholder="https://... or upload"
                  />
                  <input
                    ref={coverFileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/avif"
                    className="hidden"
                    onChange={handleCoverUpload}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    disabled={uploadingCover}
                    onClick={() => coverFileInputRef.current?.click()}
                    title="Upload cover image"
                  >
                    <Upload className="h-4 w-4" />
                  </Button>
                </div>
                {coverImage && (
                  <div className="mt-2 aspect-[4/3] overflow-hidden rounded-md border border-slate-200 bg-slate-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={coverImage}
                      alt="Cover preview"
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="article-tags">Tags ({tags.length}/10)</Label>
                <div className="flex gap-2">
                  <Input
                    id="article-tags"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addTag();
                      }
                    }}
                    placeholder="e.g. STM32, PCB, GaN"
                    maxLength={40}
                  />
                  <Button type="button" variant="outline" size="icon" onClick={addTag} aria-label="Add tag">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1 text-xs text-slate-600">
                    {tags.map((t) => (
                      <span
                        key={t}
                        className="inline-flex items-center gap-1 rounded border border-slate-200 bg-slate-50 px-2 py-0.5"
                      >
                        <span>{t}</span>
                        <button
                          type="button"
                          onClick={() => setTags((prev) => prev.filter((item) => item !== t))}
                          aria-label={`Remove tag ${t}`}
                          className="text-slate-400 hover:text-slate-800 cursor-pointer"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-5 space-y-4">
              <h2 className="text-base font-semibold text-[#0B1528]">SEO Settings</h2>
              <div className="space-y-2">
                <Label htmlFor="seo-title">SEO Title</Label>
                <Input
                  id="seo-title"
                  value={metaTitle}
                  onChange={(e) => setMetaTitle(e.target.value)}
                  placeholder="Defaults to article title"
                  maxLength={120}
                />
                <p className="text-xs text-slate-500 tabular-nums">{metaTitle.length}/120</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="seo-description">SEO Description</Label>
                <Textarea
                  id="seo-description"
                  value={metaDescription}
                  onChange={(e) => setMetaDescription(e.target.value)}
                  placeholder="Defaults to short excerpt"
                  rows={3}
                  maxLength={200}
                />
                <p className="text-xs text-slate-500 tabular-nums">{metaDescription.length}/200</p>
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
