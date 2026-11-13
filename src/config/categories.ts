import type { Category } from '@/types';

export const INITIAL_CATEGORIES: Category[] = [
  {
    id: 'electronics-components',
    name: 'Electronics Components',
    slug: 'electronics-components',
    description:
      'Passive and active component fundamentals, datasheet breakdowns, selection guides, and reliability notes.',
    order: 1,
  },
  {
    id: 'semiconductor-technology',
    name: 'Semiconductor Technology',
    slug: 'semiconductor-technology',
    description:
      'Silicon fabrication, process nodes, wide-bandgap devices (SiC/GaN), packaging, and fab ecosystems.',
    order: 2,
  },
  {
    id: 'artificial-intelligence',
    name: 'Artificial Intelligence',
    slug: 'artificial-intelligence',
    description:
      'Edge AI, neural accelerators, foundation models, inference optimization, and applied machine learning.',
    order: 3,
  },
  {
    id: 'electronics-industry',
    name: 'Electronics Industry',
    slug: 'electronics-industry',
    description:
      'Supply chain analysis, Indian and global ESDM manufacturing policy, EMS trends, and standards.',
    order: 4,
  },
  {
    id: 'robotics-automation',
    name: 'Robotics & Automation',
    slug: 'robotics-automation',
    description:
      'Mechatronics, motion control, ROS 2 architectures, industrial PLCs, and autonomous systems.',
    order: 5,
  },
  {
    id: 'internet-of-things',
    name: 'Internet of Things (IoT)',
    slug: 'internet-of-things',
    description:
      'LPWAN, Matter, MQTT, industrial telemetry, low-power wireless protocols, and fleet security.',
    order: 6,
  },
  {
    id: 'electrical-engineering',
    name: 'Electrical Engineering',
    slug: 'electrical-engineering',
    description:
      'Power electronics, magnetics, motor drives, EMC/EMI compliance, and grid-scale systems.',
    order: 7,
  },
  {
    id: 'embedded-systems',
    name: 'Embedded Systems',
    slug: 'embedded-systems',
    description:
      'Bare-metal firmware, RTOS scheduling, board bring-up, device drivers, and hardware debugging.',
    order: 8,
  },
  {
    id: 'technology-innovation',
    name: 'Technology & Innovation',
    slug: 'technology-innovation',
    description:
      'Deep-tech research, quantum hardware, photonics, energy storage, and engineering breakthroughs.',
    order: 9,
  },
  {
    id: 'tutorials-projects',
    name: 'Tutorials & Projects',
    slug: 'tutorials-projects',
    description:
      'Step-by-step schematics, PCB layout walkthroughs, firmware repositories, and bench test guides.',
    order: 10,
  },
];
