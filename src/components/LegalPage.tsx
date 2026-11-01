import Link from "next/link";
import { ArrowLeft } from "lucide-react";

/**
 * Frame for the static legal pages (/terms, /privacy): a back link on the
 * sky, then one white rounded card with a font-jua title, the effective
 * date and readable body text. Scrolls with the page.
 */
export default function LegalPage({
  title,
  effectiveDate,
  children,
}: {
  title: string;
  /** Shown as "시행일: …". */
  effectiveDate: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-[100dvh] px-4 pb-32 pt-4">
      <div className="mx-auto w-full max-w-2xl">
        <Link
          href="/"
          className="mb-3 inline-flex items-center gap-1 rounded-full border-4 border-gray-800 bg-white px-3 py-1 font-jua text-blue-900 shadow-[4px_4px_0px_rgba(31,41,55,0.25)] transition-transform hover:scale-105 active:scale-95"
        >
          <ArrowLeft size={16} strokeWidth={2.5} />
          처음으로
        </Link>
        <article className="rounded-2xl border-4 border-gray-800 bg-white p-5 shadow-[4px_4px_0px_rgba(31,41,55,0.25)] sm:p-8">
          <h1 className="mb-1 text-3xl font-jua text-pink-700">{title}</h1>
          <p className="mb-6 text-sm text-gray-500">시행일: {effectiveDate}</p>
          <div className="flex flex-col gap-6 break-keep text-[15px] leading-relaxed text-gray-700">
            {children}
          </div>
        </article>
      </div>
    </main>
  );
}

/** One numbered article/section of a legal page. */
export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="font-jua text-xl text-blue-900">{title}</h2>
      {children}
    </section>
  );
}

/** A plain bulleted list for legal text. */
export function LegalList({ children }: { children: React.ReactNode }) {
  return <ul className="flex list-disc flex-col gap-1 pl-5">{children}</ul>;
}
