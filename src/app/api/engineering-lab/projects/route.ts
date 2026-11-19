import { NextRequest, NextResponse } from 'next/server';
import {
  CURATED_COMMUNITY_PROJECTS,
  CommunityProject,
} from '@/modules/engineering-lab/community/community-projects';
import { isFirebaseAdminConfigured } from '@/config/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

// In-memory fallback cache for instant reliability
const inMemoryCommunityProjects = new Map<string, CommunityProject>(
  CURATED_COMMUNITY_PROJECTS.map((p) => [p.id, p])
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('id');
    const category = searchParams.get('category');
    const search = searchParams.get('search')?.toLowerCase().trim();

    // 1. Single Project Lookup
    if (projectId) {
      // Check in-memory / curated cache first
      if (inMemoryCommunityProjects.has(projectId)) {
        return NextResponse.json({
          success: true,
          project: inMemoryCommunityProjects.get(projectId),
        });
      }

      // Check Firestore if configured
      if (isFirebaseAdminConfigured()) {
        try {
          const firestore = getFirestore();
          const docRef = firestore.collection('lab_community_projects').doc(projectId);
          const snap = await docRef.get();
          if (snap.exists) {
            const data = snap.data() as CommunityProject;
            return NextResponse.json({ success: true, project: data });
          }
        } catch (dbErr) {
          console.warn('[API] Firestore project read fallback:', dbErr);
        }
      }

      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }

    // 2. Project List Query
    let allProjects: CommunityProject[] = Array.from(inMemoryCommunityProjects.values());

    if (isFirebaseAdminConfigured()) {
      try {
        const firestore = getFirestore();
        const snap = await firestore
          .collection('lab_community_projects')
          .orderBy('createdAt', 'desc')
          .limit(50)
          .get();

        const dbProjects: CommunityProject[] = [];
        snap.forEach((doc) => {
          dbProjects.push({ id: doc.id, ...(doc.data() as Omit<CommunityProject, 'id'>) });
        });

        // Combine DB projects and curated templates, deduplicating by ID
        const existingIds = new Set(dbProjects.map((p) => p.id));
        allProjects = [
          ...dbProjects,
          ...Array.from(inMemoryCommunityProjects.values()).filter((p) => !existingIds.has(p.id)),
        ];
      } catch (dbErr) {
        console.warn('[API] Firestore projects list query fallback:', dbErr);
      }
    }

    // Filter by Category
    if (category && category !== 'all') {
      allProjects = allProjects.filter((p) => p.category === category);
    }

    // Filter by Search Term
    if (search) {
      allProjects = allProjects.filter(
        (p) =>
          p.title.toLowerCase().includes(search) ||
          p.description.toLowerCase().includes(search) ||
          p.author.toLowerCase().includes(search) ||
          p.tags.some((t) => t.toLowerCase().includes(search))
      );
    }

    return NextResponse.json({
      success: true,
      count: allProjects.length,
      projects: allProjects,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to retrieve community projects';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, author, category, tags, projectData } = body;

    if (!title || !projectData || !projectData.components || !projectData.wires) {
      return NextResponse.json(
        { success: false, error: 'Missing required project data (title, components, wires)' },
        { status: 400 }
      );
    }

    const uniqueId = `proj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const nowIso = new Date().toISOString();

    const newProject: CommunityProject = {
      id: uniqueId,
      title: String(title).slice(0, 100),
      description: String(description || 'Community electronics lab project created on EI House Lab.').slice(0, 500),
      author: String(author || 'Community Engineer').slice(0, 60),
      category: ['mcu', 'analog', 'sensors', 'power', 'audio'].includes(category)
        ? category
        : 'community',
      tags: Array.isArray(tags) ? tags.slice(0, 6).map((t) => String(t).trim()) : ['Community', 'VirtualLab'],
      likes: 1,
      views: 1,
      featured: false,
      createdAt: nowIso,
      updatedAt: nowIso,
      projectData: {
        ...projectData,
        id: uniqueId,
        title: String(title).slice(0, 100),
      },
    };

    // Store in-memory cache
    inMemoryCommunityProjects.set(uniqueId, newProject);

    // Save to Firestore if configured
    if (isFirebaseAdminConfigured()) {
      try {
        const firestore = getFirestore();
        await firestore.collection('lab_community_projects').doc(uniqueId).set(newProject);
      } catch (dbErr) {
        console.warn('[API] Firestore project write fallback:', dbErr);
      }
    }

    return NextResponse.json({
      success: true,
      projectId: uniqueId,
      project: newProject,
      shareUrl: `/engineering-lab?project=${uniqueId}`,
      message: 'Project published successfully to EI House Community Hub!',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to publish project';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
