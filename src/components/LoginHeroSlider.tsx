"use client";

import { useEffect, useMemo, useState } from "react";
import type { Locale } from "@/lib/locale";
import styles from "./LoginHeroSlider.module.css";

type HeroLabels = {
  platform: string;
  headline: string;
  description: string;
  badges: readonly string[];
};

type HeroSlide = {
  id: string;
  titleAr: string | null;
  titleEn: string | null;
  descriptionAr: string | null;
  descriptionEn: string | null;
  imageUrl: string;
  durationSeconds: number;
  overlayOpacity: number;
};

const fallbackSlides: HeroSlide[] = [
  { id: "port", titleAr: null, titleEn: null, descriptionAr: null, descriptionEn: null, imageUrl: "/hero-port.svg", durationSeconds: 5, overlayOpacity: .45 },
  { id: "containers", titleAr: null, titleEn: null, descriptionAr: null, descriptionEn: null, imageUrl: "/hero-containers.svg", durationSeconds: 5, overlayOpacity: .45 },
  { id: "delivery", titleAr: null, titleEn: null, descriptionAr: null, descriptionEn: null, imageUrl: "/hero-delivery.svg", durationSeconds: 5, overlayOpacity: .45 }
];

export function LoginHeroSlider({ labels, locale }: { labels: HeroLabels; locale: Locale }) {
  const [slides, setSlides] = useState<HeroSlide[]>(fallbackSlides);
  const [active, setActive] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/public/hero-slides", { cache: "no-store" })
      .then(async response => response.ok ? response.json() : { slides: [] })
      .then(data => {
        if (cancelled) return;
        const next = Array.isArray(data.slides) ? data.slides.filter((slide: HeroSlide) => Boolean(slide.imageUrl)) : [];
        if (next.length) { setSlides(next); setActive(0); }
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (media.matches || slides.length < 2) return;
    const seconds = Math.max(2, Math.min(30, slides[active]?.durationSeconds || 5));
    const timer = window.setTimeout(() => setActive(value => (value + 1) % slides.length), seconds * 1000);
    return () => window.clearTimeout(timer);
  }, [active, slides]);

  const current = slides[active] ?? slides[0] ?? fallbackSlides[0];
  const headline = locale === "ar" ? (current.titleAr || labels.headline) : (current.titleEn || labels.headline);
  const description = locale === "ar" ? (current.descriptionAr || labels.description) : (current.descriptionEn || labels.description);
  const overlayClass = useMemo(() => {
    const level = Math.max(0, Math.min(8, Math.round((current.overlayOpacity ?? .45) * 10)));
    return styles[`overlay${level}`] ?? styles.overlay5;
  }, [current.overlayOpacity]);

  return (
    <div className={styles.heroRoot}>
      {slides.map((slide, index) => (
        <div key={slide.id} aria-hidden={index !== active} className={`${styles.slide} ${index === active ? styles.slideActive : ""}`}>
          <img src={slide.imageUrl} alt="" className={styles.slideImage} draggable={false}/>
        </div>
      ))}

      <div className={`${styles.overlay} ${overlayClass}`} />

      <div className={styles.content}>
        <div className={styles.topRow}>
          <div className={styles.logoBox}>
            <img src="/alturud-logo.svg" alt="ALTURUD" className={styles.logo} />
          </div>

          <div className={styles.dots} aria-label="Hero slides">
            {slides.map((slide, index) => (
              <button
                type="button"
                key={slide.id}
                aria-label={`Slide ${index + 1}`}
                aria-current={index === active ? "true" : undefined}
                onClick={() => setActive(index)}
                className={`${styles.dot} ${index === active ? styles.dotActive : ""}`}
              />
            ))}
          </div>
        </div>

        <div className={styles.copy}>
          <div className={`eyebrow ${styles.eyebrow}`}>{labels.platform}</div>
          <h1 className={styles.headline}>{headline}</h1>
          <p className={styles.description}>{description}</p>
          <div className={styles.badges}>
            {labels.badges.map(item => <span key={item} className={styles.badge}>{item}</span>)}
          </div>
        </div>
      </div>
    </div>
  );
}
