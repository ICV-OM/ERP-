"use client";

import { useEffect, useState } from "react";
import styles from "./LoginHeroSlider.module.css";

type HeroLabels = {
  platform: string;
  headline: string;
  description: string;
  badges: readonly string[];
};

const slides = [
  { key: "port", className: styles.slidePort },
  { key: "containers", className: styles.slideContainers },
  { key: "delivery", className: styles.slideDelivery }
] as const;

export function LoginHeroSlider({ labels }: { labels: HeroLabels }) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (media.matches) return;
    const timer = window.setInterval(() => setActive((value) => (value + 1) % slides.length), 5000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className={styles.heroRoot}>
      {slides.map((slide, index) => (
        <div
          key={slide.key}
          aria-hidden={index !== active}
          className={`${styles.slide} ${slide.className} ${index === active ? styles.slideActive : ""}`}
        />
      ))}

      <div className={styles.overlay} />

      <div className={styles.content}>
        <div className={styles.topRow}>
          <div className={styles.logoBox}>
            <img src="/alturud-logo.svg" alt="ALTURUD" className={styles.logo} />
          </div>

          <div className={styles.dots} aria-label="Hero slides">
            {slides.map((slide, index) => (
              <button
                type="button"
                key={slide.key}
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
          <h1 className={styles.headline}>{labels.headline}</h1>
          <p className={styles.description}>{labels.description}</p>
          <div className={styles.badges}>
            {labels.badges.map((item) => (
              <span key={item} className={styles.badge}>{item}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
