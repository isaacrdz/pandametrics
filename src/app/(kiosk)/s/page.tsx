import { Suspense } from "react";
import { CodeEntry } from "@/components/kiosk/CodeEntry";
import { KioskFrame } from "@/components/kiosk/KioskFrame";
import { KioskLoading } from "@/components/kiosk/KioskLoading";
import { KioskMessage } from "@/components/kiosk/KioskMessage";
import { SurveyRunnerPlaceholder } from "@/components/kiosk/SurveyRunnerPlaceholder";
import { parseSurveyCode } from "@/lib/surveys/code";
import { getPublicSurvey } from "@/lib/surveys/public";

// searchParams is runtime data under Cache Components, so the screen is picked inside Suspense
async function KioskEntry({ searchParams }: Pick<PageProps<"/s">, "searchParams">) {
  const { code: rawCode } = await searchParams;
  const raw = (Array.isArray(rawCode) ? rawCode[0] : rawCode)?.trim() ?? "";

  if (!raw) {
    return (
      <KioskFrame>
        <CodeEntry />
      </KioskFrame>
    );
  }

  const code = parseSurveyCode(raw);
  if (!code) {
    return (
      <KioskFrame>
        {/* key: a new invalid value resets the form state */}
        <CodeEntry key={raw} invalidValue={raw} />
      </KioskFrame>
    );
  }

  const result = getPublicSurvey(code);
  if (result.status !== "ok") {
    return (
      <KioskFrame>
        <KioskMessage kind={result.status} code={code} />
      </KioskFrame>
    );
  }

  return <SurveyRunnerPlaceholder survey={result.survey} />;
}

export default function KioskPage({ searchParams }: PageProps<"/s">) {
  return (
    <Suspense fallback={<KioskLoading />}>
      <KioskEntry searchParams={searchParams} />
    </Suspense>
  );
}
