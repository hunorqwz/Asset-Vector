import { Metadata } from "next";
import { SyllabusClient } from "@/components/organisms/SyllabusClient";
import { PageHeader } from "@/components/organisms/PageHeader";

export const metadata: Metadata = {
  title: "Quantitative Finance Syllabus & Glossary | Asset Vector",
  description: "A centralized quantitative roadmap and interactive learning center for financial analysis.",
};

export const dynamic = "force-dynamic";

export default async function EducationPage() {
  return (
    <>
      <PageHeader />

      <SyllabusClient />
    </>
  );
}
