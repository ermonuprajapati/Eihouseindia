'use client';

import React, { useState } from 'react';
import { EngineeringProject } from '@/modules/engineering-lab/types';
import {
  Share2,
  X,
  Copy,
  Check,
  Globe,
  Code2,
  Sparkles,
  UploadCloud,
} from 'lucide-react';
import { toast } from 'sonner';

interface ShareProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: EngineeringProject;
  onProjectSavedToCloud?: (updatedProject: EngineeringProject) => void;
}

export function ShareProjectModal({
  isOpen,
  onClose,
  project,
  onProjectSavedToCloud,
}: ShareProjectModalProps) {
  const [activeTab, setActiveTab] = useState<'share' | 'publish' | 'embed'>('share');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState(false);

  // Publish Form State
  const [publishTitle, setPublishTitle] = useState(project.title);
  const [publishAuthor, setPublishAuthor] = useState('Community Engineer');
  const [publishCategory, setPublishCategory] = useState<'mcu' | 'analog' | 'sensors' | 'power'>('mcu');
  const [publishDescription, setPublishDescription] = useState(
    project.description || 'Interactive electronics lab simulation built on EI House Virtual Lab.'
  );
  const [publishTags, setPublishTags] = useState('VirtualLab, 3DBreadboard, CircuitSim');
  const [isPublishing, setIsPublishing] = useState(false);

  if (!isOpen) return null;

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://eihouseindia.in';
  const shareUrl = `${origin}/engineering-lab?project=${project.id}`;
  const embedCode = `<iframe src="${origin}/engineering-lab?project=${project.id}&embed=true" width="100%" height="650" frameborder="0" style="border: 1px solid #1E293B; border-radius: 12px;"></iframe>`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    toast.success('Project link copied to clipboard!');
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleCopyEmbed = () => {
    navigator.clipboard.writeText(embedCode);
    setCopiedEmbed(true);
    toast.success('Embed iframe snippet copied to clipboard!');
    setTimeout(() => setCopiedEmbed(false), 2500);
  };

  const handlePublishToCommunity = async () => {
    setIsPublishing(true);
    try {
      const tagsArray = publishTags
        .split(',')
        .map((t) => t.trim().replace(/^#/, ''))
        .filter(Boolean);

      const payload = {
        title: publishTitle,
        description: publishDescription,
        author: publishAuthor,
        category: publishCategory,
        tags: tagsArray.length > 0 ? tagsArray : ['Community', 'CircuitSim'],
        projectData: {
          ...project,
          title: publishTitle,
          description: publishDescription,
        },
      };

      const res = await fetch('/api/engineering-lab/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data && data.success) {
        // Also save to local community custom list
        try {
          const raw = localStorage.getItem('ei_lab_community_projects_custom');
          const existing = raw ? JSON.parse(raw) : [];
          existing.unshift(data.project);
          localStorage.setItem('ei_lab_community_projects_custom', JSON.stringify(existing.slice(0, 50)));
        } catch {}

        if (onProjectSavedToCloud) {
          onProjectSavedToCloud(data.project.projectData);
        }

        toast.success('🎉 Published to Community Web! Other users can now discover and run your circuit!');
        setActiveTab('share');
      } else {
        toast.error(data?.error || 'Failed to publish project to community.');
      }
    } catch {
      toast.error('Network error publishing project.');
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 select-none animate-in fade-in duration-150">
      <div className="bg-[#0B1528] border border-slate-700/80 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden font-mono text-xs flex flex-col">
        {/* Modal Header */}
        <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight">Share &amp; Publish Project</h2>
              <p className="text-[11px] text-slate-400">Collaborate, share links or publish to the Community Hub</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-800 bg-slate-950/50 p-1">
          <button
            onClick={() => setActiveTab('share')}
            className={`flex-1 py-2 text-center font-bold text-xs rounded-lg transition-all cursor-pointer ${
              activeTab === 'share'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            Share Link
          </button>
          <button
            onClick={() => setActiveTab('publish')}
            className={`flex-1 py-2 text-center font-bold text-xs rounded-lg transition-all cursor-pointer ${
              activeTab === 'publish'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            Publish to Community Web
          </button>
          <button
            onClick={() => setActiveTab('embed')}
            className={`flex-1 py-2 text-center font-bold text-xs rounded-lg transition-all cursor-pointer ${
              activeTab === 'embed'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            Embed Snippet
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          {/* TAB 1: SHARE LINK */}
          {activeTab === 'share' && (
            <div className="space-y-4">
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                  Direct Shareable Link
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={shareUrl}
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-cyan-300 font-mono select-all focus:outline-none"
                  />
                  <button
                    onClick={handleCopyLink}
                    className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md transition-all"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-200" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copy Link</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Social Share Buttons */}
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-2">
                  Quick Share to Social / Messengers
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <a
                    href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                      `Check out this electronics circuit simulation on EI House Lab: ${shareUrl}`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2.5 rounded-lg bg-emerald-950/60 border border-emerald-800/80 hover:bg-emerald-900/60 text-emerald-300 flex items-center justify-center gap-2 font-semibold text-[11px] transition-colors"
                  >
                    <span>WhatsApp</span>
                  </a>

                  <a
                    href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
                      `Interactive circuit simulation on @eihouseindia: ${shareUrl}`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2.5 rounded-lg bg-sky-950/60 border border-sky-800/80 hover:bg-sky-900/60 text-sky-300 flex items-center justify-center gap-2 font-semibold text-[11px] transition-colors"
                  >
                    <span>Twitter / X</span>
                  </a>

                  <a
                    href={`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(
                      project.title
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2.5 rounded-lg bg-blue-950/60 border border-blue-800/80 hover:bg-blue-900/60 text-blue-300 flex items-center justify-center gap-2 font-semibold text-[11px] transition-colors"
                  >
                    <span>Telegram</span>
                  </a>
                </div>
              </div>

              {/* Community Showcase Callout */}
              <div className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-950/40 to-slate-900 border border-emerald-800/50 flex items-center justify-between">
                <div>
                  <div className="font-bold text-white text-xs flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Publish to Community Showcase</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Allow engineering students and makers across the world to find your circuit.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('publish')}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors shrink-0"
                >
                  Publish Now
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: PUBLISH TO COMMUNITY WEB */}
          {activeTab === 'publish' && (
            <div className="space-y-3.5">
              <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-800/40 text-[11px] text-emerald-300 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  Your project will be listed on the public Community Projects Hub for others to study, simulate, and fork!
                </span>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                  Project Title
                </label>
                <input
                  type="text"
                  value={publishTitle}
                  onChange={(e) => setPublishTitle(e.target.value)}
                  placeholder="e.g. Arduino Traffic Light Sequencer"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                    Author / Creator Name
                  </label>
                  <input
                    type="text"
                    value={publishAuthor}
                    onChange={(e) => setPublishAuthor(e.target.value)}
                    placeholder="Your name or handle"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                    Category
                  </label>
                  <select
                    value={publishCategory}
                    onChange={(e) => setPublishCategory(e.target.value as typeof publishCategory)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-emerald-500 focus:outline-none cursor-pointer"
                  >
                    <option value="mcu">Arduino &amp; Microcontrollers</option>
                    <option value="analog">Analog &amp; 555 Timers</option>
                    <option value="sensors">Sensors &amp; Robotics</option>
                    <option value="power">Power Regulators</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={publishDescription}
                  onChange={(e) => setPublishDescription(e.target.value)}
                  placeholder="Briefly explain what your circuit does and how to test it..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:border-emerald-500 focus:outline-none resize-none"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={publishTags}
                  onChange={(e) => setPublishTags(e.target.value)}
                  placeholder="Arduino, LED, 3DBreadboard, PWM"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <button
                disabled={isPublishing}
                onClick={handlePublishToCommunity}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 cursor-pointer transition-all"
              >
                {isPublishing ? (
                  <span>Publishing to Cloud...</span>
                ) : (
                  <>
                    <UploadCloud className="w-4 h-4" />
                    <span>Publish Project to Public Hub</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* TAB 3: EMBED SNIPPET */}
          {activeTab === 'embed' && (
            <div className="space-y-3">
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                  HTML Iframe Code (for Blogs, Docs &amp; Reports)
                </label>
                <textarea
                  readOnly
                  rows={3}
                  value={embedCode}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-[11px] text-purple-300 font-mono select-all focus:outline-none resize-none"
                />
              </div>

              <button
                onClick={handleCopyEmbed}
                className="w-full py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
              >
                {copiedEmbed ? (
                  <>
                    <Check className="w-4 h-4 text-purple-200" />
                    <span>Copied Embed Code!</span>
                  </>
                ) : (
                  <>
                    <Code2 className="w-4 h-4" />
                    <span>Copy Embed Code</span>
                  </>
                )}
              </button>

              <div className="text-[10px] text-slate-500 leading-relaxed">
                💡 Paste this iframe into your HTML page, Notion doc, or portfolio to allow readers to simulate your circuit interactively right on your page!
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
