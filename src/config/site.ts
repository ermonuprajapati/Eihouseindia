import type { ComponentCategorySpec } from '@/types';

export const SITE_CONFIG = {
  name: 'EIHOUSE INDIA',
  shortName: 'EihouseIndia',
  domain: 'eihouseindia.in',
  url: process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'https://eihouseindia.in',
  tagline: 'Electronics. Engineering. AI. Innovation.',
  description:
    'A global electronics and technology knowledge-sharing platform for engineers, students, developers, researchers, and industry professionals.',
  locale: 'en-IN',
  contactEmail: process.env.CONTACT_EMAIL || 'info@eihouseindia.in',
  bootstrapAdminEmail: process.env.BOOTSTRAP_ADMIN_EMAIL || 'er.monuprajapati.2024@gmail.com',
} as const;

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
