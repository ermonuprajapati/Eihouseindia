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
  X,
  Reply,
  ArrowLeft,
  ShieldAlert,
  SlidersHorizontal,
  FileText,
  Copy,
  Zap,
  MoreVertical,
  ChevronRight,
  Users,
  CheckCheck,
  Circle,
  PenSquare,
  ArchiveX,
  CornerUpLeft,
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
  syncInboundEmails,
  PRESET_MAIL_TEMPLATES,
  SENDER_ACCOUNTS,
  type SenderAccountType,
} from '@/modules/admin/mail-service';
import { getInquiriesForAdmin } from '@/modules/admin/admin-service';
import type { AdminEmailMessage, ContactInquiryItem, EmailFolder } from '@/types';

/* ─────────────────────────── helpers ─────────────────────────── */
function getInitials(str: string) {
  const name = str.replace(/<.*?>/, '').trim();
  const parts = name.split(/[\s@]+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (name[0] ?? '?').toUpperCase();
}

function avatarColor(str: string) {
  const colors = [
    'bg-violet-500', 'bg-blue-500', 'bg-emerald-500',
    'bg-orange-500', 'bg-pink-500', 'bg-cyan-500', 'bg-indigo-500',
  ];
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return colors[Math.abs(h) % colors.length];
}

/* ─────────────────────────── component ─────────────────────────── */
export default function AdminMailPage() {
  const router = useRouter();
  const { firebaseUser, profile, loading: authLoading, isEditor } = useAuth();

  const [currentFolder, setCurrentFolder] = useState<EmailFolder | 'inquiries'>('inbox');
  const [filterType, setFilterType] = useState<'all' | 'unread' | 'starred'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [emails, setEmails] = useState<AdminEmailMessage[]>([]);
  const [inquiries, setInquiries] = useState<ContactInquiryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [resendConfigured, setResendConfigured] = useState(true);
  const [selectedEmail, setSelectedEmail] = useState<AdminEmailMessage | null>(null);
  const [selectedInquiry, setSelectedInquiry] = useState<ContactInquiryItem | null>(null);

  const [composeOpen, setComposeOpen] = useState(false);
  const [composeFromAccount, setComposeFromAccount] = useState<SenderAccountType>('info');
  const [composeTo, setComposeTo] = useState('');
  const [composeCc, setComposeCc] = useState('');
  const [composeBcc, setComposeBcc] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [showCcBcc, setShowCcBcc] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState('blank');

  const [quickReplyFromAccount, setQuickReplyFromAccount] = useState<SenderAccountType>('info');
  const [quickReplyText, setQuickReplyText] = useState('');
  const [sendingQuickReply, setSendingQuickReply] = useState(false);
  const [previewMode, setPreviewMode] = useState<'html' | 'text'>('html');
  const [setupModalOpen, setSetupModalOpen] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [syncing, setSyncing] = useState(false);

  /* ─── data loading ─── */
  const loadData = useCallback(async (showToast = false, runSync = true) => {
    try {
      setLoading(true);
      if (runSync) {
        try { await syncInboundEmails(); } catch { /* ignore */ }
      }
      const [mailRes, inqRes] = await Promise.all([
        fetchAdminEmails({ folder: 'all' }),
        getInquiriesForAdmin().catch(() => []),
      ]);
      setEmails(mailRes.emails || []);
      setResendConfigured(mailRes.resendConfigured);
      setInquiries(inqRes || []);
      if (showToast) toast.success('Inbox refreshed');
    } catch {
      toast.error('Could not refresh mail data');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleManualSync = async () => {
    try {
      setSyncing(true);
      const res = await syncInboundEmails();
      toast[res.syncedCount > 0 ? 'success' : 'info'](
        res.syncedCount > 0 ? `${res.syncedCount} new email(s) synced` : 'Already up to date'
      );
      await loadData(false, false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !firebaseUser) router.replace('/auth/login');
    if (firebaseUser && isEditor) void loadData(false, true);
  }, [firebaseUser, isEditor, authLoading, router, loadData]);

  /* ─── derived data ─── */
  const counts = useMemo(() => ({
    unreadInbox: emails.filter(m => m.folder === 'inbox' && m.status === 'unread').length,
    totalInbox: emails.filter(m => m.folder === 'inbox').length,
    totalSent: emails.filter(m => m.folder === 'sent').length,
    totalStarred: emails.filter(m => Boolean(m.isStarred) && m.folder !== 'trash').length,
    totalTrash: emails.filter(m => m.folder === 'trash').length,
    pendingInquiries: inquiries.filter(i => i.status === 'PENDING').length,
  }), [emails, inquiries]);

  const displayedEmails = useMemo(() => {
    let list = emails;
    if (currentFolder !== 'inquiries') list = list.filter(m => (m.folder || 'inbox') === currentFolder);
    if (filterType === 'unread') list = list.filter(m => m.status === 'unread');
    else if (filterType === 'starred') list = list.filter(m => Boolean(m.isStarred));
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(m =>
        m.subject?.toLowerCase().includes(q) ||
        m.from?.toLowerCase().includes(q) ||
        m.to?.toLowerCase().includes(q) ||
        m.bodyText?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [emails, currentFolder, filterType, searchQuery]);

  const displayedInquiries = useMemo(() => {
    let list = inquiries;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(i =>
        i.subject?.toLowerCase().includes(q) || i.email?.toLowerCase().includes(q) ||
        i.name?.toLowerCase().includes(q) || i.message?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [inquiries, searchQuery]);

  /* ─── actions ─── */
  const handleSelectEmail = async (email: AdminEmailMessage) => {
    setSelectedEmail(email);
    setSelectedInquiry(null);
    setQuickReplyText('');
    if (email.status === 'unread') {
      try {
        await updateAdminEmailStatus(email.id, { status: 'read' });
        setEmails(prev => prev.map(m => m.id === email.id ? { ...m, status: 'read' } : m));
      } catch { /* quiet */ }
    }
  };

  const handleToggleStar = async (e: React.MouseEvent, email: AdminEmailMessage) => {
    e.stopPropagation();
    const newStar = !email.isStarred;
    try {
      await updateAdminEmailStatus(email.id, { isStarred: newStar });
      setEmails(prev => prev.map(m => m.id === email.id ? { ...m, isStarred: newStar } : m));
      if (selectedEmail?.id === email.id) setSelectedEmail(prev => prev ? { ...prev, isStarred: newStar } : null);
    } catch { toast.error('Could not update star'); }
  };

  const handleMoveToTrash = async (email: AdminEmailMessage) => {
    try {
      if (email.folder === 'trash') {
        await deleteAdminEmail(email.id);
        setEmails(prev => prev.filter(m => m.id !== email.id));
        if (selectedEmail?.id === email.id) setSelectedEmail(null);
        toast.success('Permanently deleted');
      } else {
        await updateAdminEmailStatus(email.id, { folder: 'trash' });
        setEmails(prev => prev.map(m => m.id === email.id ? { ...m, folder: 'trash' } : m));
        if (selectedEmail?.id === email.id) setSelectedEmail(null);
        toast.success('Moved to trash');
      }
    } catch { toast.error('Action failed'); }
  };

  const handleRestoreFromTrash = async (email: AdminEmailMessage) => {
    try {
      await updateAdminEmailStatus(email.id, { folder: 'inbox' });
      setEmails(prev => prev.map(m => m.id === email.id ? { ...m, folder: 'inbox' } : m));
      if (selectedEmail?.id === email.id) setSelectedEmail(prev => prev ? { ...prev, folder: 'inbox' } : null);
      toast.success('Restored to Inbox');
    } catch { toast.error('Restore failed'); }
  };

  const resetComposeFields = () => {
    setComposeFromAccount('info');
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
    const tmpl = PRESET_MAIL_TEMPLATES.find(t => t.id === tmplId);
    if (tmpl && tmpl.id !== 'blank') {
      setComposeSubject(tmpl.subject);
      setComposeBody(tmpl.bodyText);
    }
  };

  const handleOpenReply = (email: AdminEmailMessage) => {
    setComposeTo(email.from);
    setComposeSubject(email.subject.startsWith('Re:') ? email.subject : `Re: ${email.subject}`);
    setComposeBody(`\n\n— On ${format(new Date(email.createdAt), 'PPP p')}, ${email.from} wrote:\n> ${email.bodyText.replace(/\n/g, '\n> ')}`);
    setComposeOpen(true);
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!composeTo || !composeSubject || !composeBody) {
      toast.error('Fill in To, Subject, and Message body.');
      return;
    }
    try {
      setSendingEmail(true);
      const res = await sendAdminMail({
        to: composeTo,
        subject: composeSubject,
        fromAccount: composeFromAccount,
        bodyHtml: `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:15px;line-height:1.65;color:#1e293b;">${composeBody.replace(/\n/g, '<br/>')}<hr style="border:0;border-top:1px solid #e2e8f0;margin:28px 0;"/><p style="font-size:12px;color:#94a3b8;margin:0;">Sent via EI HOUSE INDIA (${SENDER_ACCOUNTS[composeFromAccount].email})</p></div>`,
        bodyText: composeBody,
        cc: composeCc || undefined,
        bcc: composeBcc || undefined,
      });
      if (res.email) setEmails(prev => [res.email!, ...prev]);
      toast.success('Email dispatched ✓');
      setComposeOpen(false);
      resetComposeFields();
      setCurrentFolder('sent');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send');
    } finally {
      setSendingEmail(false);
    }
  };

  const handleSendQuickReply = async () => {
    if (!selectedEmail || !quickReplyText.trim()) return;
    try {
      setSendingQuickReply(true);
      const res = await sendAdminMail({
        to: selectedEmail.from,
        subject: selectedEmail.subject.startsWith('Re:') ? selectedEmail.subject : `Re: ${selectedEmail.subject}`,
        fromAccount: quickReplyFromAccount,
        bodyHtml: `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:15px;line-height:1.65;color:#1e293b;">${quickReplyText.replace(/\n/g, '<br/>')}<hr style="border:0;border-top:1px solid #e2e8f0;margin:24px 0;"/><blockquote style="border-left:3px solid #cbd5e1;padding-left:14px;color:#64748b;margin:0;">${selectedEmail.bodyText.replace(/\n/g, '<br/>')}</blockquote></div>`,
        bodyText: quickReplyText,
        inReplyTo: selectedEmail.id,
      });
      if (res.email) setEmails(prev => [res.email!, ...prev]);
      setQuickReplyText('');
      toast.success('Reply sent ✓');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Reply failed');
    } finally {
      setSendingQuickReply(false);
    }
  };

  const handleSimulateInbound = async () => {
    try {
      setSimulating(true);
      const simEmail = await simulateInboundEmail();
      setEmails(prev => [simEmail, ...prev]);
      setCurrentFolder('inbox');
      setSelectedEmail(simEmail);
      toast.success('Test email arrived in Inbox');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Simulation failed');
    } finally {
      setSimulating(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  };

  /* ─── auth guards ─── */
  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <SiteHeader />
        <main className="flex-1 max-w-7xl mx-auto px-4 py-10 w-full space-y-3">
          <Skeleton className="h-9 w-56" />
          <Skeleton className="h-[640px] w-full rounded-2xl" />
        </main>
      </div>
    );
  }

  if (!firebaseUser || !isEditor || !profile) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <SiteHeader />
        <main className="flex-1 flex items-center justify-center px-4">
          <div className="text-center space-y-4 max-w-sm">
            <div className="mx-auto h-14 w-14 rounded-full bg-red-100 flex items-center justify-center">
              <ShieldAlert className="h-7 w-7 text-red-600" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">Access Restricted</h1>
            <p className="text-sm text-slate-500">Admin or Editor role is required to access the Mail Suite.</p>
            <Button asChild variant="outline" size="sm">
              <Link href="/admin">Return to Dashboard</Link>
            </Button>
          </div>
        </main>
      </div>
    );
  }

  /* ─── nav items ─── */
  const navItems = [
    { id: 'inbox' as const,     label: 'Inbox',     icon: Inbox,     count: counts.unreadInbox,      countColor: 'bg-blue-600 text-white' },
    { id: 'sent' as const,      label: 'Sent',      icon: Send,      count: counts.totalSent,         countColor: 'bg-slate-200 text-slate-600' },
    { id: 'starred' as const,   label: 'Starred',   icon: Star,      count: counts.totalStarred,      countColor: 'bg-amber-100 text-amber-700' },
    { id: 'inquiries' as const, label: 'Inquiries', icon: Users,     count: counts.pendingInquiries,  countColor: 'bg-orange-500 text-white' },
    { id: 'trash' as const,     label: 'Trash',     icon: Trash2,    count: counts.totalTrash,        countColor: 'bg-slate-200 text-slate-600' },
  ] as const;

  /* ─── main render ─── */
  return (
    <div className="min-h-screen flex flex-col bg-[#F3F4F8]">
      <SiteHeader />

      <main className="flex-1 flex flex-col">
        {/* ── Top chrome bar ── */}
        <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3">
          <div className="max-w-[1700px] mx-auto flex items-center justify-between gap-4">
            {/* Left: breadcrumb + title */}
            <div className="flex items-center gap-3 min-w-0">
              <Link
                href="/admin"
                className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition-colors font-medium shrink-0"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Admin
              </Link>
              <ChevronRight className="h-3.5 w-3.5 text-slate-300 shrink-0" />
              <div className="flex items-center gap-2 min-w-0">
                <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shrink-0">
                  <Mail className="h-4 w-4 text-white" />
                </div>
                <div className="min-w-0">
                  <span className="text-sm font-bold text-slate-900 truncate">Mail Suite</span>
                  {resendConfigured && (
                    <span className="ml-2 inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Connected
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Right: action strip */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => void handleManualSync()}
                disabled={syncing || loading}
                title="Sync from Resend"
                className="h-8 px-3 rounded-lg text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Syncing…' : 'Sync'}
              </button>
              <button
                type="button"
                onClick={() => void loadData(true, false)}
                disabled={loading}
                title="Refresh"
                className="h-8 w-8 rounded-lg text-slate-600 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 flex items-center justify-center transition-colors cursor-pointer"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                type="button"
                onClick={() => setSetupModalOpen(true)}
                title="Webhook & DNS Setup"
                className="h-8 px-3 rounded-lg text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Setup
              </button>
              <button
                type="button"
                onClick={() => void handleSimulateInbound()}
                disabled={simulating}
                title="Simulate incoming mail"
                className="h-8 px-3 rounded-lg text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100 disabled:opacity-50 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Zap className="h-3.5 w-3.5" />
                {simulating ? 'Receiving…' : 'Test Inbound'}
              </button>
              <button
                type="button"
                onClick={() => { resetComposeFields(); setComposeOpen(true); }}
                className="h-8 px-4 rounded-lg text-xs font-semibold text-white bg-[#0B1528] hover:bg-[#1a2d4d] flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
              >
                <PenSquare className="h-3.5 w-3.5" />
                Compose
              </button>
            </div>
          </div>
        </div>

        {/* ── 3-pane layout ── */}
        <div className="flex-1 max-w-[1700px] w-full mx-auto flex overflow-hidden" style={{ height: 'calc(100vh - 128px)' }}>

          {/* Pane 1: Sidebar nav */}
          <aside className="w-52 shrink-0 flex flex-col bg-white border-r border-slate-200 py-4 overflow-y-auto">
            {/* Compose CTA */}
            <div className="px-3 mb-4">
              <button
                type="button"
                onClick={() => { resetComposeFields(); setComposeOpen(true); }}
                className="w-full h-10 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-sm shadow-blue-200 hover:opacity-90 transition-opacity cursor-pointer"
              >
                <PenSquare className="h-4 w-4" />
                New Message
              </button>
            </div>

            {/* Folder navigation */}
            <nav className="px-2 space-y-0.5">
              {navItems.map(({ id, label, icon: Icon, count, countColor }) => {
                const active = currentFolder === id || (id === 'starred' && filterType === 'starred' && currentFolder !== 'inquiries' && currentFolder !== 'trash');
                const handleClick = () => {
                  if (id === 'starred') {
                    setCurrentFolder('inbox');
                    setFilterType('starred');
                  } else {
                    setCurrentFolder(id as EmailFolder | 'inquiries');
                    setFilterType('all');
                    setSelectedEmail(null);
                    setSelectedInquiry(null);
                  }
                };
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={handleClick}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all cursor-pointer group ${
                      active
                        ? 'bg-blue-50 text-blue-700 font-semibold'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <Icon className={`h-4 w-4 ${active ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
                      {label}
                    </span>
                    {count > 0 && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center ${countColor}`}>
                        {count > 99 ? '99+' : count}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Sender identities */}
            <div className="mt-auto px-3 pt-6">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 px-1">Identities</p>
              <div className="space-y-1">
                {(['info', 'admin', 'founder'] as const).map((key) => {
                  const acc = SENDER_ACCOUNTS[key];
                  const colorMap = { info: 'bg-blue-500', admin: 'bg-purple-500', founder: 'bg-amber-500' };
                  return (
                    <div key={key} className="flex items-center gap-2 px-1 py-1">
                      <span className={`h-2 w-2 rounded-full shrink-0 ${colorMap[key]}`} />
                      <span className="text-[11px] text-slate-500 truncate font-mono">{acc.email}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </aside>

          {/* Pane 2: Message list */}
          <section className="w-80 shrink-0 flex flex-col bg-white border-r border-slate-200 overflow-hidden">
            {/* Search bar */}
            <div className="p-3 border-b border-slate-100">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
                <input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search mail…"
                  className="w-full h-9 pl-8 pr-8 rounded-lg bg-slate-100 text-sm text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-500/30 focus:bg-white transition-all"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Filter tabs — only for email folders */}
            {currentFolder !== 'inquiries' && (
              <div className="px-3 py-2 border-b border-slate-100 flex items-center gap-1">
                {(['all', 'unread', 'starred'] as const).map(ft => (
                  <button
                    key={ft}
                    type="button"
                    onClick={() => setFilterType(ft)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold capitalize transition-colors cursor-pointer ${
                      filterType === ft
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    {ft}
                  </button>
                ))}
                <span className="ml-auto text-[11px] text-slate-400 tabular-nums">
                  {(currentFolder as string) === 'inquiries' ? displayedInquiries.length : displayedEmails.length}
                </span>
              </div>
            )}

            {/* Scroll area */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="p-3 space-y-3">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="flex gap-3 items-start">
                      <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-3.5 w-3/4" />
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-3 w-2/3" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : currentFolder === 'inquiries' ? (
                displayedInquiries.length === 0 ? (
                  <EmptyState icon={Users} title="No inquiries" subtitle="Website contact form submissions will appear here." />
                ) : (
                  displayedInquiries.map(inq => {
                    const isSelected = selectedInquiry?.id === inq.id;
                    return (
                      <button
                        key={inq.id}
                        type="button"
                        onClick={() => { setSelectedInquiry(inq); setSelectedEmail(null); }}
                        className={`w-full text-left px-4 py-3.5 border-b border-slate-100 transition-colors cursor-pointer group ${
                          isSelected ? 'bg-blue-50/80' : 'hover:bg-slate-50/80'
                        }`}
                      >
                        <div className="flex gap-3 items-start">
                          <div className={`h-9 w-9 rounded-full shrink-0 flex items-center justify-center text-white text-xs font-bold ${avatarColor(inq.email)}`}>
                            {getInitials(inq.name)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-semibold text-slate-900 truncate">{inq.name}</span>
                              <span className="text-[10px] text-slate-400 shrink-0">
                                {formatDistanceToNow(new Date(inq.createdAt), { addSuffix: true })}
                              </span>
                            </div>
                            <p className="text-xs text-slate-700 font-medium truncate mt-0.5">{inq.subject}</p>
                            <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">{inq.message}</p>
                            <span className={`mt-1.5 inline-block text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                              inq.status === 'REPLIED' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'
                            }`}>{inq.status}</span>
                          </div>
                        </div>
                      </button>
                    );
                  })
                )
              ) : displayedEmails.length === 0 ? (
                <EmptyState
                  icon={Inbox}
                  title={`No messages in ${currentFolder}`}
                  subtitle={currentFolder === 'inbox' ? 'Sync from Resend or simulate an inbound email to get started.' : ''}
                />
              ) : (
                displayedEmails.map(email => {
                  const isSelected = selectedEmail?.id === email.id;
                  const isUnread = email.status === 'unread';
                  const displayName = email.folder === 'sent' ? email.to : email.from;
                  return (
                    <button
                      key={email.id}
                      type="button"
                      onClick={() => void handleSelectEmail(email)}
                      className={`w-full text-left px-4 py-3.5 border-b border-slate-100 transition-colors cursor-pointer group relative ${
                        isSelected
                          ? 'bg-blue-50/80'
                          : isUnread
                          ? 'bg-white hover:bg-slate-50/80'
                          : 'bg-slate-50/40 hover:bg-slate-50/80'
                      }`}
                    >
                      {isUnread && !isSelected && (
                        <span className="absolute left-1.5 top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-blue-600" />
                      )}
                      <div className="flex gap-3 items-start">
                        <div className={`h-9 w-9 rounded-full shrink-0 flex items-center justify-center text-white text-xs font-bold ${avatarColor(displayName)}`}>
                          {getInitials(displayName)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className={`text-xs truncate ${isUnread ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>
                              {email.folder === 'sent' ? `To: ${email.to.split(',')[0].trim()}` : email.from.replace(/<.*>/, '').trim() || email.from}
                            </span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={e => void handleToggleStar(e, email)}
                                className={`transition-opacity cursor-pointer ${email.isStarred ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                              >
                                <Star className={`h-3.5 w-3.5 ${email.isStarred ? 'fill-amber-400 text-amber-400' : 'text-slate-300 hover:text-amber-400'}`} />
                              </button>
                              <span className="text-[10px] text-slate-400 tabular-nums">
                                {formatDistanceToNow(new Date(email.createdAt), { addSuffix: false })}
                              </span>
                            </div>
                          </div>
                          <p className={`text-xs truncate mt-0.5 ${isUnread ? 'font-semibold text-slate-900' : 'text-slate-700'}`}>
                            {email.subject}
                          </p>
                          <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                            {email.bodyText || 'No preview available'}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </section>

          {/* Pane 3: Reading / detail pane */}
          <section className="flex-1 flex flex-col bg-white overflow-hidden">
            {selectedInquiry ? (
              /* ── Inquiry detail ── */
              <div className="flex flex-col h-full">
                {/* Toolbar */}
                <div className="flex items-center gap-2 px-6 py-3 border-b border-slate-100 bg-slate-50/50">
                  <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-orange-100 text-orange-700 border border-orange-200/60">
                    Website Inquiry
                  </span>
                  <div className="ml-auto flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setComposeTo(selectedInquiry.email);
                        setComposeSubject(`Re: ${selectedInquiry.subject}`);
                        setComposeBody(`Dear ${selectedInquiry.name},\n\nThank you for contacting EI HOUSE INDIA.\n\n\n\nWarm regards,\nEI HOUSE Editorial & Support Team`);
                        setComposeOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-lg text-xs font-semibold text-white bg-[#0B1528] hover:bg-[#1a2d4d] transition-colors cursor-pointer"
                    >
                      <CornerUpLeft className="h-3.5 w-3.5" />
                      Reply via Email
                    </button>
                  </div>
                </div>
                {/* Content */}
                <div className="flex-1 overflow-y-auto px-8 py-7 space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">{selectedInquiry.subject}</h2>
                    <p className="text-xs text-slate-500 mt-1">{format(new Date(selectedInquiry.createdAt), 'PPPP · p')}</p>
                  </div>
                  <div className="flex items-center gap-4 py-4 border-y border-slate-100">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${avatarColor(selectedInquiry.email)}`}>
                      {getInitials(selectedInquiry.name)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{selectedInquiry.name}</p>
                      <p className="text-xs text-slate-500 font-mono">{selectedInquiry.email}</p>
                    </div>
                  </div>
                  <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap bg-slate-50 rounded-xl p-5 border border-slate-100">
                    {selectedInquiry.message}
                  </div>
                </div>
              </div>
            ) : selectedEmail ? (
              /* ── Email detail ── */
              <div className="flex flex-col h-full">
                {/* Toolbar */}
                <div className="flex items-center gap-2 px-6 py-3 border-b border-slate-100 bg-slate-50/40 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <ToolbarBtn icon={CornerUpLeft} label="Reply" onClick={() => handleOpenReply(selectedEmail)} />
                    <ToolbarBtn
                      icon={Star}
                      label={selectedEmail.isStarred ? 'Starred' : 'Star'}
                      active={selectedEmail.isStarred}
                      onClick={e => void handleToggleStar(e, selectedEmail)}
                    />
                    {selectedEmail.folder === 'trash' ? (
                      <ToolbarBtn icon={Inbox} label="Restore" onClick={() => void handleRestoreFromTrash(selectedEmail)} />
                    ) : (
                      <ToolbarBtn icon={ArchiveX} label="Trash" danger onClick={() => void handleMoveToTrash(selectedEmail)} />
                    )}
                  </div>
                  {/* View toggle */}
                  <div className="ml-auto flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setPreviewMode('html')}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${previewMode === 'html' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}
                    >HTML</button>
                    <button
                      type="button"
                      onClick={() => setPreviewMode('text')}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${previewMode === 'text' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}
                    >Plain</button>
                  </div>
                  {selectedEmail.status === 'read' && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-slate-400">
                      <CheckCheck className="h-3 w-3" /> Read
                    </span>
                  )}
                </div>

                {/* Subject & meta */}
                <div className="px-7 py-5 border-b border-slate-100">
                  <h2 className="text-xl font-bold text-slate-900 leading-snug mb-3">{selectedEmail.subject}</h2>
                  <div className="flex items-start gap-4">
                    <div className={`h-10 w-10 rounded-full shrink-0 flex items-center justify-center text-white text-sm font-bold ${avatarColor(selectedEmail.from)}`}>
                      {getInitials(selectedEmail.from)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-slate-900">
                          {selectedEmail.from.replace(/<.*>/, '').trim() || selectedEmail.from}
                        </span>
                        <span className="text-xs text-slate-400 font-mono">
                          {'<'}{selectedEmail.from.match(/<(.+)>/)?.[1] ?? selectedEmail.from}{'>'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 flex flex-wrap gap-x-3">
                        <span>To: <span className="text-slate-700">{selectedEmail.to}</span></span>
                        {selectedEmail.cc && <span>CC: {selectedEmail.cc}</span>}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-slate-500">{format(new Date(selectedEmail.createdAt), 'MMM d, yyyy')}</p>
                      <p className="text-[11px] text-slate-400">{format(new Date(selectedEmail.createdAt), 'h:mm a')}</p>
                    </div>
                  </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-7 py-6">
                  {previewMode === 'html' && selectedEmail.bodyHtml ? (
                    <div
                      className="prose prose-sm max-w-none text-slate-800 leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: selectedEmail.bodyHtml }}
                    />
                  ) : (
                    <div className="whitespace-pre-wrap text-sm text-slate-700 leading-relaxed font-sans">
                      {selectedEmail.bodyText || selectedEmail.bodyHtml.replace(/<[^>]*>?/gm, '')}
                    </div>
                  )}
                </div>

                {/* Quick reply */}
                <div className="border-t border-slate-200 bg-white px-6 py-4">
                  <div className="border border-slate-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-400 transition-all">
                    <div className="flex items-center gap-2 px-3 pt-2.5 pb-1.5 bg-slate-50/80 border-b border-slate-100">
                      <span className="text-[11px] text-slate-500 font-medium">Reply as:</span>
                      <select
                        value={quickReplyFromAccount}
                        onChange={e => setQuickReplyFromAccount(e.target.value as SenderAccountType)}
                        className="text-[11px] text-slate-700 font-semibold bg-transparent border-none outline-none cursor-pointer pr-1"
                      >
                        <option value="info">EIHOUSE INDIA — info@eihouseindia.in</option>
                        <option value="admin">EI HOUSE Admin — admin@eihouseindia.in</option>
                        <option value="founder">Monu Prajapati (Founder) — founder@eihouseindia.in</option>
                      </select>
                    </div>
                    <textarea
                      value={quickReplyText}
                      onChange={e => setQuickReplyText(e.target.value)}
                      placeholder="Write a reply…"
                      rows={4}
                      className="w-full px-4 py-3 text-sm text-slate-800 placeholder-slate-400 resize-none outline-none bg-white"
                    />
                    <div className="flex items-center justify-between px-3 pb-3 pt-1">
                      <button
                        type="button"
                        onClick={() => handleOpenReply(selectedEmail)}
                        className="text-xs text-slate-500 hover:text-slate-800 transition-colors cursor-pointer font-medium"
                      >
                        Open full composer ↗
                      </button>
                      <button
                        type="button"
                        disabled={!quickReplyText.trim() || sendingQuickReply}
                        onClick={() => void handleSendQuickReply()}
                        className="inline-flex items-center gap-1.5 h-8 px-4 rounded-lg text-xs font-semibold text-white bg-[#0B1528] hover:bg-[#1a2d4d] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                      >
                        <Send className="h-3.5 w-3.5" />
                        {sendingQuickReply ? 'Sending…' : 'Send Reply'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* ── Empty state ── */
              <div className="flex-1 flex flex-col items-center justify-center text-center px-6 select-none">
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center mb-4">
                  <Mail className="h-8 w-8 text-slate-400 stroke-[1.5]" />
                </div>
                <h3 className="text-base font-semibold text-slate-700">Select a message</h3>
                <p className="text-sm text-slate-400 mt-1 max-w-xs leading-relaxed">
                  Choose a message from the list to read, reply, star or delete.
                </p>
                <div className="flex gap-2 mt-6">
                  <button
                    type="button"
                    onClick={() => { resetComposeFields(); setComposeOpen(true); }}
                    className="inline-flex items-center gap-2 h-9 px-4 rounded-lg text-xs font-semibold text-white bg-[#0B1528] hover:bg-[#1a2d4d] transition-colors cursor-pointer"
                  >
                    <PenSquare className="h-3.5 w-3.5" />
                    Compose
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleSimulateInbound()}
                    disabled={simulating}
                    className="inline-flex items-center gap-2 h-9 px-4 rounded-lg text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100 disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    <Zap className="h-3.5 w-3.5" />
                    Test Inbound
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>

      {/* ── Compose Modal ── */}
      <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0 rounded-2xl">
          {/* Header */}
          <div className="px-6 pt-5 pb-4 border-b border-slate-100">
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <PenSquare className="h-5 w-5 text-blue-600" />
                New Message
              </span>
              <span className="text-xs font-normal text-slate-400">
                via <strong className="text-slate-600 font-semibold">{SENDER_ACCOUNTS[composeFromAccount].email}</strong>
              </span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 mt-0.5">
              Dispatch official communications through EI HOUSE Resend infrastructure.
            </DialogDescription>
          </div>

          <form onSubmit={handleSendEmail} className="px-6 py-5 space-y-4">
            {/* From account selector */}
            <div>
              <p className="text-xs font-semibold text-slate-600 mb-2">Send from</p>
              <div className="grid grid-cols-3 gap-2">
                {(['info', 'admin', 'founder'] as const).map(key => {
                  const acc = SENDER_ACCOUNTS[key];
                  const sel = composeFromAccount === key;
                  const dotColor = { info: 'bg-blue-500', admin: 'bg-purple-500', founder: 'bg-amber-500' }[key];
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setComposeFromAccount(key)}
                      className={`text-left p-3 rounded-xl border-2 transition-all cursor-pointer ${
                        sel ? 'border-blue-500 bg-blue-50/60' : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className={`h-2 w-2 rounded-full ${dotColor}`} />
                        <span className="text-xs font-bold text-slate-800">{acc.badge}</span>
                      </div>
                      <p className="text-[10px] font-mono text-slate-500 truncate">{acc.email}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Template */}
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1.5">Template</label>
              <select
                value={selectedTemplateId}
                onChange={e => handleTemplateSelect(e.target.value)}
                className="w-full h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                {PRESET_MAIL_TEMPLATES.map(t => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </select>
            </div>

            {/* To + CC/BCC toggle */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-600">To <span className="text-red-500">*</span></label>
                <button type="button" onClick={() => setShowCcBcc(!showCcBcc)} className="text-xs text-blue-600 hover:underline cursor-pointer">
                  {showCcBcc ? 'Hide CC/BCC' : 'Add CC/BCC'}
                </button>
              </div>
              <Input type="email" required value={composeTo} onChange={e => setComposeTo(e.target.value)} placeholder="recipient@example.com" className="text-sm" />
            </div>

            {showCcBcc && (
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1.5">CC</label>
                  <Input type="text" value={composeCc} onChange={e => setComposeCc(e.target.value)} placeholder="cc@example.com" className="text-sm bg-white" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1.5">BCC</label>
                  <Input type="text" value={composeBcc} onChange={e => setComposeBcc(e.target.value)} placeholder="bcc@example.com" className="text-sm bg-white" />
                </div>
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1.5">Subject <span className="text-red-500">*</span></label>
              <Input type="text" required value={composeSubject} onChange={e => setComposeSubject(e.target.value)} placeholder="Email subject line…" className="text-sm" />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1.5">Message <span className="text-red-500">*</span></label>
              <Textarea
                required
                rows={9}
                value={composeBody}
                onChange={e => setComposeBody(e.target.value)}
                placeholder="Write your message…"
                className="text-sm font-sans resize-y"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setComposeOpen(false)}
                className="h-9 px-4 rounded-lg text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Discard
              </button>
              <button
                type="submit"
                disabled={sendingEmail}
                className="h-9 px-5 rounded-lg text-sm font-semibold text-white bg-[#0B1528] hover:bg-[#1a2d4d] disabled:opacity-50 flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Send className="h-3.5 w-3.5" />
                {sendingEmail ? 'Sending…' : 'Send Email'}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── DNS / Webhook Setup Modal ── */}
      <Dialog open={setupModalOpen} onOpenChange={setSetupModalOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
              <SlidersHorizontal className="h-5 w-5 text-blue-600" />
              Resend Inbound Setup
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Two steps to receive incoming emails directly in this inbox.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <SetupStep
              step={1}
              title="Add Webhook in Resend"
              subtitle="Resend Dashboard → Webhooks → Add Endpoint"
              color="blue"
            >
              <div className="flex items-center gap-2 mt-2 bg-white border border-slate-200 rounded-lg p-2.5">
                <code className="flex-1 text-[11px] font-mono text-slate-700 break-all select-all">
                  https://eihouseindia.in/api/webhooks/resend
                </code>
                <button
                  type="button"
                  onClick={() => copyToClipboard('https://eihouseindia.in/api/webhooks/resend', 'Webhook URL')}
                  className="shrink-0 h-7 px-2.5 rounded-md text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Copy className="h-3 w-3" /> Copy
                </button>
              </div>
              <p className="text-[11px] text-blue-700 mt-1.5">Events to select: <code className="bg-blue-100 px-1 rounded">email.received</code> + any delivery tracking events</p>
            </SetupStep>

            <SetupStep
              step={2}
              title="DNS MX Record"
              subtitle="Domain Registrar → DNS Management"
              color="slate"
            >
              <div className="mt-2 overflow-hidden rounded-lg border border-slate-200">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-500 font-semibold">
                    <tr>{['Type', 'Host', 'Priority', 'Value'].map(h => <th key={h} className="px-3 py-2">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    <tr className="font-mono text-[11px]">
                      <td className="px-3 py-2 font-bold text-slate-900">MX</td>
                      <td className="px-3 py-2 text-slate-600">@</td>
                      <td className="px-3 py-2 text-slate-600">10</td>
                      <td className="px-3 py-2 text-blue-700">inbound.resend.com</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </SetupStep>

            <div className="flex items-center justify-between p-4 rounded-xl bg-emerald-50 border border-emerald-200">
              <div>
                <p className="text-xs font-bold text-emerald-900">Test it now</p>
                <p className="text-[11px] text-emerald-700 mt-0.5">Simulate an inbound email instantly</p>
              </div>
              <button
                type="button"
                onClick={() => { setSetupModalOpen(false); void handleSimulateInbound(); }}
                className="h-8 px-4 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Zap className="h-3.5 w-3.5" /> Simulate
              </button>
            </div>
          </div>

          <DialogFooter>
            <button
              type="button"
              onClick={() => setSetupModalOpen(false)}
              className="h-9 px-5 rounded-lg text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              Close
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SiteFooter />
    </div>
  );
}

/* ─────────────── small reusable sub-components ─────────────── */
function EmptyState({ icon: Icon, title, subtitle }: { icon: React.ElementType; title: string; subtitle?: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full py-16 px-6 text-center select-none">
      <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
        <Icon className="h-6 w-6 text-slate-300" />
      </div>
      <p className="text-sm font-semibold text-slate-600">{title}</p>
      {subtitle && <p className="text-xs text-slate-400 mt-1 max-w-[220px] leading-relaxed">{subtitle}</p>}
    </div>
  );
}

function ToolbarBtn({
  icon: Icon, label, onClick, active = false, danger = false,
}: {
  icon: React.ElementType;
  label: string;
  onClick: (e: React.MouseEvent) => void;
  active?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium transition-colors cursor-pointer border ${
        danger
          ? 'text-red-600 border-red-200 bg-red-50 hover:bg-red-100'
          : active
          ? 'text-amber-600 border-amber-200 bg-amber-50'
          : 'text-slate-600 border-slate-200 bg-white hover:bg-slate-50'
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

function SetupStep({
  step, title, subtitle, color, children,
}: {
  step: number;
  title: string;
  subtitle: string;
  color: 'blue' | 'slate';
  children: React.ReactNode;
}) {
  const bg = color === 'blue' ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-200';
  const numBg = color === 'blue' ? 'bg-blue-600' : 'bg-slate-700';
  return (
    <div className={`p-4 rounded-xl border ${bg}`}>
      <div className="flex items-start gap-3">
        <span className={`h-6 w-6 rounded-full ${numBg} text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5`}>{step}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-900">{title}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">{subtitle}</p>
          {children}
        </div>
      </div>
    </div>
  );
}
