// Demo data for the database seed (prisma/seed.ts): organizations, users, surveys and responses
// with fixed ids and seeded random counts. Plain module: no server-only, so tsx can load it outside
// Next. Every builder takes `now`, the moment the seed runs, so response dates stay recent.

import type {
  AnswerType,
  Organization,
  Question,
  ReactionValue,
  ResponseItem,
  ResponseSource,
  Survey,
  SurveyCategory,
  SurveyResponse,
  User,
} from "@/types/survey";

export const REACTION_OPTIONS: {
  value: ReactionValue;
  label: string;
  color: string;
}[] = [
  { value: "VERY_BAD", label: "Muy malo", color: "#ef4444" },
  { value: "BAD", label: "Malo", color: "#f97316" },
  { value: "GOOD", label: "Bueno", color: "#eab308" },
  { value: "VERY_GOOD", label: "Muy bueno", color: "#84cc16" },
  { value: "INCREDIBLE", label: "Excelente", color: "#22c55e" },
];

export const RATING_COLORS = { filled: "#f59e0b", empty: "#d1d5db" };

export const POLL_FALLBACK_COLORS = [
  "#7c4dff",
  "#00acc1",
  "#8d6e63",
  "#546e7a",
  "#ec407a",
];

export const DAY_MS = 24 * 60 * 60 * 1000;

export const ID_KIND = {
  organization: 1,
  user: 2,
  survey: 3,
  question: 4,
  option: 5,
  response: 6,
} as const;

// 24 hex characters: 4 for the kind, 20 for the number. Stable across seed runs
export function objectId(kind: number, n: number): string {
  return kind.toString(16).padStart(4, "0") + n.toString(16).padStart(20, "0");
}

export function daysAgo(now: Date, days: number): Date {
  return new Date(now.getTime() - days * DAY_MS);
}

// mulberry32: small seeded PRNG so the data is the same on every build
export function createRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(items: T[], random: () => number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// ---------------------------------------------------------------------------
// Organizations and users
// ---------------------------------------------------------------------------

export const ACME_ID = objectId(ID_KIND.organization, 1);
export const JORDAN_ID = objectId(ID_KIND.user, 1);
export const ANA_ID = objectId(ID_KIND.user, 2);

export function buildOrganizations(now: Date): Organization[] {
  return [
    {
      id: ACME_ID,
      name: "Acme Inc.",
      activeSurveyCount: 4,
      createdAt: daysAgo(now, 180),
      updatedAt: daysAgo(now, 2),
    },
    {
      id: objectId(ID_KIND.organization, 2),
      name: "Panda Labs",
      activeSurveyCount: 0,
      createdAt: daysAgo(now, 40),
      updatedAt: daysAgo(now, 40),
    },
  ];
}

interface UserSeed {
  fields: Pick<User, "name" | "email" | "role"> & Partial<Pick<User, "phone" | "image" | "isActive">>;
  createdDaysAgo: number;
  updatedDaysAgo: number;
}

// Acme's team with every state the user list has to show
const USER_SEEDS: UserSeed[] = [
  { fields: { name: "Jordan Davis", email: "jordan@acme.co", role: "OWNER", phone: "+525512345678" }, createdDaysAgo: 180, updatedDaysAgo: 1 },
  { fields: { name: "Ana López", email: "ana@acme.co", role: "ADMIN" }, createdDaysAgo: 120, updatedDaysAgo: 10 },
  { fields: { name: "Sofía Ramírez", email: "sofia@acme.co", role: "ADMIN", phone: "+525598765432", image: "/avatars/sofia.svg" }, createdDaysAgo: 90, updatedDaysAgo: 0 },
  { fields: { name: "Marco Silva", email: "marco@acme.co", role: "MEMBER", image: "/avatars/missing.jpg" }, createdDaysAgo: 75, updatedDaysAgo: 3 },
  { fields: { name: "Lucía Fernández", email: "lucia@acme.co", role: "MEMBER", phone: "+523312344321" }, createdDaysAgo: 60, updatedDaysAgo: 6 },
  { fields: { name: "Diego Herrera", email: "diego@acme.co", role: "MEMBER", isActive: false }, createdDaysAgo: 50, updatedDaysAgo: 20 },
  { fields: { name: "Emily Chen", email: "emily@acme.co", role: "MEMBER", phone: "+14155550134" }, createdDaysAgo: 30, updatedDaysAgo: 2 },
  { fields: { name: "Tomás Ortega", email: "tomas@acme.co", role: "MEMBER", isActive: false }, createdDaysAgo: 20, updatedDaysAgo: 15 },
];

export function buildUsers(now: Date): User[] {
  return USER_SEEDS.map(({ fields, createdDaysAgo, updatedDaysAgo }, i) => ({
    id: objectId(ID_KIND.user, i + 1),
    image: null,
    phone: null,
    isActive: true,
    organizationId: ACME_ID,
    deletedAt: null,
    createdAt: daysAgo(now, createdDaysAgo),
    updatedAt: daysAgo(now, updatedDaysAgo),
    ...fields,
  }));
}

// ---------------------------------------------------------------------------
// Survey seeds: options carry the number of answers they receive
// ---------------------------------------------------------------------------

interface OptionSeed {
  type: AnswerType;
  value: string;
  label: string;
  color: string;
  count: number;
}

interface QuestionSeed {
  text: string;
  options: OptionSeed[];
}

export interface SurveySeed {
  code: string;
  name: string;
  description: string;
  category: SurveyCategory;
  isActive: boolean;
  createdById: string;
  createdDaysAgo: number;
  // Responses are spread between these days ago (newest, oldest)
  responseWindow: [number, number];
  questions: QuestionSeed[];
}

function reaction(counts: number[]): OptionSeed[] {
  return REACTION_OPTIONS.map((option, i) => ({
    type: "REACTION",
    ...option,
    count: counts[i],
  }));
}

function rating(counts: number[]): OptionSeed[] {
  return counts.map((count, i) => ({
    type: "RATING",
    value: String(i + 1),
    label: i === 0 ? "1 estrella" : `${i + 1} estrellas`,
    color: RATING_COLORS.filled,
    count,
  }));
}

function poll(options: [label: string, count: number][]): OptionSeed[] {
  return options.map(([label, count], i) => ({
    type: "TEXT",
    value: label,
    label,
    color: POLL_FALLBACK_COLORS[i],
    count,
  }));
}

export const SURVEY_SEEDS: SurveySeed[] = [
  {
    code: "STORE7",
    name: "In-store experience",
    description: "Capture how customers feel after visiting your store.",
    category: "SATISFACTION",
    isActive: true,
    createdById: JORDAN_ID,
    createdDaysAgo: 90,
    responseWindow: [0, 29],
    questions: [
      {
        text: "¿Cómo fue tu experiencia en la tienda?",
        options: reaction([64, 118, 296, 602, 762]),
      },
      {
        text: "¿Qué tan fácil fue encontrar lo que buscabas?",
        options: reaction([92, 154, 388, 571, 637]),
      },
    ],
  },
  {
    code: "EVENT2",
    name: "Event check-in",
    description: "A quick pulse check for guests at your next event.",
    category: "SATISFACTION",
    isActive: true,
    createdById: JORDAN_ID,
    createdDaysAgo: 21,
    responseWindow: [0, 20],
    questions: [
      {
        text: "¿Cómo calificarías el registro al evento?",
        options: reaction([21, 43, 132, 270, 322]),
      },
      {
        text: "¿Qué tan probable es que vuelvas a nuestro próximo evento?",
        options: reaction([35, 58, 171, 244, 280]),
      },
    ],
  },
  {
    code: "PROD91",
    name: "Product feedback",
    description: "Learn what customers think about your newest launch.",
    category: "RATING",
    isActive: true,
    createdById: JORDAN_ID,
    createdDaysAgo: 45,
    responseWindow: [0, 29],
    questions: [
      {
        text: "¿Cómo calificarías nuestro nuevo producto?",
        options: rating([12, 18, 46, 108, 164]),
      },
      {
        text: "¿Qué tan fácil fue empezar a usarlo?",
        options: rating([9, 22, 61, 121, 135]),
      },
    ],
  },
  {
    code: "HELP44",
    name: "Support follow-up",
    description: "Measure satisfaction after a support conversation.",
    category: "POLL",
    isActive: true,
    createdById: ANA_ID,
    createdDaysAgo: 60,
    responseWindow: [0, 29],
    questions: [
      {
        text: "¿Qué podríamos mejorar de tu experiencia?",
        options: poll([
          ["La navegación", 34],
          ["Más opciones de personalización", 26],
          ["La velocidad de respuesta", 18],
          ["El diseño", 6],
        ]),
      },
      {
        text: "¿Por qué canal nos contactaste?",
        options: poll([
          ["Chat", 41],
          ["Correo", 27],
          ["Teléfono", 16],
        ]),
      },
    ],
  },
  {
    code: "5XS1NK",
    name: "Pruebas con QR",
    description: "Prueba de QR",
    category: "SATISFACTION",
    isActive: false,
    createdById: ANA_ID,
    createdDaysAgo: 75,
    responseWindow: [40, 70],
    questions: [
      {
        text: "¿Cómo calificas la experiencia de usar las encuestas?",
        options: reaction([0, 0, 0, 3, 6]),
      },
      {
        text: "¿Qué tan rápido pudiste escanear el QR?",
        options: reaction([0, 1, 2, 3, 3]),
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Builders
// ---------------------------------------------------------------------------

export function buildSurvey(seed: SurveySeed, surveyNumber: number, now: Date): Survey {
  const createdAt = daysAgo(now, seed.createdDaysAgo);
  const questions: Question[] = seed.questions.map((question, qi) => ({
    id: objectId(ID_KIND.question, surveyNumber * 10 + qi),
    text: question.text,
    archivedAt: null,
    options: question.options.map((option, oi) => ({
      id: objectId(ID_KIND.option, surveyNumber * 100 + qi * 10 + oi),
      type: option.type,
      value: option.value,
      label: option.label,
      color: option.color,
      archivedAt: null,
    })),
  }));

  return {
    id: objectId(ID_KIND.survey, surveyNumber),
    organizationId: ACME_ID,
    createdById: seed.createdById,
    code: seed.code,
    name: seed.name,
    description: seed.description,
    category: seed.category,
    isActive: seed.isActive,
    questions,
    deletedAt: null,
    createdAt,
    updatedAt: createdAt,
  };
}

// One shuffled column of answers per question; every response answers every question
export function buildAnswerColumns(seed: SurveySeed, survey: Survey, random: () => number) {
  const total = seed.questions[0].options.reduce((sum, o) => sum + o.count, 0);

  const columns = seed.questions.map((question, qi) => {
    const items: ResponseItem[] = question.options.flatMap((option, oi) => {
      const stored = survey.questions[qi].options[oi];
      const item: ResponseItem = {
        questionId: survey.questions[qi].id,
        answerOptionId: stored.id,
        answerType: stored.type,
        answerValue: stored.value,
        answerLabel: stored.label,
      };
      return Array.from({ length: option.count }, () => item);
    });

    if (items.length !== total) {
      throw new Error(`Seed survey ${seed.code}: question ${qi + 1} has ${items.length} answers, expected ${total}`);
    }
    return shuffle(items, random);
  });

  return { total, columns };
}

const SOURCES: ResponseSource[] = ["KIOSK", "KIOSK", "QR", "LINK"];

export function buildResponses(seed: SurveySeed, survey: Survey, surveyNumber: number, now: Date): SurveyResponse[] {
  const random = createRandom(surveyNumber * 7919);
  const { total, columns } = buildAnswerColumns(seed, survey, random);
  const [newest, oldest] = seed.responseWindow;

  return Array.from({ length: total }, (_, i) => {
    const source = SOURCES[Math.floor(random() * SOURCES.length)];
    return {
      id: objectId(ID_KIND.response, surveyNumber * 100_000 + i),
      surveyId: survey.id,
      organizationId: survey.organizationId,
      items: columns.map((column) => column[i]),
      source,
      deviceId: source === "KIOSK" ? `kiosk-${surveyNumber}-${Math.floor(random() * 3) + 1}` : null,
      locale: random() < 0.85 ? "es" : "en",
      durationMs: Math.round(6_000 + random() * 34_000),
      createdAt: daysAgo(now, newest + random() * (oldest - newest)),
    };
  });
}

export function buildSurveys(now: Date): Survey[] {
  return SURVEY_SEEDS.map((seed, i) => buildSurvey(seed, i + 1, now));
}

// Newest first, as the response store expects
export function buildAllResponses(surveys: Survey[], now: Date): SurveyResponse[] {
  return SURVEY_SEEDS.flatMap((seed, i) => buildResponses(seed, surveys[i], i + 1, now)).sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  );
}
