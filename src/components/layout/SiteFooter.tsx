import Link from 'next/link';
import { SITE_CONFIG } from '@/config/site';
import { INITIAL_CATEGORIES } from '@/config/categories';

export function SiteFooter() {
  const primaryCategories = INITIAL_CATEGORIES.slice(0, 6);

  return (
    <footer className="border-t border-slate-200 bg-[#0B1528] text-slate-300">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-4">
          <div className="md:col-span-1 space-y-3">
            <Link href="/" className="font-display text-xl font-bold tracking-tight text-white">
              {SITE_CONFIG.name}
            </Link>
            <p className="text-sm font-medium text-slate-200">{SITE_CONFIG.tagline}</p>
            <p className="text-sm leading-relaxed text-slate-400">
              {SITE_CONFIG.description}
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white mb-4">Editorial Desks</h3>
            <ul className="space-y-2.5 text-sm">
              {primaryCategories.map((cat) => (
                <li key={cat.id}>
                  <Link
                    href={`/category/${cat.slug}`}
                    className="text-slate-400 hover:text-white transition-colors"
                  >
                    {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white mb-4">Platform</h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/articles" className="text-slate-400 hover:text-white transition-colors">
                  All Articles
                </Link>
              </li>
              <li>
                <Link href="/search" className="text-slate-400 hover:text-white transition-colors">
                  Search Archive
                </Link>
              </li>
              <li>
                <Link href="/dashboard/editor" className="text-slate-400 hover:text-white transition-colors">
                  Submit an Article
                </Link>
              </li>
              <li>
                <Link href="/components" className="text-slate-400 hover:text-white transition-colors">
                  Component Directory (Roadmap)
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white mb-4">Publication Standards</h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/about" className="text-slate-400 hover:text-white transition-colors">
                  About EIHOUSE INDIA
                </Link>
              </li>
              <li>
                <Link href="/community-guidelines" className="text-slate-400 hover:text-white transition-colors">
                  Community Guidelines
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-slate-400 hover:text-white transition-colors">
                  Contact Editorial Desk
                </Link>
              </li>
              <li>
                <Link href="/privacy-policy" className="text-slate-400 hover:text-white transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-slate-400 hover:text-white transition-colors">
                  Terms & Conditions
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-slate-800 pt-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-slate-400">
          <p>© {new Date().getFullYear()} {SITE_CONFIG.name} ({SITE_CONFIG.domain}). All rights reserved.</p>
          <p>Published for engineers, researchers, and builders worldwide.</p>
        </div>
      </div>
    </footer>
  );
}
