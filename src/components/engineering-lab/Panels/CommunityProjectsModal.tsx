'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { EngineeringProject } from '@/modules/engineering-lab/types';
import {
  CURATED_COMMUNITY_PROJECTS,
  CommunityProject,
} from '@/modules/engineering-lab/community/community-projects';
import {
  Globe,
  Search,
  X,
  Play,
  Share2,
  User,
  Heart,
  Eye,
  PlusCircle,
  Radio,
  Check,
  Sparkles,
  Code2,
  Layers,
  GitFork,
  ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';

interface CommunityProjectsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadProject: (project: EngineeringProject) => void;
  onForkProject?: (project: EngineeringProject) => void;
  onOpenPublishModal?: () => void;
}

export function CommunityProjectsModal({
  isOpen,
  onClose,
  onLoadProject,
  onForkProject,
  onOpenPublishModal,
}: CommunityProjectsModalProps) {
  const [projects, setProjects] = useState<CommunityProject[]>(CURATED_COMMUNITY_PROJECTS);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeDetailProject, setActiveDetailProject] = useState<CommunityProject | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});

  // Fetch live community projects from backend API on open
  useEffect(() => {
    if (!isOpen) return;

    // Load any user published projects from local storage
    let localSaved: CommunityProject[] = [];
    try {
      const raw = localStorage.getItem('ei_lab_community_projects_custom');
      if (raw) localSaved = JSON.parse(raw);
    } catch {}

    // Fetch from backend API
    fetch('/api/engineering-lab/projects')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.success && Array.isArray(data.projects)) {
          const combined = [...localSaved, ...data.projects];
          const unique = Array.from(new Map(combined.map((p) => [p.id, p])).values());
          setProjects(unique);
        }
      })
      .catch((err) => {
        console.warn('Using curated community project cache:', err);
        if (localSaved.length > 0) {
          const combined = [...localSaved, ...CURATED_COMMUNITY_PROJECTS];
          const unique = Array.from(new Map(combined.map((p) => [p.id, p])).values());
          setProjects(unique);
        }
      });
  }, [isOpen]);

  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      const matchCat = selectedCategory === 'all' || p.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        p.title.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.author.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q));
      return matchCat && matchSearch;
    });
  }, [projects, selectedCategory, searchQuery]);

  const handleShareLink = (p: CommunityProject, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/engineering-lab?project=${p.id}`;
    navigator.clipboard.writeText(url);
    setCopiedId(p.id);
    toast.success(`Shareable link copied: ${url}`);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleToggleLike = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setLikedMap((prev) => {
      const next = !prev[id];
      toast.success(next ? 'Added to your favorites!' : 'Removed from favorites');
      return { ...prev, [id]: next };
    });
  };

  const handleForkProject = (p: CommunityProject) => {
    const forked: EngineeringProject = {
      ...p.projectData,
      id: `proj_fork_${Date.now()}`,
      title: `${p.title} (Fork)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    if (onForkProject) {
      onForkProject(forked);
    } else {
      onLoadProject(forked);
    }
    onClose();
    toast.success(`Forked "${p.title}" to your workspace.`);
  };

  const handleOpenSimulate = (p: CommunityProject) => {
    onLoadProject(p.projectData);
    onClose();
    toast.success(`Launched "${p.title}" in EI House Virtual Lab.`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-5 select-none animate-in fade-in duration-150">
      <div className="bg-[#080E1A] border border-slate-700/80 rounded-2xl w-full max-w-6xl h-[90vh] flex flex-col shadow-2xl overflow-hidden font-mono text-xs">
        {/* Top Header */}
        <div className="p-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-950/40">
              <Globe className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                  <span>EI House Community Projects</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 flex items-center gap-1">
                    <Radio className="w-2.5 h-2.5 animate-pulse text-cyan-400" />
                    Featured Simulation Showcase
                  </span>
                </h2>
              </div>
              <p className="text-[11px] text-slate-400">
                Explore, simulate in 3D, fork, and share verified electronics and MCU projects built by engineers worldwide
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenPublishModal && (
              <button
                onClick={() => {
                  onClose();
                  onOpenPublishModal();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all shadow-md cursor-pointer text-xs"
                title="Publish your active circuit to the EI House Community Web"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>+ Publish My Project</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Close modal [Esc]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search & Category Filter Toolbar */}
        <div className="p-3 bg-slate-950/80 border-b border-slate-800/80 flex flex-col sm:flex-row gap-2.5 items-center justify-between">
          {/* Search Input */}
          <div className="relative w-full sm:w-80">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search NE555, Arduino, ESP32, Sonar, PWM..."
              className="w-full bg-slate-900 border border-slate-700/80 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
            />
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap gap-1.5 text-[11px] w-full sm:w-auto">
            {[
              { id: 'all', label: 'All Projects' },
              { id: 'mcu', label: 'Arduino & MCUs' },
              { id: 'analog', label: 'Analog & 555' },
              { id: 'sensors', label: 'Sensors & Robotics' },
              { id: 'power', label: 'Power Regulators' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedCategory(tab.id)}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  selectedCategory === tab.id
                    ? 'bg-cyan-600 text-white font-bold shadow-md shadow-cyan-900/30'
                    : 'bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Main View: Clean 3-Column Responsive Visual Card Grid */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 bg-gradient-to-b from-[#060B14] to-[#0A1220]">
          {filteredProjects.length === 0 ? (
            <div className="py-20 text-center text-slate-500 space-y-3">
              <Search className="w-10 h-10 mx-auto text-slate-600" />
              <p className="text-sm font-semibold text-slate-400">No community projects matched your search.</p>
              <button
                onClick={() => {
                  setSelectedCategory('all');
                  setSearchQuery('');
                }}
                className="px-4 py-1.5 rounded-lg bg-slate-800 text-cyan-400 text-xs hover:bg-slate-700 cursor-pointer"
              >
                Reset Search Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {filteredProjects.map((p) => {
                const compCount = p.projectData.components.length;
                const wireCount = p.projectData.wires.length;
                const hasCode = Boolean(p.projectData.firmware?.code?.trim());
                const isLiked = Boolean(likedMap[p.id]);

                return (
                  <div
                    key={p.id}
                    className="group bg-slate-900/70 hover:bg-slate-900 border border-slate-800 hover:border-cyan-500/70 rounded-xl overflow-hidden flex flex-col justify-between transition-all duration-200 hover:shadow-2xl hover:shadow-cyan-950/40 hover:-translate-y-0.5"
                  >
                    {/* Visual Circuit Blueprint Thumbnail */}
                    <div
                      onClick={() => setActiveDetailProject(p)}
                      className="relative h-40 bg-gradient-to-br from-slate-950 via-[#0B1528] to-[#08182B] p-3.5 flex flex-col justify-between cursor-pointer border-b border-slate-800 overflow-hidden"
                    >
                      {/* Circuit Blueprint Grid Lines Background */}
                      <div className="absolute inset-0 opacity-15 pointer-events-none bg-[radial-gradient(#38BDF8_1px,transparent_1px)] [background-size:16px_16px]" />

                      {/* Header Badges */}
                      <div className="relative z-10 flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded bg-slate-950/90 border border-slate-700/80 text-[10px] font-bold text-cyan-400 uppercase tracking-wider">
                          {p.category}
                        </span>

                        <div className="flex items-center gap-1.5">
                          {p.featured && (
                            <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold flex items-center gap-1">
                              <Sparkles className="w-3 h-3 text-amber-400" /> Verified
                            </span>
                          )}
                          <button
                            onClick={(e) => handleToggleLike(p.id, e)}
                            className="p-1 rounded bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-rose-400 transition-colors"
                            title="Favorite project"
                          >
                            <Heart className={`w-3.5 h-3.5 ${isLiked ? 'text-rose-500 fill-rose-500' : ''}`} />
                          </button>
                        </div>
                      </div>

                      {/* Schematic / Code Representation Centerpiece */}
                      <div className="relative z-10 my-auto flex items-center justify-center">
                        <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-2.5 w-full max-w-[90%] shadow-lg">
                          <div className="flex items-center justify-between text-[10px] text-slate-400 pb-1.5 border-b border-slate-800">
                            <span className="flex items-center gap-1 text-cyan-300 font-semibold">
                              {hasCode ? <Code2 className="w-3 h-3 text-cyan-400" /> : <Layers className="w-3 h-3 text-emerald-400" />}
                              <span>{hasCode ? 'C++ Firmware & Circuit' : 'Pure Analog Schematic'}</span>
                            </span>
                            <span className="text-slate-500 font-mono">{compCount} parts · {wireCount} wires</span>
                          </div>
                          <div className="pt-1.5 flex items-center justify-between text-[11px] font-mono text-slate-300">
                            <span className="truncate max-w-[180px]">
                              {p.projectData.components.slice(0, 3).map((c) => c.label || c.type).join(', ')}...
                            </span>
                            <span className="text-emerald-400 font-bold shrink-0">3D Ready</span>
                          </div>
                        </div>
                      </div>

                      {/* Views & Likes Footer */}
                      <div className="relative z-10 flex items-center justify-between text-[10px] text-slate-400 pt-1">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-500" /> {p.author}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1">
                            <Eye className="w-3 h-3 text-slate-500" /> {p.views}
                          </span>
                          <span className="flex items-center gap-1">
                            <Heart className="w-3 h-3 text-rose-500" /> {p.likes + (isLiked ? 1 : 0)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                      <div>
                        <h3
                          onClick={() => setActiveDetailProject(p)}
                          className="font-bold text-white text-sm hover:text-cyan-400 transition-colors line-clamp-1 cursor-pointer"
                        >
                          {p.title}
                        </h3>
                        <p className="text-slate-400 text-[11px] line-clamp-2 mt-1 leading-relaxed">
                          {p.description}
                        </p>
                      </div>

                      {/* Tags */}
                      <div className="flex flex-wrap gap-1">
                        {p.tags.slice(0, 3).map((t) => (
                          <span
                            key={t}
                            className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-[10px] text-slate-400"
                          >
                            #{t}
                          </span>
                        ))}
                      </div>

                      {/* Action Buttons */}
                      <div className="pt-2 border-t border-slate-800/80 flex items-center gap-2">
                        {/* 1-Click Open & Simulate Button */}
                        <button
                          onClick={() => handleOpenSimulate(p)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer active:scale-98"
                          title="Open this circuit directly in Virtual Lab"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Open & Simulate</span>
                        </button>

                        {/* Details / Share */}
                        <button
                          onClick={() => setActiveDetailProject(p)}
                          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                          title="View schematic details and netlist"
                        >
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={(e) => handleShareLink(p, e)}
                          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-cyan-400 transition-colors cursor-pointer"
                          title="Copy share link"
                        >
                          {copiedId === p.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Project Detailed Inspection Modal / Dialog */}
        {activeDetailProject && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-60 flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="bg-[#0B1528] border border-cyan-500/60 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden font-mono text-xs">
              {/* Detail Header */}
              <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-700/60 uppercase font-bold text-[10px]">
                    {activeDetailProject.category}
                  </span>
                  <h3 className="font-bold text-white text-sm truncate max-w-md">
                    {activeDetailProject.title}
                  </h3>
                </div>
                <button
                  onClick={() => setActiveDetailProject(null)}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Detail Content */}
              <div className="p-5 overflow-y-auto space-y-4">
                <p className="text-slate-300 text-xs leading-relaxed">
                  {activeDetailProject.description}
                </p>

                {/* Metadata Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px]">
                  <div>
                    <span className="text-slate-500 block text-[10px]">AUTHOR</span>
                    <span className="text-slate-200 font-bold">{activeDetailProject.author}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">COMPONENTS</span>
                    <span className="text-cyan-400 font-bold">{activeDetailProject.projectData.components.length} parts</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">WIRES</span>
                    <span className="text-emerald-400 font-bold">{activeDetailProject.projectData.wires.length} nets</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">VIEWS / LIKES</span>
                    <span className="text-amber-400 font-bold">👁 {activeDetailProject.views} · ♥ {activeDetailProject.likes}</span>
                  </div>
                </div>

                {/* Circuit Parts Preview */}
                <div>
                  <h4 className="text-slate-400 font-bold text-[11px] mb-2 uppercase">Bill of Materials</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {activeDetailProject.projectData.components.map((c) => (
                      <span
                        key={c.id}
                        className="px-2 py-1 rounded bg-slate-900 border border-slate-800 text-slate-300 text-[11px] flex items-center gap-1"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                        <span>{c.label || c.id}</span>
                        <span className="text-slate-500">({c.value || c.type})</span>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Firmware Code Snippet if present */}
                {activeDetailProject.projectData.firmware?.code && (
                  <div>
                    <h4 className="text-slate-400 font-bold text-[11px] mb-2 uppercase flex items-center gap-1.5">
                      <Code2 className="w-3.5 h-3.5 text-cyan-400" /> Embedded Firmware
                    </h4>
                    <pre className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-emerald-400 text-[11px] font-mono max-h-36 overflow-y-auto leading-relaxed">
                      {activeDetailProject.projectData.firmware.code}
                    </pre>
                  </div>
                )}
              </div>

              {/* Detail Footer Actions */}
              <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between gap-3">
                <button
                  onClick={() => handleShareLink(activeDetailProject)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Share</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      handleForkProject(activeDetailProject);
                      setActiveDetailProject(null);
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-xs"
                  >
                    <GitFork className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Fork Project</span>
                  </button>

                  <button
                    onClick={() => {
                      handleOpenSimulate(activeDetailProject);
                      setActiveDetailProject(null);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-bold text-xs shadow-lg cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Open & Simulate Now</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
