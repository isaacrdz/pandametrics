"use client";

import { CalendarIcon, CopyIcon, DownloadIcon, ExternalLinkIcon, QrCodeIcon, UserIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { toDataURL } from "qrcode";
import { CopyButton, useCopyToClipboard } from "@/components/dashboard/CopyButton";
import { FormSection } from "@/components/form/FormSection";
import { QrCode } from "@/components/surveys/form/QrCode";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { SurveyFormMeta } from "@/lib/surveys/form-values";

const QR_DOWNLOAD_WIDTH = 1024;

async function downloadQr(value: string, code: string) {
  const dataUrl = await toDataURL(value, { width: QR_DOWNLOAD_WIDTH, margin: 2, errorCorrectionLevel: "M" });
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = `panda-${code}.png`;
  link.click();
}

type SharePanelProps = Pick<SurveyFormMeta, "code" | "publicUrl" | "createdAt" | "createdBy">;

export function SharePanel({ code, publicUrl, createdAt, createdBy }: SharePanelProps) {
  const t = useTranslations("surveyForm.share");
  const format = useFormatter();
  const copy = useCopyToClipboard();

  return (
    <FormSection id="survey-share" number={4} title={t("title")} description={t("description")}>
      <div className="grid gap-6 @xl:grid-cols-[16rem_1fr] @xl:gap-8">
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-card-border bg-accent/40 p-5">
          <span className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <QrCodeIcon aria-hidden className="size-4" />
            {t("scanQr")}
          </span>
          <div className="rounded-2xl border bg-white p-3">
            <QrCode value={publicUrl} label={t("qrLabel", { code })} className="size-40" />
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => downloadQr(publicUrl, code).catch(() => undefined)}
            className="h-11 w-full gap-2 rounded-xl bg-card font-semibold text-primary hover:text-primary"
          >
            <DownloadIcon aria-hidden />
            {t("downloadQr")}
          </Button>
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          <div className="flex flex-col gap-2">
            <span id="share-link-label" className="text-sm font-semibold text-muted-foreground">
              {t("publicLink")}
            </span>
            <div className="flex items-center gap-2 rounded-xl border bg-muted/40 py-1 pr-1 pl-4">
              <output aria-labelledby="share-link-label" className="min-w-0 flex-1 truncate text-[0.95rem]">
                {publicUrl}
              </output>
              <CopyButton value={publicUrl} label={t("copyLinkLabel")} successMessage={t("linkCopied")} className="size-10" />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span id="share-code-label" className="text-sm font-semibold text-muted-foreground">
              {t("code")}
            </span>
            <div className="flex w-fit items-center gap-3 rounded-xl border bg-muted/40 py-1 pr-1 pl-4">
              <output aria-labelledby="share-code-label" className="font-mono text-lg font-semibold tracking-[0.2em]">
                {code}
              </output>
              <CopyButton value={code} label={t("copyCode")} successMessage={t("codeCopied")} className="size-10" />
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Tooltip>
              <TooltipTrigger asChild>
                {/* The kiosk route (/s) does not exist yet: disabled instead of opening a 404 */}
                <span className="inline-flex">
                  <Button type="button" variant="outline" disabled className="h-11 gap-2 rounded-xl">
                    <ExternalLinkIcon aria-hidden />
                    {t("openSurvey")}
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>{t("openSoon")}</TooltipContent>
            </Tooltip>
            <Button
              type="button"
              onClick={() => void copy(publicUrl, t("linkCopied"))}
              className="h-11 gap-2 rounded-xl font-semibold"
            >
              <CopyIcon aria-hidden />
              {t("copyLink")}
            </Button>
          </div>

          <Separator />

          <div className="flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:flex-wrap sm:gap-6">
            <span className="flex items-center gap-2">
              <CalendarIcon aria-hidden className="size-4" />
              {t("createdAt", { date: format.dateTime(createdAt, { dateStyle: "medium", timeStyle: "short" }) })}
            </span>
            <span className="flex min-w-0 items-center gap-2">
              <UserIcon aria-hidden className="size-4 shrink-0" />
              <span className="truncate">
                {createdBy?.name && createdBy.email
                  ? t("createdBy", { name: createdBy.name, email: createdBy.email })
                  : t("createdByUnknown")}
              </span>
            </span>
          </div>
        </div>
      </div>
    </FormSection>
  );
}
