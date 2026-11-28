'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format, formatDistanceToNow } from 'date-fns';
import {
  Mail,
  Inbox,
  Send,
  Star,
  Trash2,
  RefreshCw,
  Search,
  Check,
  CheckCircle2,
  X,
  Reply,
  Forward,
  Sparkles,
  ArrowLeft,
  ShieldAlert,
  SlidersHorizontal,
  Info,
  Clock,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  FileText,
  AlertCircle,
  Copy,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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
  fetchAdminEmails,
  sendAdminMail,
  updateAdminEmailStatus,
  deleteAdminEmail,
  simulateInboundEmail,
  PRESET_MAIL_TEMPLATES,
} from '@/modules/admin/mail-service';
import { getInquiriesForAdmin } from '@/modules/admin/admin-service';
import type { AdminEmailMessage, ContactInquiryItem, EmailFolder } from '@/types';

export default function AdminMailPage() {
  const router = useRouter();
  const { firebaseUser, profile, loading: authLoading, isAdmin, isEditor } = useAuth();

  // Navigation & folders
  const [currentFolder, setCurrentFolder] = useState<EmailFolder | 'inquiries'>('inbox');
  const [filterType, setFilterType] = useState<'all' | 'unread' | 'starred'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Data states
  const [emails, setEmails] = useState<AdminEmailMessage[]>([]);
  const [inquiries, setInquiries] = useState<ContactInquiryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [resendConfigured, setResendConfigured] = useState(true);
  const [selectedEmail, setSelectedEmail] = useState<AdminEmailMessage | null>(null);
  const [selectedInquiry, setSelectedInquiry] = useState<ContactInquiryItem | null>(null);

  // Compose Modal states
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeTo, setComposeTo] = useState('');
  const [composeCc, setComposeCc] = useState('');
  const [composeBcc, setComposeBcc] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [showCcBcc, setShowCcBcc] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState('blank');

  // Quick reply in detail view
  const [quickReplyText, setQuickReplyText] = useState('');
  const [sendingQuickReply, setSendingQuickReply] = useState(false);

  // Webhook setup modal
  const [setupModalOpen, setSetupModalOpen] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [previewMode, setPreviewMode] = useState<'html' | 'text'>('html');

  // Load emails & inquiries
  const loadData = useCallback(async (showToast = false) => {
    try {
      setLoading(true);
      const [mailRes, inqRes] = await Promise.all([
        fetchAdminEmails({ folder: 'all' }),
        getInquiriesForAdmin().catch(() => []),
      ]);

      setEmails(mailRes.emails || []);
      setResendConfigured(mailRes.resendConfigured);
      setInquiries(inqRes || []);

      if (showToast) {
        toast.success('Inbox & emails refreshed');
      }
    } catch (err) {
      console.error('Failed to load email data:', err);
      toast.error('Could not refresh mail database');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !firebaseUser) {
      router.replace('/auth/login');
    }
    if (firebaseUser && isEditor) {
      void loadData();
    }
  }, [firebaseUser, isEditor, authLoading, router, loadData]);

  // Counts
  const counts = useMemo(() => {
    const unreadInbox = emails.filter((m) => m.folder === 'inbox' && m.status === 'unread').length;
    const totalInbox = emails.filter((m) => m.folder === 'inbox').length;
    const totalSent = emails.filter((m) => m.folder === 'sent').length;
    const totalStarred = emails.filter((m) => Boolean(m.isStarred) && m.folder !== 'trash').length;
    const totalTrash = emails.filter((m) => m.folder === 'trash').length;
    const pendingInquiries = inquiries.filter((i) => i.status === 'PENDING').length;
    return {
      unreadInbox,
      totalInbox,
      totalSent,
      totalStarred,
      totalTrash,
      pendingInquiries,
    };
  }, [emails, inquiries]);

  // Filtered emails
  const displayedEmails = useMemo(() => {
    let list = emails;
    if (currentFolder !== 'inquiries') {
      list = list.filter((m) => (m.folder || 'inbox') === currentFolder);
    }
    if (filterType === 'unread') {
      list = list.filter((m) => m.status === 'unread');
    } else if (filterType === 'starred') {
      list = list.filter((m) => Boolean(m.isStarred));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (m) =>
          m.subject?.toLowerCase().includes(q) ||
          m.from?.toLowerCase().includes(q) ||
          m.to?.toLowerCase().includes(q) ||
          m.bodyText?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [emails, currentFolder, filterType, searchQuery]);

  // Filtered inquiries
  const displayedInquiries = useMemo(() => {
    let list = inquiries;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (i) =>
          i.subject?.toLowerCase().includes(q) ||
          i.email?.toLowerCase().includes(q) ||
          i.name?.toLowerCase().includes(q) ||
          i.message?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [inquiries, searchQuery]);

  // Actions
  const handleSelectEmail = async (email: AdminEmailMessage) => {
    setSelectedEmail(email);
    setSelectedInquiry(null);
    if (email.status === 'unread') {
      try {
        await updateAdminEmailStatus(email.id, { status: 'read' });
        setEmails((prev) =>
          prev.map((m) => (m.id === email.id ? { ...m, status: 'read' } : m))
        );
      } catch {
        // quiet error
      }
    }
  };

  const handleToggleStar = async (e: React.MouseEvent, email: AdminEmailMessage) => {
    e.stopPropagation();
    const newStar = !email.isStarred;
    try {
      await updateAdminEmailStatus(email.id, { isStarred: newStar });
      setEmails((prev) =>
        prev.map((m) => (m.id === email.id ? { ...m, isStarred: newStar } : m))
      );
      if (selectedEmail?.id === email.id) {
        setSelectedEmail((prev) => (prev ? { ...prev, isStarred: newStar } : null));
      }
      toast.success(newStar ? 'Starred email' : 'Unstarred email');
    } catch {
      toast.error('Failed to update star');
    }
  };

  const handleMoveToTrash = async (email: AdminEmailMessage) => {
    try {
      if (email.folder === 'trash') {
        // Permanent delete
        await deleteAdminEmail(email.id);
        setEmails((prev) => prev.filter((m) => m.id !== email.id));
        if (selectedEmail?.id === email.id) setSelectedEmail(null);
        toast.success('Email permanently deleted');
      } else {
        await updateAdminEmailStatus(email.id, { folder: 'trash' });
        setEmails((prev) =>
          prev.map((m) => (m.id === email.id ? { ...m, folder: 'trash' } : m))
        );
        if (selectedEmail?.id === email.id) setSelectedEmail(null);
        toast.success('Moved to trash');
      }
    } catch {
      toast.error('Failed to delete email');
    }
  };

  const handleRestoreFromTrash = async (email: AdminEmailMessage) => {
    try {
      await updateAdminEmailStatus(email.id, { folder: 'inbox' });
      setEmails((prev) =>
        prev.map((m) => (m.id === email.id ? { ...m, folder: 'inbox' } : m))
      );
      if (selectedEmail?.id === email.id) {
        setSelectedEmail((prev) => (prev ? { ...prev, folder: 'inbox' } : null));
      }
      toast.success('Restored to inbox');
    } catch {
      toast.error('Failed to restore email');
    }
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!composeTo || !composeSubject || !composeBody) {
      toast.error('Please fill in To, Subject and Message body.');
      return;
    }

    try {
      setSendingEmail(true);
      const res = await sendAdminMail({
        to: composeTo,
        subject: composeSubject,
        bodyHtml: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 15px; line-height: 1.6; color: #1e293b;">
          ${composeBody.replace(/\n/g, '<br/>')}
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <p style="font-size: 12px; color: #64748b; margin: 0;">Dispatched via EI HOUSE INDIA Editorial Mail Services (<a href="https://eihouseindia.in" style="color: #0284c7;">eihouseindia.in</a>)</p>
        </div>`,
        bodyText: composeBody,
        cc: composeCc || undefined,
        bcc: composeBcc || undefined,
        fromName: 'EI HOUSE Editorial',
      });

      if (res.email) {
        setEmails((prev) => [res.email!, ...prev]);
      }
      toast.success(res.message || 'Email dispatched successfully!');
      setComposeOpen(false);
      resetComposeFields();
      if (currentFolder !== 'sent') {
        setCurrentFolder('sent');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send email');
    } finally {
      setSendingEmail(false);
    }
  };

  const resetComposeFields = () => {
    setComposeTo('');
    setComposeCc('');
    setComposeBcc('');
    setComposeSubject('');
    setComposeBody('');
    setShowCcBcc(false);
    setSelectedTemplateId('blank');
  };

  const handleTemplateSelect = (tmplId: string) => {
    setSelectedTemplateId(tmplId);
    const tmpl = PRESET_MAIL_TEMPLATES.find((t) => t.id === tmplId);
    if (tmpl && tmpl.id !== 'blank') {
      setComposeSubject(tmpl.subject);
      setComposeBody(tmpl.bodyText);
    }
  };

  const handleOpenReply = (email: AdminEmailMessage) => {
    setComposeTo(email.from);
    setComposeSubject(email.subject.startsWith('Re:') ? email.subject : `Re: ${email.subject}`);
    setComposeBody(`\n\n--- On ${format(new Date(email.createdAt), 'PPP p')}, ${email.from} wrote:\n> ${email.bodyText.replace(/\n/g, '\n> ')}`);
    setComposeOpen(true);
  };

  const handleSendQuickReply = async () => {
    if (!selectedEmail || !quickReplyText.trim()) return;
    try {
      setSendingQuickReply(true);
      const res = await sendAdminMail({
        to: selectedEmail.from,
        subject: selectedEmail.subject.startsWith('Re:') ? selectedEmail.subject : `Re: ${selectedEmail.subject}`,
        bodyHtml: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 15px; line-height: 1.6; color: #1e293b;">
          ${quickReplyText.replace(/\n/g, '<br/>')}
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <blockquote style="border-left: 3px solid #cbd5e1; padding-left: 12px; color: #64748b; margin: 12px 0;">
            <strong>On ${format(new Date(selectedEmail.createdAt), 'PPP p')}, ${selectedEmail.from} wrote:</strong><br/>
            ${selectedEmail.bodyText.replace(/\n/g, '<br/>')}
          </blockquote>
        </div>`,
        bodyText: `${quickReplyText}\n\n--- On ${format(new Date(selectedEmail.createdAt), 'PPP p')}, ${selectedEmail.from} wrote:\n> ${selectedEmail.bodyText.replace(/\n/g, '\n> ')}`,
        inReplyTo: selectedEmail.id,
      });

      if (res.email) {
        setEmails((prev) => [res.email!, ...prev]);
      }
      setQuickReplyText('');
      toast.success('Quick reply sent successfully!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send quick reply');
    } finally {
      setSendingQuickReply(false);
    }
  };

  const handleSimulateInbound = async () => {
    try {
      setSimulating(true);
      const simEmail = await simulateInboundEmail();
      setEmails((prev) => [simEmail, ...prev]);
      toast.success('Incoming test email arrived in Inbox!');
      setCurrentFolder('inbox');
      setSelectedEmail(simEmail);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Simulation failed');
    } finally {
      setSimulating(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-[#FAFBFD]">
        <SiteHeader />
        <main className="flex-1 max-w-7xl mx-auto px-4 py-12 w-full space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-[600px] w-full rounded-2xl" />
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
          <ShieldAlert className="h-12 w-12 text-red-600 mx-auto" />
          <h1 className="text-2xl font-bold text-slate-900">Restricted Admin Area</h1>
          <p className="text-slate-600">You need Administrator or Editor credentials to access EI HOUSE Mail Suite.</p>
          <Button asChild variant="outline">
            <Link href="/admin">Return to Admin Panel</Link>
          </Button>
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      <SiteHeader />

      {/* Main Mail Container */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-3 sm:px-6 py-6 flex flex-col">
        {/* Top Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="sm" className="cursor-pointer">
              <Link href="/admin">
                <ArrowLeft className="h-4 w-4 mr-1" />
                <span>Admin Dashboard</span>
              </Link>
            </Button>
            <div className="h-4 w-[1px] bg-slate-300 hidden sm:block" />
            <div className="flex items-center gap-2">
              <div className="p-2 bg-[#0B1528] text-white rounded-lg">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-[#0B1528] tracking-tight flex items-center gap-2">
                  <span>EI HOUSE Mail Suite</span>
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-emerald-100 text-emerald-800 flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Resend Inbox
                  </span>
                </h1>
                <p className="text-xs text-slate-500">Official transactional & editorial communication platform</p>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void loadData(true)}
              disabled={loading}
              className="cursor-pointer text-slate-700 bg-white"
            >
              <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setSetupModalOpen(true)}
              className="cursor-pointer text-slate-700 bg-white"
            >
              <SlidersHorizontal className="h-4 w-4 mr-1.5 text-blue-600" />
              <span>Inbound & DNS Setup</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => void handleSimulateInbound()}
              disabled={simulating}
              className="cursor-pointer text-amber-700 border-amber-200 bg-amber-50 hover:bg-amber-100"
            >
              <Zap className="h-4 w-4 mr-1.5 text-amber-600" />
              <span>{simulating ? 'Receiving...' : 'Simulate Inbound Mail'}</span>
            </Button>

            <Button
              onClick={() => {
                resetComposeFields();
                setComposeOpen(true);
              }}
              size="sm"
              className="cursor-pointer bg-[#0B1528] hover:bg-[#162746] text-white shadow-sm"
            >
              <Send className="h-4 w-4 mr-1.5" />
              <span>Compose Email</span>
            </Button>
          </div>
        </div>

        {/* 3-Column Mail Client Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mt-5 flex-1 min-h-[750px]">
          {/* Column 1: Sidebar Folders (lg:col-span-2) */}
          <aside className="lg:col-span-2 flex flex-col gap-4">
            <Button
              onClick={() => {
                resetComposeFields();
                setComposeOpen(true);
              }}
              className="w-full justify-start gap-2 bg-[#0B1528] hover:bg-[#162746] text-white shadow-sm h-11 text-sm font-semibold rounded-xl cursor-pointer"
            >
              <Send className="h-4 w-4" />
              <span>Compose Message</span>
            </Button>

            <div className="rounded-xl border border-slate-200 bg-white p-2 space-y-1 shadow-sm">
              <button
                type="button"
                onClick={() => {
                  setCurrentFolder('inbox');
                  setSelectedInquiry(null);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                  currentFolder === 'inbox'
                    ? 'bg-[#0B1528] text-white'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Inbox className="h-4 w-4" />
                  <span>Inbox</span>
                </div>
                {counts.unreadInbox > 0 && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                      currentFolder === 'inbox'
                        ? 'bg-red-500 text-white'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {counts.unreadInbox}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setCurrentFolder('sent');
                  setSelectedInquiry(null);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                  currentFolder === 'sent'
                    ? 'bg-[#0B1528] text-white'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Send className="h-4 w-4" />
                  <span>Sent</span>
                </div>
                <span className="text-xs text-slate-400">{counts.totalSent}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setCurrentFolder('inquiries');
                  setSelectedEmail(null);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                  currentFolder === 'inquiries'
                    ? 'bg-[#0B1528] text-white'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <FileText className="h-4 w-4" />
                  <span>Website Inquiries</span>
                </div>
                {counts.pendingInquiries > 0 && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                      currentFolder === 'inquiries'
                        ? 'bg-amber-400 text-black'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {counts.pendingInquiries}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setCurrentFolder('trash');
                  setSelectedInquiry(null);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                  currentFolder === 'trash'
                    ? 'bg-[#0B1528] text-white'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Trash2 className="h-4 w-4" />
                  <span>Trash</span>
                </div>
                <span className="text-xs text-slate-400">{counts.totalTrash}</span>
              </button>
            </div>

            {/* Quick Status Info Card */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3 shadow-sm text-xs">
              <div className="flex items-center justify-between text-slate-500 font-medium">
                <span>Domain Sender</span>
                <span className="text-emerald-700 font-semibold">Verified</span>
              </div>
              <p className="font-mono text-slate-800 break-all text-[11px] bg-slate-50 p-2 rounded border border-slate-100">
                info@eihouseindia.in
              </p>
              <div className="border-t border-slate-100 pt-3 flex items-center justify-between text-[11px] text-slate-500">
                <span>Webhook Receiver</span>
                <span className="font-mono text-blue-600 font-medium">/api/webhooks/resend</span>
              </div>
            </div>
          </aside>

          {/* Column 2: Email Listing (lg:col-span-4) */}
          <section className="lg:col-span-4 flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            {/* Search & Filter Header */}
            <div className="p-3 border-b border-slate-200 space-y-2 bg-slate-50/50">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search sender, subject or text..."
                  className="pl-9 h-9 text-xs bg-white"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {currentFolder !== 'inquiries' && (
                <div className="flex items-center gap-1.5 pt-1">
                  {(['all', 'unread', 'starred'] as const).map((ft) => (
                    <button
                      key={ft}
                      type="button"
                      onClick={() => setFilterType(ft)}
                      className={`px-2.5 py-1 text-xs rounded-md font-medium capitalize cursor-pointer transition-colors ${
                        filterType === ft
                          ? 'bg-[#0B1528] text-white'
                          : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {ft}
                    </button>
                  ))}
                  <span className="ml-auto text-[11px] text-slate-400 tabular-nums">
                    {displayedEmails.length} messages
                  </span>
                </div>
              )}
            </div>

            {/* Email List Viewport */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 max-h-[700px]">
              {loading ? (
                <div className="p-4 space-y-3">
                  <Skeleton className="h-16 w-full rounded-lg" />
                  <Skeleton className="h-16 w-full rounded-lg" />
                  <Skeleton className="h-16 w-full rounded-lg" />
                </div>
              ) : currentFolder === 'inquiries' ? (
                /* Inquiries listing */
                displayedInquiries.length === 0 ? (
                  <div className="p-10 text-center text-slate-400 text-xs">
                    <Inbox className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                    No website inquiries found.
                  </div>
                ) : (
                  displayedInquiries.map((inq) => {
                    const isSelected = selectedInquiry?.id === inq.id;
                    return (
                      <div
                        key={inq.id}
                        onClick={() => {
                          setSelectedInquiry(inq);
                          setSelectedEmail(null);
                        }}
                        className={`p-3.5 transition-colors cursor-pointer text-left ${
                          isSelected ? 'bg-blue-50/80 border-l-4 border-blue-600' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-900 truncate max-w-[200px]">
                            {inq.name}
                          </span>
                          <span className="text-[11px] text-slate-400 tabular-nums">
                            {formatDistanceToNow(new Date(inq.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-xs font-medium text-slate-800 truncate mt-0.5">
                          {inq.subject}
                        </p>
                        <p className="text-xs text-slate-500 line-clamp-2 mt-1">
                          {inq.message}
                        </p>
                        <div className="mt-2 flex items-center gap-2">
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                              inq.status === 'REPLIED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {inq.status}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {inq.email}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )
              ) : displayedEmails.length === 0 ? (
                /* Empty email list */
                <div className="p-12 text-center text-slate-400 text-xs">
                  <Inbox className="h-9 w-9 mx-auto mb-3 text-slate-300" />
                  <p className="font-medium text-slate-600">No emails in {currentFolder}</p>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Use &ldquo;Simulate Inbound Mail&rdquo; to test receiving or &ldquo;Compose&rdquo; to send.
                  </p>
                </div>
              ) : (
                /* Emails listing */
                displayedEmails.map((email) => {
                  const isSelected = selectedEmail?.id === email.id;
                  const isUnread = email.status === 'unread';
                  return (
                    <div
                      key={email.id}
                      onClick={() => void handleSelectEmail(email)}
                      className={`p-3.5 transition-colors cursor-pointer text-left relative ${
                        isSelected
                          ? 'bg-blue-50/80 border-l-4 border-blue-600'
                          : isUnread
                          ? 'bg-white font-medium hover:bg-slate-50'
                          : 'bg-slate-50/30 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {isUnread && (
                            <span className="h-2 w-2 rounded-full bg-blue-600 shrink-0" />
                          )}
                          <span
                            className={`truncate max-w-[200px] ${
                              isUnread ? 'font-bold text-slate-900' : 'text-slate-700'
                            }`}
                          >
                            {email.folder === 'sent' ? `To: ${email.to}` : email.from}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => void handleToggleStar(e, email)}
                            className="text-slate-300 hover:text-amber-500 cursor-pointer"
                          >
                            <Star
                              className={`h-3.5 w-3.5 ${
                                email.isStarred ? 'fill-amber-400 text-amber-500' : ''
                              }`}
                            />
                          </button>
                          <span className="text-[11px] text-slate-400 tabular-nums">
                            {formatDistanceToNow(new Date(email.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                      </div>

                      <p
                        className={`text-xs mt-1 truncate ${
                          isUnread ? 'font-semibold text-slate-900' : 'text-slate-800'
                        }`}
                      >
                        {email.subject}
                      </p>

                      <p className="text-xs text-slate-500 line-clamp-2 mt-1">
                        {email.bodyText || 'No text preview available.'}
                      </p>

                      <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
                        <span className="uppercase tracking-wider font-semibold">
                          {email.folder}
                        </span>
                        {email.resendId && (
                          <span className="font-mono text-emerald-600">Dispatched via Resend</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          {/* Column 3: Email Detail / Reading Pane (lg:col-span-6) */}
          <section className="lg:col-span-6 flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            {selectedInquiry ? (
              /* Inquiry detail view */
              <div className="p-6 flex flex-col h-full space-y-6 overflow-y-auto">
                <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100">
                  <div>
                    <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800">
                      Website Contact Inquiry
                    </span>
                    <h2 className="text-lg font-bold text-slate-900 mt-2">
                      {selectedInquiry.subject}
                    </h2>
                  </div>
                  <Button
                    onClick={() => {
                      setComposeTo(selectedInquiry.email);
                      setComposeSubject(`Re: ${selectedInquiry.subject}`);
                      setComposeBody(`Dear ${selectedInquiry.name},\n\nThank you for contacting EI HOUSE INDIA regarding "${selectedInquiry.subject}".\n\n\n\nWarm regards,\nEI HOUSE Editorial & Support Team`);
                      setComposeOpen(true);
                    }}
                    size="sm"
                    className="cursor-pointer bg-[#0B1528] text-white"
                  >
                    <Reply className="h-4 w-4 mr-1.5" />
                    Reply via Email
                  </Button>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">From Name:</span>
                    <span className="font-semibold text-slate-800">{selectedInquiry.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">From Email:</span>
                    <span className="font-mono text-slate-800">{selectedInquiry.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Submitted:</span>
                    <span className="text-slate-700">{format(new Date(selectedInquiry.createdAt), 'PPP p')}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Message Content</p>
                  <div className="p-4 bg-white rounded-xl border border-slate-200 text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                    {selectedInquiry.message}
                  </div>
                </div>
              </div>
            ) : selectedEmail ? (
              /* Email detail reading pane */
              <div className="flex flex-col h-full">
                {/* Header Actions Toolbar */}
                <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenReply(selectedEmail)}
                      className="cursor-pointer text-slate-700 bg-white"
                    >
                      <Reply className="h-4 w-4 mr-1.5" />
                      <span>Reply</span>
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => void handleToggleStar(e, selectedEmail)}
                      className="cursor-pointer text-slate-700 bg-white"
                    >
                      <Star
                        className={`h-4 w-4 mr-1.5 ${
                          selectedEmail.isStarred ? 'fill-amber-400 text-amber-500' : ''
                        }`}
                      />
                      <span>{selectedEmail.isStarred ? 'Starred' : 'Star'}</span>
                    </Button>

                    {selectedEmail.folder === 'trash' ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void handleRestoreFromTrash(selectedEmail)}
                        className="cursor-pointer text-emerald-700 border-emerald-200 bg-emerald-50 hover:bg-emerald-100"
                      >
                        <Inbox className="h-4 w-4 mr-1.5" />
                        <span>Restore to Inbox</span>
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void handleMoveToTrash(selectedEmail)}
                        className="cursor-pointer text-red-700 border-red-200 bg-red-50 hover:bg-red-100"
                      >
                        <Trash2 className="h-4 w-4 mr-1.5" />
                        <span>Trash</span>
                      </Button>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-400">View:</span>
                    <button
                      type="button"
                      onClick={() => setPreviewMode('html')}
                      className={`px-2 py-1 rounded text-xs font-medium cursor-pointer ${
                        previewMode === 'html'
                          ? 'bg-[#0B1528] text-white'
                          : 'bg-white border border-slate-200 text-slate-600'
                      }`}
                    >
                      HTML
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewMode('text')}
                      className={`px-2 py-1 rounded text-xs font-medium cursor-pointer ${
                        previewMode === 'text'
                          ? 'bg-[#0B1528] text-white'
                          : 'bg-white border border-slate-200 text-slate-600'
                      }`}
                    >
                      Plain Text
                    </button>
                  </div>
                </div>

                {/* Email Subject & Meta */}
                <div className="p-6 border-b border-slate-100 space-y-3">
                  <h2 className="text-xl font-bold text-[#0B1528] leading-snug">
                    {selectedEmail.subject}
                  </h2>

                  <div className="flex items-start justify-between gap-4 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-500">From:</span>
                        <span className="font-bold text-slate-900">{selectedEmail.from}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-500">To:</span>
                        <span className="text-slate-700">{selectedEmail.to}</span>
                        {selectedEmail.cc && (
                          <span className="text-slate-500">(CC: {selectedEmail.cc})</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right text-slate-400 space-y-1 shrink-0">
                      <div>{format(new Date(selectedEmail.createdAt), 'PPP p')}</div>
                      {selectedEmail.resendId && (
                        <div className="font-mono text-[10px] text-slate-500">
                          Resend ID: {selectedEmail.resendId.substring(0, 16)}...
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Email Body Content */}
                <div className="p-6 flex-1 overflow-y-auto">
                  {previewMode === 'html' && selectedEmail.bodyHtml ? (
                    <div
                      className="prose prose-sm max-w-none text-slate-800 leading-relaxed font-sans"
                      dangerouslySetInnerHTML={{ __html: selectedEmail.bodyHtml }}
                    />
                  ) : (
                    <div className="whitespace-pre-wrap font-sans text-sm text-slate-800 leading-relaxed">
                      {selectedEmail.bodyText || selectedEmail.bodyHtml.replace(/<[^>]*>?/gm, '')}
                    </div>
                  )}
                </div>

                {/* Quick Reply Box */}
                <div className="p-4 border-t border-slate-200 bg-slate-50/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-slate-700">Quick Reply to Sender</Label>
                    <span className="text-[11px] text-slate-400">Replying to: {selectedEmail.from}</span>
                  </div>
                  <Textarea
                    value={quickReplyText}
                    onChange={(e) => setQuickReplyText(e.target.value)}
                    placeholder="Type your reply here..."
                    className="min-h-[80px] text-xs bg-white resize-y"
                  />
                  <div className="flex items-center justify-between pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenReply(selectedEmail)}
                      className="cursor-pointer text-slate-600 text-xs"
                    >
                      Open Full Composer
                    </Button>
                    <Button
                      size="sm"
                      disabled={!quickReplyText.trim() || sendingQuickReply}
                      onClick={() => void handleSendQuickReply()}
                      className="cursor-pointer bg-[#0B1528] text-white text-xs"
                    >
                      <Send className="h-3.5 w-3.5 mr-1" />
                      <span>{sendingQuickReply ? 'Sending...' : 'Send Reply'}</span>
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              /* No email selected placeholder */
              <div className="p-16 text-center text-slate-400 my-auto">
                <Mail className="h-12 w-12 mx-auto mb-3 text-slate-300 stroke-[1.5]" />
                <h3 className="text-base font-semibold text-slate-700">Select an email to read</h3>
                <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                  Click any message from the list on the left to read, reply, star, or delete.
                </p>
                <div className="mt-6 flex justify-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      resetComposeFields();
                      setComposeOpen(true);
                    }}
                    className="cursor-pointer"
                  >
                    <Send className="h-4 w-4 mr-1.5" />
                    Compose New Email
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void handleSimulateInbound()}
                    className="cursor-pointer"
                  >
                    <Zap className="h-4 w-4 mr-1.5 text-amber-500" />
                    Test Inbound
                  </Button>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>

      {/* Compose Email Modal */}
      <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[#0B1528] flex items-center justify-between">
              <span>Compose New Email</span>
              <span className="text-xs font-normal text-slate-500">Sender: info@eihouseindia.in</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Dispatch official transactional or editorial emails through Resend API.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSendEmail} className="space-y-4 pt-2">
            {/* Template Selector */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">Pre-built Email Template</Label>
              <select
                value={selectedTemplateId}
                onChange={(e) => handleTemplateSelect(e.target.value)}
                className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 py-1 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-950"
              >
                {PRESET_MAIL_TEMPLATES.map((tmpl) => (
                  <option key={tmpl.id} value={tmpl.id}>
                    {tmpl.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Recipient To */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-slate-700">To (Recipient Email) *</Label>
                <button
                  type="button"
                  onClick={() => setShowCcBcc(!showCcBcc)}
                  className="text-xs text-blue-600 hover:underline cursor-pointer"
                >
                  {showCcBcc ? 'Hide CC / BCC' : 'Show CC / BCC'}
                </button>
              </div>
              <Input
                type="email"
                required
                value={composeTo}
                onChange={(e) => setComposeTo(e.target.value)}
                placeholder="author@example.com, reader@domain.com"
                className="text-xs"
              />
            </div>

            {/* CC / BCC fields */}
            {showCcBcc && (
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">CC</Label>
                  <Input
                    type="text"
                    value={composeCc}
                    onChange={(e) => setComposeCc(e.target.value)}
                    placeholder="cc@example.com"
                    className="text-xs bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">BCC</Label>
                  <Input
                    type="text"
                    value={composeBcc}
                    onChange={(e) => setComposeBcc(e.target.value)}
                    placeholder="bcc@example.com"
                    className="text-xs bg-white"
                  />
                </div>
              </div>
            )}

            {/* Subject */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">Subject *</Label>
              <Input
                type="text"
                required
                value={composeSubject}
                onChange={(e) => setComposeSubject(e.target.value)}
                placeholder="e.g. Update regarding your article submission"
                className="text-xs"
              />
            </div>

            {/* Message Body */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">Message Body *</Label>
              <Textarea
                required
                rows={9}
                value={composeBody}
                onChange={(e) => setComposeBody(e.target.value)}
                placeholder="Write your email body here..."
                className="text-xs font-sans resize-y"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setComposeOpen(false)}
                className="cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={sendingEmail}
                className="cursor-pointer bg-[#0B1528] text-white hover:bg-[#162746]"
              >
                <Send className="h-4 w-4 mr-1.5" />
                <span>{sendingEmail ? 'Dispatching...' : 'Send Email'}</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Inbound & DNS Setup Modal */}
      <Dialog open={setupModalOpen} onOpenChange={setSetupModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[#0B1528] flex items-center gap-2">
              <SlidersHorizontal className="h-5 w-5 text-blue-600" />
              <span>Resend Inbound & Webhook Configuration</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Follow these two simple steps to receive incoming emails automatically into this inbox.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 pt-2 text-xs">
            {/* Step 1: Webhook URL */}
            <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-blue-900 text-sm">Step 1: Set Inbound Webhook in Resend</span>
                <span className="text-[11px] font-semibold text-blue-700">Resend Dashboard ➔ Webhooks</span>
              </div>
              <p className="text-slate-600 leading-relaxed">
                Add an endpoint in your Resend Dashboard pointing to your domain webhook URL with event <code className="bg-white px-1.5 py-0.5 rounded border border-blue-200 text-blue-800 font-mono">email.received</code>:
              </p>
              <div className="flex items-center gap-2 bg-white p-2.5 rounded-lg border border-slate-200">
                <code className="flex-1 font-mono text-[11px] text-slate-800 break-all select-all">
                  https://eihouseindia.in/api/webhooks/resend
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard('https://eihouseindia.in/api/webhooks/resend', 'Webhook URL')}
                  className="cursor-pointer h-7 text-xs"
                >
                  <Copy className="h-3 w-3 mr-1" />
                  Copy
                </Button>
              </div>
            </div>

            {/* Step 2: DNS MX Record */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-sm">Step 2: DNS Inbound MX Record</span>
                <span className="text-[11px] text-slate-500">Domain Registrar / DNS</span>
              </div>
              <p className="text-slate-600 leading-relaxed">
                To route all incoming emails for <code className="font-semibold text-slate-800">@eihouseindia.in</code> to Resend, ensure your domain DNS has an MX record:
              </p>
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">Type</th>
                      <th className="p-2.5">Host / Name</th>
                      <th className="p-2.5">Priority</th>
                      <th className="p-2.5">Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                    <tr>
                      <td className="p-2.5 font-bold text-slate-900">MX</td>
                      <td className="p-2.5">@</td>
                      <td className="p-2.5">10</td>
                      <td className="p-2.5 text-blue-700">inbound.resend.com</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Verification Button */}
            <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 flex items-center justify-between">
              <div>
                <p className="font-bold text-emerald-900">Want to test receiving right now?</p>
                <p className="text-[11px] text-emerald-700">Click below to simulate an inbound email directly into the inbox.</p>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  setSetupModalOpen(false);
                  void handleSimulateInbound();
                }}
                className="cursor-pointer bg-emerald-700 hover:bg-emerald-800 text-white"
              >
                <Zap className="h-4 w-4 mr-1" />
                Simulate Now
              </Button>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSetupModalOpen(false)}
              className="cursor-pointer"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SiteFooter />
    </div>
  );
}
