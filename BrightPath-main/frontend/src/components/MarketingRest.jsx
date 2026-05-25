import { useEffect, useRef } from 'react';
import heroHtml from '../marketing/hero.html?raw';
import statsHtml from '../marketing/stats.html?raw';
import featuresHtml from '../marketing/features.html?raw';
import lowerHtml from '../marketing/lower.html?raw';
import footerCtaHtml from '../marketing/footer-cta.html?raw';
import { initChatDemo, initInboxFilters } from '../utils/messagingDemo';

export function HeroSection() {
  return (
    <>
      <div dangerouslySetInnerHTML={{ __html: heroHtml }} />
    </>
  );
}

export function StatsBar() {
  return (
    <>
      <div dangerouslySetInnerHTML={{ __html: statsHtml }} />
    </>
  );
}

export function FeaturesSection() {
  return (
    <>
      <div dangerouslySetInnerHTML={{ __html: featuresHtml }} />
    </>
  );
}

export function LowerSections({ bpProfile, sessionMode }) {
  const ref = useRef(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const cleanupFilters = initInboxFilters(root);
    const cleanupChat = initChatDemo(root, { bpProfile, sessionMode });
    return () => {
      cleanupChat?.();
      cleanupFilters?.();
    };
  }, [bpProfile, sessionMode]);

  return (
    <>
      <div
        key={`${sessionMode || 'demo'}-${bpProfile?.id || 'guest'}`}
        ref={ref}
        dangerouslySetInnerHTML={{ __html: lowerHtml }}
      />
    </>
  );
}

export function FooterSection() {
  return (
    <>
      <div dangerouslySetInnerHTML={{ __html: footerCtaHtml }} />
    </>
  );
}
