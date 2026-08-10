"use client";

import { useEffect, useState } from "react";

type HeroLabels = {
  platform: string;
  headline: string;
  description: string;
  badges: readonly string[];
};

const slides = [
  { src: "/hero-port.svg", position: "center center" },
  { src: "/hero-containers.svg", position: "center center" },
  { src: "/hero-delivery.svg", position: "center 48%" }
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
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: "#082f30" }}>
      {slides.map((slide, index) => (
        <div
          key={slide.src}
          aria-hidden={index !== active}
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `url(${slide.src})`,
            backgroundSize: "cover",
            backgroundPosition: slide.position,
            backgroundRepeat: "no-repeat",
            opacity: index === active ? 1 : 0,
            transform: index === active ? "scale(1.025)" : "scale(1)",
            transition: "opacity 900ms ease, transform 6500ms ease",
            willChange: "opacity, transform"
          }}
        />
      ))}

      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(4,35,36,.42) 0%, rgba(4,35,36,.18) 36%, rgba(4,35,36,.78) 75%, rgba(4,28,29,.94) 100%)"
        }}
      />

      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 2,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "42px 54px 34px"
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 20 }}>
          <div
            style={{
              width: 142,
              height: 72,
              borderRadius: 14,
              background: "rgba(255,255,255,.94)",
              boxShadow: "0 10px 30px rgba(0,0,0,.16)",
              display: "grid",
              placeItems: "center",
              padding: 10,
              overflow: "hidden"
            }}
          >
            <img
              src="/alturud-logo.svg"
              alt="ALTURUD"
              style={{ width: 118, height: 58, maxWidth: "100%", maxHeight: "100%", objectFit: "contain", display: "block" }}
            />
          </div>

          <div style={{ display: "flex", gap: 7, direction: "ltr", paddingTop: 10 }} aria-label="Hero slides">
            {slides.map((slide, index) => (
              <button
                type="button"
                key={slide.src}
                aria-label={`Slide ${index + 1}`}
                aria-current={index === active ? "true" : undefined}
                onClick={() => setActive(index)}
                style={{
                  width: index === active ? 28 : 9,
                  height: 9,
                  borderRadius: 99,
                  border: 0,
                  padding: 0,
                  background: index === active ? "#f2bd55" : "rgba(255,255,255,.58)",
                  transition: "width 220ms ease, background 220ms ease"
                }}
              />
            ))}
          </div>
        </div>

        <div style={{ maxWidth: 680 }}>
          <div
            className="eyebrow"
            style={{ color: "#b8d8d5", marginBottom: 10, textShadow: "0 2px 12px rgba(0,0,0,.35)" }}
          >
            {labels.platform}
          </div>
          <h1
            style={{
              margin: 0,
              color: "#fff",
              fontSize: "clamp(34px, 3.25vw, 58px)",
              lineHeight: 1.05,
              letterSpacing: "-.04em",
              textShadow: "0 3px 20px rgba(0,0,0,.35)"
            }}
          >
            {labels.headline}
          </h1>
          <p
            style={{
              margin: "16px 0 22px",
              color: "#d8e8e7",
              maxWidth: 620,
              lineHeight: 1.8,
              fontSize: 13,
              textShadow: "0 2px 12px rgba(0,0,0,.4)"
            }}
          >
            {labels.description}
          </p>
          <div className="securityStrip">
            {labels.badges.map((item) => (
              <span key={item} style={{ background: "rgba(5,41,42,.48)", backdropFilter: "blur(5px)" }}>
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
