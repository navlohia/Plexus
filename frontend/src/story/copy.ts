/**
 * copy.ts (LANDING_SPEC v4 section 10)
 * Typed object for explicit line arrays and verbatim copy.
 */

export interface StoryBeatCopy {
  id: 'hero' | 'clock' | 'fracture' | 'swarm' | 'rescue' | 'dive';
  headline: string;
  headlineLines: string[];
  subhead?: string;
  buttonText?: string;
  // Progress ranges: [in, holdStart, holdEnd, out]
  range: [number, number, number, number];
}

export const STORY_BEATS: Record<'hero' | 'clock' | 'fracture' | 'swarm' | 'rescue' | 'dive', StoryBeatCopy> = {
  hero: {
    id: 'hero',
    headline: 'A platelet lives 120 hours.',
    headlineLines: ['A platelet lives', '120 hours.'],
    subhead: 'Scroll to watch one.',
    range: [0.00, 0.00, 0.11, 0.13],
  },
  clock: {
    id: 'clock',
    headline: 'Every hour, it gets harder to use.',
    headlineLines: ['Every hour, it gets', 'harder to use.'],
    // subhead omitted (counter only)
    range: [0.13, 0.15, 0.27, 0.29],
  },
  fracture: {
    id: 'fracture',
    headline: '25 hospitals. One clock.',
    headlineLines: ['25 hospitals.', 'One clock.'],
    subhead: "One blood bank's surplus is another's shortage.",
    range: [0.29, 0.31, 0.34, 0.36],
  },
  swarm: {
    id: 'swarm',
    headline: "The blood exists. It's in the wrong building.",
    headlineLines: ['The blood exists.', "It's in the", 'wrong building.'],
    subhead: 'Each hospital sees only its own shelf.',
    range: [0.36, 0.38, 0.51, 0.53],
  },
  rescue: {
    id: 'rescue',
    headline: 'Plexus moves it before it expires.',
    headlineLines: ['Plexus moves it', 'before it expires.'],
    subhead: 'Lateral transshipment across Delhi-NCR, rebalanced every 6 hours.',
    range: [0.53, 0.56, 0.76, 0.78],
  },
  dive: {
    id: 'dive',
    headline: 'The mesh, live.',
    headlineLines: ['The mesh, live.'],
    buttonText: 'Open the map →',
    range: [0.78, 0.82, 1.00, 1.00],
  },
};
