import * as z from "zod";
import {
  OPTION_LIMITS,
  REACTION_VALUES,
  SURVEY_CATEGORIES,
  TEXT_LIMITS,
} from "@/lib/surveys/constants";

// Shared by react-hook-form (client) and the Server Actions.
// Error messages are keys under "validation" in src/messages, translated on the client.
//
// The form keeps one question / option shape for every category (easier to bind with
// react-hook-form than a discriminated union of field arrays); the per-category rules
// live in checkCategoryRules below.

const objectId = z.string().regex(/^[0-9a-f]{24}$/);

function requiredText(max: number) {
  return z.string().trim().min(1, { error: "required" }).max(max, { error: "tooLong" });
}

const optionSchema = z.object({
  id: objectId.optional(),
  value: z.string(),
  label: z.string().trim(),
  color: z.string().regex(/^#[0-9a-f]{6}$/i, { error: "invalidColor" }),
});

const questionSchema = z.object({
  id: objectId.optional(),
  text: requiredText(TEXT_LIMITS.question),
  options: z.array(optionSchema),
});

type Issue = { path: (string | number)[]; message: string };

function checkOptions(
  options: z.output<typeof optionSchema>[],
  questionIndex: number,
  category: "SATISFACTION" | "POLL",
): Issue[] {
  const issues: Issue[] = [];
  const base = ["questions", questionIndex, "options"];
  const { min, max } = OPTION_LIMITS[category];
  const labelMax = category === "SATISFACTION" ? TEXT_LIMITS.reactionLabel : TEXT_LIMITS.pollLabel;

  if (options.length < min) issues.push({ path: base, message: "minOptions" });
  if (options.length > max) issues.push({ path: base, message: "maxOptions" });

  const seen = new Set<string>();
  options.forEach((option, index) => {
    if (!option.label) issues.push({ path: [...base, index, "label"], message: "required" });
    else if (option.label.length > labelMax) issues.push({ path: [...base, index, "label"], message: "tooLong" });

    if (category !== "SATISFACTION") return;
    if (!REACTION_VALUES.includes(option.value as (typeof REACTION_VALUES)[number])) {
      issues.push({ path: [...base, index, "value"], message: "invalidReaction" });
    } else if (seen.has(option.value)) {
      issues.push({ path: [...base, index, "value"], message: "duplicateReaction" });
    }
    seen.add(option.value);
  });

  return issues;
}

export const surveyFormSchema = z
  .object({
    name: requiredText(TEXT_LIMITS.name),
    description: z.string().trim().max(TEXT_LIMITS.description, { error: "tooLong" }),
    isActive: z.boolean(),
    category: z.enum(SURVEY_CATEGORIES, { error: "categoryRequired" }),
    questions: z.array(questionSchema).min(1, { error: "minQuestions" }),
  })
  .check((ctx) => {
    const { category, questions } = ctx.value;
    // Rating options are generated; an invalid category is already reported by z.enum
    if (category !== "SATISFACTION" && category !== "POLL") return;
    if (!Array.isArray(questions)) return;

    questions.forEach((question, index) => {
      if (!Array.isArray(question?.options)) return;
      for (const issue of checkOptions(question.options, index, category)) {
        ctx.issues.push({ code: "custom", input: ctx.value, ...issue });
      }
    });
  });

// What the form edits (category is "" until one is picked)
export type SurveyFormInput = Omit<z.input<typeof surveyFormSchema>, "category"> & {
  category: z.input<typeof surveyFormSchema>["category"] | "";
};

// What the Server Actions receive after validation
export type SurveyFormValues = z.output<typeof surveyFormSchema>;

export type QuestionFormValue = SurveyFormInput["questions"][number];

export type OptionFormValue = QuestionFormValue["options"][number];
