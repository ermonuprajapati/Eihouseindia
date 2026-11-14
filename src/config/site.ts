import type { ComponentCategorySpec } from '@/types';

export const SITE_CONFIG = {
  name: 'Engineering Innovation House',
  shortName: 'EI House',
  brandName: 'EI HOUSE INDIA',
  domain: 'eihouseindia.in',
  url: process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'https://eihouseindia.in',
  tagline: 'Where Ideas Become Things.',
  subtitle: 'Learn · Build · Innovate · Explore · Connect · Grow',
  description:
    'Engineering education, practical projects, innovative products, technical services and a collaborative technology community. Where Ideas Become Things.',
  locale: 'en-IN',
  contactEmail: process.env.CONTACT_EMAIL || 'info@eihouseindia.in',
  bootstrapAdminEmail: process.env.BOOTSTRAP_ADMIN_EMAIL || 'er.monuprajapati.2024@gmail.com',
  entity: {
    legalType: 'MSME / Udyam Registered Proprietorship',
    country: 'India',
    focus: 'Engineering Education, Hardware R&D, IoT, Robotics & Technical Publishing',
  },
} as const;

export const EI_PILLARS = [
  {
    key: 'learn',
    name: 'LEARN',
    title: 'Engineering & STEM Education',
    description: 'Structured courses, hands-on training, workshops and industrial skill development.',
    icon: 'GraduationCap',
    href: '/learn',
    badge: 'Education',
  },
  {
    key: 'build',
    name: 'BUILD',
    title: 'Projects & Prototyping',
    description: 'Practical hardware projects, DIY schematics, academic reports and research.',
    icon: 'Wrench',
    href: '/projects',
    badge: 'Hardware',
  },
  {
    key: 'innovate',
    name: 'INNOVATE',
    title: 'Products & R&D Services',
    description: 'Original engineering products, PCB design, 3D printing and turnkey prototyping.',
    icon: 'Lightbulb',
    href: '/services',
    badge: 'Engineering',
  },
  {
    key: 'explore',
    name: 'EXPLORE',
    title: 'Library & Technology Updates',
    description: 'Technical articles, datasheets, circuit references, guides and industry news.',
    icon: 'BookOpen',
    href: '/articles',
    badge: 'Knowledge',
  },
  {
    key: 'connect',
    name: 'CONNECT',
    title: 'Community & Knowledge Sharing',
    description: 'Collaborative network of students, engineers, researchers and innovators.',
    icon: 'Users',
    href: '/community',
    badge: 'Network',
  },
  {
    key: 'grow',
    name: 'GROW',
    title: 'Franchise & Institutional Labs',
    description: 'College innovation centers, robotics labs, STEM franchises and partnerships.',
    icon: 'Building2',
    href: '/partnerships',
    badge: 'Partnership',
  },
] as const;

export const FUTURE_COMPONENT_CATEGORIES: ComponentCategorySpec[] = [
  {
    slug: 'resistors',
    name: 'Resistors',
    summary: 'Thick-film, thin-film, metal foil, current-sense, and high-voltage precision resistors.',
    plannedFields: ['Resistance', 'Tolerance', 'Power Rating', 'TCR', 'Package'],
  },
  {
    slug: 'capacitors',
    name: 'Capacitors',
    summary: 'MLCC ceramic, aluminum electrolytic, tantalum, film, and supercapacitors.',
    plannedFields: ['Capacitance', 'Rated Voltage', 'Dielectric', 'ESR', 'Package'],
  },
  {
    slug: 'diodes',
    name: 'Diodes',
    summary: 'Schottky, Zener, TVS protection, fast-recovery, and SiC rectifier diodes.',
    plannedFields: ['Reverse Voltage', 'Forward Current', 'Vf', 'Recovery Time', 'Package'],
  },
  {
    slug: 'transistors',
    name: 'Transistors',
    summary: 'Small-signal and power BJTs, Darlington arrays, and RF bipolar transistors.',
    plannedFields: ['Polarity', 'Vceo', 'Ic Max', 'hFE', 'Package'],
  },
  {
    slug: 'mosfets',
    name: 'MOSFETs',
    summary: 'Logic-level, trench power, SiC, and GaN enhancement-mode field-effect transistors.',
    plannedFields: ['Vds', 'Rds(on)', 'Id Continuous', 'Qg', 'Package'],
  },
  {
    slug: 'integrated-circuits',
    name: 'Integrated Circuits',
    summary: 'Op-amps, voltage regulators, ADC/DAC converters, logic gates, and power management ICs.',
    plannedFields: ['Function', 'Supply Voltage', 'Channels', 'Interface', 'Package'],
  },
  {
    slug: 'microcontrollers',
    name: 'Microcontrollers',
    summary: 'ARM Cortex-M, RISC-V, AVR, PIC, and wireless SoC microcontroller families.',
    plannedFields: ['Architecture', 'Clock Max', 'Flash / SRAM', 'Peripherals', 'Package'],
  },
  {
    slug: 'sensors',
    name: 'Sensors',
    summary: 'MEMS IMUs, environmental, optical, Hall-effect, current, and LiDAR modules.',
    plannedFields: ['Measurand', 'Output Interface', 'Supply Voltage', 'Accuracy', 'Package'],
  },
  {
    slug: 'connectors',
    name: 'Connectors',
    summary: 'Board-to-board, FFC/FPC, RF coaxial, industrial terminal blocks, and USB-C receptacles.',
    plannedFields: ['Pitch', 'Contacts', 'Current Rating', 'Mounting', 'Orientation'],
  },
  {
    slug: 'development-boards',
    name: 'Development Boards',
    summary: 'Evaluation kits, FPGA carrier boards, embedded Linux SBCs, and reference designs.',
    plannedFields: ['Target Silicon', 'Interfaces', 'Power Input', 'Debug Probe', 'Form Factor'],
  },
];
