import Link from 'next/link';
import Image from 'next/image';
import { SITE_CONFIG } from '@/config/site';
import { INITIAL_CATEGORIES } from '@/config/categories';

export function SiteFooter() {
  const primaryCategories = INITIAL_CATEGORIES.slice(0, 6);

  return (
    <footer className="border-t border-slate-200 bg-[#0B1528] text-slate-300">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2 space-y-4">
            <Link href="/" prefetch={false} className="font-display text-xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <Image
                src="/images/logo.png"
                alt="EI HOUSE Logo"
                width={36}
                height={36}
                sizes="36px"
                className="h-9 w-9 object-contain rounded bg-white p-0.5"
              />
              <div className="flex flex-col">
                <span className="leading-tight text-white font-extrabold text-lg">EI HOUSE</span>
                <span className="text-[10px] tracking-wider font-semibold text-[#F59E0B] uppercase">
                  Engineering Innovation House
                </span>
              </div>
            </Link>
            <p className="text-sm font-semibold text-[#F59E0B] tracking-wide">{SITE_CONFIG.tagline}</p>
            <p className="text-xs text-slate-400 font-mono">{SITE_CONFIG.subtitle}</p>
            <p className="text-sm leading-relaxed text-slate-400 max-w-md">
              {SITE_CONFIG.description}
            </p>
            <div className="pt-2 text-xs text-slate-400 space-y-1.5 border-t border-slate-800">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-full overflow-hidden border border-amber-400/60 shrink-0 bg-slate-850">
                  <Image
                    src="/images/founder/monu-prajapati-square.jpg"
                    alt="Er. Monu Prajapati"
                    width={24}
                    height={24}
                    sizes="24px"
                    className="h-full w-full object-cover object-top"
                  />
                </div>
                <p className="text-slate-300 font-medium">
                  Founder &amp; Proprietor:{' '}
                  <Link href="/about#founder" prefetch={false} className="text-[#F59E0B] hover:underline font-semibold py-1 inline-block">
                    {SITE_CONFIG.founder.fullNameWithPrefix}
                  </Link>
                </p>
              </div>
              <p className="text-slate-400">{SITE_CONFIG.entity.legalType} · {SITE_CONFIG.entity.country}</p>
              <p>Email: <a href={`mailto:${SITE_CONFIG.contactEmail}`} className="text-slate-300 hover:text-white underline py-1 inline-block">{SITE_CONFIG.contactEmail}</a></p>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white mb-4 tracking-wider uppercase">Ecosystem</h3>
            <ul className="space-y-1.5 text-sm">
              <li>
                <Link href="/learn" prefetch={false} className="inline-block py-1 text-slate-400 hover:text-white transition-colors">
                  Learn & Training
                </Link>
              </li>
              <li>
                <Link href="/projects" prefetch={false} className="inline-block py-1 text-slate-400 hover:text-white transition-colors">
                  Projects & Prototypes
                </Link>
              </li>
              <li>
                <Link href="/products" prefetch={false} className="inline-block py-1 text-slate-400 hover:text-white transition-colors">
                  Store & Hardware
                </Link>
              </li>
              <li>
                <Link href="/tools" prefetch={false} className="inline-block py-1 text-slate-400 hover:text-white transition-colors">
                  Engineering Tools & Calculators
                </Link>
              </li>
              <li>
                <Link href="/library" prefetch={false} className="inline-block py-1 text-slate-400 hover:text-white transition-colors">
                  Engineering Library & Specs
                </Link>
              </li>
              <li>
                <Link href="/services" prefetch={false} className="inline-block py-1 text-slate-400 hover:text-white transition-colors">
                  R&D & Engineering Services
                </Link>
              </li>
              <li>
                <Link href="/community" prefetch={false} className="inline-block py-1 text-slate-400 hover:text-white transition-colors">
                  Community & Network
                </Link>
              </li>
              <li>
                <Link href="/partnerships" prefetch={false} className="inline-block py-1 text-slate-400 hover:text-white transition-colors">
                  College Innovation Labs
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white mb-4 tracking-wider uppercase">Knowledge</h3>
            <ul className="space-y-1.5 text-sm">
              <li>
                <Link href="/articles" prefetch={false} className="inline-block py-1 text-slate-400 hover:text-white transition-colors">
                  Technical Blog
                </Link>
              </li>
              {primaryCategories.map((cat) => (
                <li key={cat.id}>
                  <Link
                    href={`/category/${cat.slug}`}
                    prefetch={false}
                    className="inline-block py-1 text-slate-400 hover:text-white transition-colors"
                  >
                    {cat.name}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/search" prefetch={false} className="inline-block py-1 text-slate-400 hover:text-white transition-colors">
                  Universal Search
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white mb-4 tracking-wider uppercase">Company</h3>
            <ul className="space-y-1.5 text-sm">
              <li>
                <Link href="/about" prefetch={false} className="inline-block py-1 text-slate-400 hover:text-white transition-colors">
                  About EI House
                </Link>
              </li>
              <li>
                <Link href="/about#founder" prefetch={false} className="inline-block py-1 text-slate-400 hover:text-white transition-colors">
                  Founder &amp; Leadership
                </Link>
              </li>
              <li>
                <Link href="/contact" prefetch={false} className="inline-block py-1 text-slate-400 hover:text-white transition-colors">
                  Contact &amp; Inquiries
                </Link>
              </li>
              <li>
                <Link href="/dashboard/editor" prefetch={false} className="inline-block py-1 text-slate-400 hover:text-white transition-colors">
                  Write for EI House
                </Link>
              </li>
              <li>
                <Link href="/community-guidelines" prefetch={false} className="inline-block py-1 text-slate-400 hover:text-white transition-colors">
                  Community Standards
                </Link>
              </li>
              <li>
                <Link href="/privacy-policy" prefetch={false} className="inline-block py-1 text-slate-400 hover:text-white transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" prefetch={false} className="inline-block py-1 text-slate-400 hover:text-white transition-colors">
                  Terms &amp; Conditions
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-slate-800 pt-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-slate-400">
          <p>© {new Date().getFullYear()} {SITE_CONFIG.name} · {SITE_CONFIG.tagline} All rights reserved.</p>
          <p>Founded by {SITE_CONFIG.founder.fullNameWithPrefix} · MSME / Udyam Registered Indian Platform.</p>
        </div>
      </div>
    </footer>
  );
}
