import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ShoppingBag,
  ArrowRight,
  ShieldCheck,
  Truck,
  CheckCircle2,
} from 'lucide-react';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { Button } from '@/components/ui/button';
import { SITE_CONFIG } from '@/config/site';

export const metadata: Metadata = {
  title: 'Hardware Store & Components — EI House India',
  description:
    'Shop authentic engineering development boards, IoT kits, sensors, robotics modules, 3D printing filaments, and electronic components for engineers and students.',
  alternates: { canonical: `${SITE_CONFIG.url}/products` },
};

export default function ProductsPage() {
  const categories = [
    'All Hardware',
    'EI House Original Boards',
    'Development Boards',
    'Sensors & Modules',
    'Robotics & STEM Kits',
    '3D Printing & Filament',
    'Electronic Components',
  ];

  const products = [
    {
      id: 'eihouse-esp32-s3-pro',
      name: 'EI House ESP32-S3 Pro IoT Development Board',
      category: 'EI House Original Boards',
      badge: 'Bestseller',
      price: '₹899',
      mrp: '₹1,299',
      features: ['Dual Core 240MHz Xtensa', 'Built-in 0.96" OLED', 'USB-C Native Debug', 'LiPo Battery Management'],
      inStock: true,
    },
    {
      id: 'eihouse-stm32-starter-kit',
      name: 'STM32 ARM Cortex-M4 Practical Learning Kit',
      category: 'Robotics & STEM Kits',
      badge: 'Course Kit',
      price: '₹2,499',
      mrp: '₹3,200',
      features: ['STM32F401 BlackPill Board', 'ST-Link V2 Debugger', '16x2 I2C LCD + Sensors', 'Breadboard & Jumper Wire Set'],
      inStock: true,
    },
    {
      id: 'eihouse-petg-cf-filament',
      name: 'High-Strength Carbon Fiber PETG 3D Filament (1kg)',
      category: '3D Printing & Filament',
      badge: 'Engineering Grade',
      price: '₹1,699',
      mrp: '₹2,199',
      features: ['1.75mm Precision Diameter', '20% Chopped Carbon Fiber', 'Extreme Stiffness & Heat Resistance', 'Ideal for Robot Brackets'],
      inStock: true,
    },
    {
      id: 'eihouse-smart-rover-chassis',
      name: 'Autonomous 4WD Mecanum Wheel Robotic Platform',
      category: 'Robotics & STEM Kits',
      badge: 'Popular',
      price: '₹3,299',
      mrp: '₹4,500',
      features: ['Aluminum Alloy Chassis', '4x Metal Gear Motors with Encoders', 'Omnidirectional Mecanum Wheels', 'Li-Ion 18650 Battery Pack Holder'],
      inStock: true,
    },
    {
      id: 'bme680-environmental-sensor',
      name: 'Bosch BME680 Environmental Sensor Module (I2C/SPI)',
      category: 'Sensors & Modules',
      badge: 'Verified Silicon',
      price: '₹549',
      mrp: '₹799',
      features: ['Temperature, Humidity, Pressure & Gas', 'Ultra-low power operation', 'Pre-soldered headers', 'Compatible with 3.3V and 5V'],
      inStock: true,
    },
    {
      id: 'lora-sx1262-node',
      name: 'EI House SX1262 868MHz / 915MHz LoRa Telemetry Node',
      category: 'EI House Original Boards',
      badge: 'Long Range',
      price: '₹1,149',
      mrp: '₹1,599',
      features: ['Up to 15km line-of-sight range', '+22dBm transmit power', 'SMA antenna connector included', 'Low standby current (1.2µA)'],
      inStock: true,
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFBFD]">
      <SiteHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="border-b border-slate-200 bg-white py-14 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl space-y-5">
              <span className="text-xs font-bold uppercase tracking-wider text-[#F59E0B]">
                EI House Hardware & Components Store
              </span>
              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#0B1528] tracking-tight leading-[1.1]">
                Quality Silicon, Tested Tools & Prototyping Hardware.
              </h1>
              <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
                Hand-picked and verified engineering supplies. From our original development boards to certified sensors,
                motor drivers, and 3D printing consumables—ready to build your next breakthrough.
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                <Button asChild size="lg" className="bg-[#172D4D] hover:bg-[#0B1528] text-white">
                  <a href="#products-catalog">
                    <span>Browse Hardware Catalog</span>
                    <ArrowRight className="h-4 w-4 ml-1.5" />
                  </a>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href="/contact?subject=Bulk%20Component%20Procurement">Bulk & College Lab Orders</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits bar */}
        <section className="py-6 border-b border-slate-200 bg-slate-50">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs text-slate-700">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-[#F59E0B]" />
                <span><strong>100% Bench Tested Silicon:</strong> Every board pre-flashed & verified.</span>
              </div>
              <div className="flex items-center gap-3">
                <Truck className="h-5 w-5 text-[#172D4D]" />
                <span><strong>Fast Dispatch Across India:</strong> Dispatched from our central lab.</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-[#F59E0B]" />
                <span><strong>Documentation & Schematics Included:</strong> Code samples & pinouts.</span>
              </div>
            </div>
          </div>
        </section>

        {/* Catalog */}
        <section id="products-catalog" className="py-16 sm:py-20 border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-10">
            {/* Category tabs */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
              {categories.map((c, i) => (
                <button
                  key={i}
                  type="button"
                  className={`text-xs font-semibold px-4 py-2 rounded-full border whitespace-nowrap transition-colors ${
                    i === 0
                      ? 'bg-[#172D4D] text-white border-[#172D4D]'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>

            {/* Products grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {products.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50/40 p-6 flex flex-col justify-between space-y-6 hover:shadow-lg transition-all"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold text-[#F59E0B] uppercase tracking-wider">
                        {item.category}
                      </span>
                      <span className="text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded">
                        {item.badge}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <h3 className="font-display text-lg font-bold text-[#0B1528] leading-snug">
                        {item.name}
                      </h3>
                      <div className="flex items-baseline gap-2 pt-1">
                        <span className="text-xl font-extrabold text-[#0B1528]">{item.price}</span>
                        <span className="text-xs text-slate-400 line-through">{item.mrp}</span>
                        <span className="text-[11px] font-semibold text-emerald-600">Inclusive of Taxes</span>
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-3 border-t border-slate-200">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Key Specifications:</p>
                      <ul className="space-y-1 text-xs text-slate-600">
                        {item.features.map((f, idx) => (
                          <li key={idx} className="flex items-center gap-2">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#172D4D]" />
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-3">
                    <span className="text-xs font-medium text-emerald-700 flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      In Stock
                    </span>
                    <Button asChild size="sm" className="bg-[#172D4D] hover:bg-[#0B1528] text-white">
                      <Link href={`/contact?subject=Order%20Inquiry%20for%20${encodeURIComponent(item.name)}`}>
                        <ShoppingBag className="h-3.5 w-3.5 mr-1.5" />
                        <span>Order Inquiry</span>
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Bulk Ordering & College Kits */}
        <section className="py-16 bg-[#172D4D] text-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-8 space-y-3">
                <span className="text-xs font-mono uppercase tracking-widest text-[#F59E0B]">
                  For Academic Institutions, Labs & Startups
                </span>
                <h3 className="font-display text-2xl sm:text-3xl font-bold">
                  Custom Batch Hardware & Component Bundles
                </h3>
                <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl">
                  Equipping an entire electronics, IoT, or robotics batch? We provide institutional volume pricing,
                  custom branded kits, pre-installed firmware, and tax-compliant GST invoicing.
                </p>
              </div>
              <div className="lg:col-span-4 flex flex-col gap-3">
                <Button asChild size="lg" className="bg-[#F59E0B] hover:bg-[#D97706] text-[#0B1528] font-bold">
                  <Link href="/contact?subject=Institutional%20Bulk%20Order%20Quote">
                    <span>Request Institutional Quote</span>
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="text-white border-slate-700 hover:bg-slate-800">
                  <Link href="/partnerships">Learn About College Labs</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
