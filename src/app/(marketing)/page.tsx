import ScrollyHero from '@/components/marketing/ScrollyHero';
import UrlTypewriterSection from '@/components/marketing/UrlTypewriterSection';
import LegoModelWrapper from '@/components/marketing/LegoModelWrapper';
import ReportInsightSection from '@/components/marketing/ReportInsightSection';
import CtaSection from '@/components/marketing/CtaSection';

export default function Home() {
  return (
    <div className="flex flex-col text-slate-900" style={{
      background: 'linear-gradient(180deg, #ffffff 0%, #f7f8ff 18%, #ffffff 38%, #faf8ff 58%, #f5f8ff 78%, #ffffff 100%)',
    }}>

      {/* ── SCROLLYTELLING HERO (0–500vh sticky canvas) ── */}
      <ScrollyHero />

      {/* ── URL INPUT TYPEWRITER ── */}
      <UrlTypewriterSection />

      {/* ── 3D AI PERSONA MODEL ── */}
      <LegoModelWrapper />

      {/* ── REPORT INSIGHTS ── */}
      <ReportInsightSection />

      {/* ── CTA ── */}
      <CtaSection />
    </div>
  );
}

