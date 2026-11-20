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
  Copy,
  Share2,
  Cpu,
  User,
  Heart,
  Eye,
  PlusCircle,
  Tag,
  Clock,
  Radio,
  Flame,
  Check,
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
  const [selectedProject, setSelectedProject] = useState<CommunityProject>(CURATED_COMMUNITY_PROJECTS[0]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

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
          if (unique.length > 0) {
            setSelectedProject((curr) => curr || unique[0]);
          }
        }
      })
      .catch((err) => {
        console.warn('Could not fetch community projects from API, using curated cache:', err);
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
    const url = `${window.location.origin}/engineering-lab?project=${p.id}`;
    navigator.clipboard.writeText(url);
    setCopiedId(p.id);
    toast.success(`Shareable link copied: ${url}`);
    setTimeout(() => setCopiedId(null), 2500);
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
    toast.success(`Forked "${p.title}" as an editable custom project.`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-5 select-none animate-in fade-in duration-150">
      <div className="bg-[#0B1528] border border-slate-700/80 rounded-2xl w-full max-w-5xl h-[88vh] flex flex-col shadow-2xl overflow-hidden font-mono text-xs">
        {/* Header */}
        <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500/30 to-cyan-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-md">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                  <span>Community Projects Hub</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <Radio className="w-2.5 h-2.5 animate-pulse text-emerald-400" />
                    EI House Verified Projects
                  </span>
                </h2>
              </div>
              <p className="text-[11px] text-slate-400">
                Explore, simulate, fork and share public projects built by electrical engineers & makers worldwide
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
                title="Publish your current active schematic to the Community Web"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Publish My Project</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search & Category Filter Bar */}
        <div className="p-3 bg-slate-950/70 border-b border-slate-800/80 flex flex-col sm:flex-row gap-2.5 items-center justify-between">
          {/* Search Input */}
          <div className="relative w-full sm:w-80">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Arduino, 555, Sonar, LDR, Power..."
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
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  selectedCategory === tab.id
                    ? 'bg-cyan-600 text-white font-bold shadow-md'
                    : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Main Content: Left List + Right Interactive Preview */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Projects Card Grid / List */}
          <div className="w-full md:w-[48%] border-r border-slate-800 p-3 space-y-2.5 overflow-y-auto bg-slate-950/30">
            {filteredProjects.map((p) => {
              const isSelected = selectedProject?.id === p.id;
              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedProject(p)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer group flex flex-col justify-between ${
                    isSelected
                      ? 'bg-slate-900/90 border-cyan-500 text-white shadow-xl shadow-cyan-950/30 ring-1 ring-cyan-500/40'
                      : 'bg-slate-900/50 border-slate-800/80 text-slate-300 hover:bg-slate-900 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between text-[10px] mb-1.5">
                      <span className="flex items-center gap-1.5 text-cyan-400 font-bold uppercase">
                        {p.featured && (
                          <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-0.5">
                            <Flame className="w-2.5 h-2.5 text-amber-400" /> Featured
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300">
                          {p.category.toUpperCase()}
                        </span>
                      </span>

                      <div className="flex items-center gap-2 text-slate-400 text-[10px]">
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3 text-slate-500" /> {p.views}
                        </span>
                        <span className="flex items-center gap-1">
                          <Heart className="w-3 h-3 text-rose-500" /> {p.likes}
                        </span>
                      </div>
                    </div>

                    <h3 className="font-bold text-xs text-white group-hover:text-cyan-300 leading-snug">
                      {p.title}
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {p.description}
                    </p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3 text-cyan-400" />
                      <span className="font-semibold text-slate-300">{p.author}</span>
                    </span>
                    <span className="flex items-center gap-2">
                      <span>{p.projectData.components.length} parts</span>
                      <span>•</span>
                      <span>{p.projectData.wires.length} wires</span>
                    </span>
                  </div>
                </div>
              );
            })}

            {filteredProjects.length === 0 && (
              <div className="py-12 text-center text-slate-500 space-y-2">
                <Search className="w-8 h-8 mx-auto text-slate-600" />
                <p>No community projects matched your filter.</p>
                <button
                  onClick={() => {
                    setSelectedCategory('all');
                    setSearchQuery('');
                  }}
                  className="px-3 py-1 rounded bg-slate-800 text-cyan-400 text-xs hover:bg-slate-700"
                >
                  Reset Filters
                </button>
              </div>
            )}
          </div>

          {/* Right Selected Project Details & Simulator Launcher */}
          {selectedProject && (
            <div className="flex-1 p-5 overflow-y-auto bg-slate-950/60 flex flex-col justify-between space-y-4">
              <div className="space-y-4">
                {/* Title & Category Badge */}
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-700/60 uppercase">
                      {selectedProject.category}
                    </span>
                    {selectedProject.featured && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-700/60">
                        ⭐ Verified Working Project
                      </span>
                    )}
                  </div>
                  <h1 className="text-base font-bold text-white tracking-tight leading-snug">
                    {selectedProject.title}
                  </h1>
                  <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1 text-slate-300">
                      <User className="w-3.5 h-3.5 text-cyan-400" />
                      Created by <span className="font-bold text-white">{selectedProject.author}</span>
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(selectedProject.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Description */}
                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-300 leading-relaxed text-[11px]">
                  {selectedProject.description}
                </div>

                {/* Tags */}
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400 mb-1.5 flex items-center gap-1">
                    <Tag className="w-3 h-3 text-cyan-400" /> Tags
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedProject.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-cyan-300 text-[10px]"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Hardware BOM & Netlist Overview */}
                <div className="space-y-2">
                  <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center justify-between">
                    <span>Circuit Bill of Materials</span>
                    <span className="text-slate-500 font-normal">
                      {selectedProject.projectData.components.length} Components • {selectedProject.projectData.wires.length} Connections
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto pr-1">
                    {selectedProject.projectData.components.map((c) => (
                      <div
                        key={c.id}
                        className="p-2 rounded-lg bg-slate-900/70 border border-slate-800 text-[10px] flex items-center justify-between"
                      >
                        <span className="font-bold text-slate-200">{c.label}</span>
                        <span className="text-cyan-400 font-mono">{c.value || c.type}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Embedded Firmware Preview (if MCU circuit) */}
                {selectedProject.projectData.firmware?.code && (
                  <div className="space-y-1.5">
                    <div className="text-[10px] uppercase font-bold text-purple-400 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Cpu className="w-3.5 h-3.5" /> Embedded C++ Firmware
                      </span>
                      <span className="text-slate-500 font-normal">
                        Target: {selectedProject.projectData.firmware.targetMcu || 'ATmega328P'}
                      </span>
                    </div>
                    <pre className="p-3 rounded-xl bg-slate-950 border border-purple-900/40 text-[10px] text-purple-200 font-mono max-h-32 overflow-y-auto leading-relaxed">
                      {selectedProject.projectData.firmware.code}
                    </pre>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row items-center gap-2">
                <button
                  onClick={() => {
                    onLoadProject(selectedProject.projectData);
                    onClose();
                    toast.success(`Loaded "${selectedProject.title}" into Virtual Lab!`);
                  }}
                  className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 cursor-pointer transition-all"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Open & Simulate Live</span>
                </button>

                <button
                  onClick={() => handleForkProject(selectedProject)}
                  className="w-full sm:w-auto py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                  title="Make a custom copy to edit without affecting original"
                >
                  <Copy className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Fork / Copy</span>
                </button>

                <button
                  onClick={(e) => handleShareLink(selectedProject, e)}
                  className="w-full sm:w-auto py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                  title="Copy permanent share link to clipboard"
                >
                  {copiedId === selectedProject.id ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Share</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
