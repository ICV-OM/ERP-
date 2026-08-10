"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { Locale } from "@/lib/locale";
import styles from "./HeroSliderManager.module.css";

type Slide = {
  id: string;
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  imageUrl: string | null;
  sortOrder: number;
  isActive: boolean;
  durationSeconds: number;
  overlayOpacity: number;
  startsAt: string;
  endsAt: string;
};

function csrf() {
  return decodeURIComponent(document.cookie.split("; ").find(v => v.startsWith("alturud_csrf="))?.split("=")[1] ?? "");
}

function localInput(value: string) {
  return value ? value.slice(0, 16) : "";
}

export function HeroSliderManager({ locale }: { locale: Locale }) {
  const ar = locale === "ar";
  const [slides, setSlides] = useState<Slide[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [preview, setPreview] = useState("");
  const [dragId, setDragId] = useState<string | null>(null);

  const activeCount = useMemo(() => slides.filter(s => s.isActive).length, [slides]);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/hero-slides", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load slides");
      setSlides(data.slides || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : (ar ? "تعذر تحميل الشرائح" : "Unable to load slides"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  function updateLocal(id: string, patch: Partial<Slide>) {
    setSlides(current => current.map(slide => slide.id === id ? { ...slide, ...patch } : slide));
  }

  async function createSlide(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError(""); setMessage("");
    try {
      const form = new FormData(event.currentTarget);
      form.set("sortOrder", String((slides.length + 1) * 10));
      form.set("isActive", "true");
      const response = await fetch("/api/admin/hero-slides", { method: "POST", headers: { "x-csrf-token": csrf() }, body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to create slide");
      event.currentTarget.reset();
      if (preview) URL.revokeObjectURL(preview);
      setPreview("");
      setMessage(ar ? "تمت إضافة الشريحة ونشرها فورًا." : "Slide added and published immediately.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : (ar ? "تعذر إضافة الشريحة" : "Unable to add slide"));
    } finally { setBusy(false); }
  }

  async function saveSlide(slide: Slide) {
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch(`/api/admin/hero-slides/${slide.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json", "x-csrf-token": csrf() },
        body: JSON.stringify({
          titleAr: slide.titleAr,
          titleEn: slide.titleEn,
          descriptionAr: slide.descriptionAr,
          descriptionEn: slide.descriptionEn,
          sortOrder: slide.sortOrder,
          isActive: slide.isActive,
          durationSeconds: slide.durationSeconds,
          overlayOpacity: slide.overlayOpacity,
          startsAt: slide.startsAt || null,
          endsAt: slide.endsAt || null
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to save slide");
      setMessage(ar ? "تم حفظ التعديلات وتطبيقها على شاشة الدخول." : "Changes saved and applied to the login screen.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : (ar ? "تعذر حفظ الشريحة" : "Unable to save slide"));
    } finally { setBusy(false); }
  }

  async function replaceImage(id: string, file: File | undefined) {
    if (!file) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const form = new FormData(); form.set("image", file);
      const response = await fetch(`/api/admin/hero-slides/${id}`, { method: "PUT", headers: { "x-csrf-token": csrf() }, body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to replace image");
      setMessage(ar ? "تم استبدال الصورة فورًا." : "Image replaced immediately.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : (ar ? "تعذر استبدال الصورة" : "Unable to replace image"));
    } finally { setBusy(false); }
  }

  async function removeSlide(id: string) {
    if (!window.confirm(ar ? "هل تريد حذف هذه الشريحة نهائيًا؟" : "Delete this slide permanently?")) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch(`/api/admin/hero-slides/${id}`, { method: "DELETE", headers: { "x-csrf-token": csrf() } });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to delete slide");
      setMessage(ar ? "تم حذف الشريحة." : "Slide deleted.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : (ar ? "تعذر حذف الشريحة" : "Unable to delete slide"));
    } finally { setBusy(false); }
  }

  async function reorder(fromId: string, toId: string) {
    if (fromId === toId) return;
    const copy = [...slides];
    const from = copy.findIndex(s => s.id === fromId);
    const to = copy.findIndex(s => s.id === toId);
    if (from < 0 || to < 0) return;
    const [moved] = copy.splice(from, 1);
    copy.splice(to, 0, moved);
    const reordered = copy.map((slide, index) => ({ ...slide, sortOrder: (index + 1) * 10 }));
    setSlides(reordered);
    setBusy(true); setError("");
    try {
      await Promise.all(reordered.map(slide => fetch(`/api/admin/hero-slides/${slide.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json", "x-csrf-token": csrf() },
        body: JSON.stringify({ sortOrder: slide.sortOrder })
      }).then(async r => { if (!r.ok) { const d = await r.json().catch(() => ({})); throw new Error(d.error || "Unable to reorder"); } })));
      setMessage(ar ? "تم تحديث ترتيب الشرائح." : "Slide order updated.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : (ar ? "تعذر تحديث الترتيب" : "Unable to update order"));
      await load();
    } finally { setBusy(false); }
  }

  return <div className={styles.manager}>
    <div className={styles.summary}>
      <span className={styles.pill}>{ar ? `إجمالي الشرائح: ${slides.length}` : `Total slides: ${slides.length}`}</span>
      <span className={styles.pill}>{ar ? `النشطة الآن: ${activeCount}` : `Active now: ${activeCount}`}</span>
      <span className={styles.pill}>{ar ? "التغييرات تظهر فورًا دون إعادة نشر" : "Changes appear immediately without redeploy"}</span>
    </div>

    {message && <div className={`${styles.notice} ${styles.success}`}>{message}</div>}
    {error && <div className={`${styles.notice} ${styles.error}`}>{error}</div>}

    <section className={styles.panel}>
      <h2>{ar ? "إضافة شريحة جديدة" : "Add new slide"}</h2>
      <p>{ar ? "ارفع JPG أو PNG أو WebP بحجم لا يتجاوز 6MB. يفضّل مقاسًا عريضًا مثل 1920×1080." : "Upload JPG, PNG or WebP up to 6MB. A wide format such as 1920×1080 is recommended."}</p>
      <form onSubmit={createSlide}>
        <div className={styles.grid}>
          <label className={`${styles.field} ${styles.wide}`}>{ar ? "الصورة" : "Image"}<input name="image" type="file" accept="image/jpeg,image/png,image/webp" required onChange={e => { const file=e.currentTarget.files?.[0]; if(preview)URL.revokeObjectURL(preview); setPreview(file?URL.createObjectURL(file):""); }}/></label>
          {preview && <div className={`${styles.preview} ${styles.wide}`}><img src={preview} alt="Preview"/></div>}
          <label className={styles.field}>{ar ? "العنوان بالعربية" : "Arabic title"}<input name="titleAr" maxLength={180}/></label>
          <label className={styles.field}>{ar ? "العنوان بالإنجليزية" : "English title"}<input name="titleEn" maxLength={180}/></label>
          <label className={styles.field}>{ar ? "الوصف بالعربية" : "Arabic description"}<textarea name="descriptionAr" maxLength={600}/></label>
          <label className={styles.field}>{ar ? "الوصف بالإنجليزية" : "English description"}<textarea name="descriptionEn" maxLength={600}/></label>
          <label className={styles.field}>{ar ? "مدة العرض بالثواني" : "Display duration (seconds)"}<input name="durationSeconds" type="number" min={2} max={30} defaultValue={5}/></label>
          <label className={styles.field}>{ar ? "درجة التعتيم" : "Overlay opacity"}<div className={styles.rangeRow}><input name="overlayOpacity" type="range" min={0} max={0.8} step={0.1} defaultValue={0.4}/><span>0–80%</span></div></label>
          <label className={styles.field}>{ar ? "بداية الظهور (اختياري)" : "Start date (optional)"}<input name="startsAt" type="datetime-local"/></label>
          <label className={styles.field}>{ar ? "نهاية الظهور (اختياري)" : "End date (optional)"}<input name="endsAt" type="datetime-local"/></label>
        </div>
        <div className={styles.actions}><button className={styles.primary} disabled={busy}>{busy ? (ar ? "جاري الحفظ..." : "Saving...") : (ar ? "إضافة ونشر" : "Add & publish")}</button></div>
      </form>
    </section>

    <section className={styles.panel}>
      <h2>{ar ? "الشرائح الحالية" : "Current slides"}</h2>
      <p>{ar ? "اسحب أي بطاقة لتغيير ترتيبها، أو عدّل النصوص والمدة والحالة ثم اضغط حفظ." : "Drag a card to reorder it, or edit its text, duration and status then save."}</p>
      {loading ? <div className={styles.empty}>{ar ? "جاري التحميل..." : "Loading..."}</div> : slides.length === 0 ? <div className={styles.empty}>{ar ? "لا توجد شرائح. أضف أول صورة أعلاه." : "No slides yet. Add the first image above."}</div> : <div className={styles.list}>
        {slides.map((slide, index) => <article key={slide.id} draggable={!busy} onDragStart={()=>setDragId(slide.id)} onDragEnd={()=>setDragId(null)} onDragOver={e=>e.preventDefault()} onDrop={()=>{if(dragId)reorder(dragId,slide.id)}} className={`${styles.card} ${dragId===slide.id?styles.dragging:""}`}>
          <div className={styles.thumb}>{slide.imageUrl && <img src={slide.imageUrl} alt={slide.titleAr || slide.titleEn || `Slide ${index+1}`}/>}<span className={styles.status}>{slide.isActive?(ar?"نشطة":"Active"):(ar?"متوقفة":"Disabled")}</span></div>
          <div className={styles.cardBody}>
            <div className={styles.cardTop}><div><div className={styles.cardTitle}>{slide.titleAr || slide.titleEn || (ar?`شريحة ${index+1}`:`Slide ${index+1}`)}</div><div className={styles.meta}>{ar?`الترتيب ${index+1} · ${slide.durationSeconds} ثوانٍ`:`Order ${index+1} · ${slide.durationSeconds}s`}</div><div className={styles.dragHint}>{ar?"اسحب البطاقة لتغيير ترتيب العرض":"Drag this card to change display order"}</div></div><label className={styles.toggle}><input type="checkbox" checked={slide.isActive} onChange={e=>updateLocal(slide.id,{isActive:e.target.checked})}/>{ar?"مفعلة":"Enabled"}</label></div>
            <div className={styles.grid}>
              <label className={styles.field}>{ar?"العنوان العربي":"Arabic title"}<input value={slide.titleAr} onChange={e=>updateLocal(slide.id,{titleAr:e.target.value})}/></label>
              <label className={styles.field}>{ar?"العنوان الإنجليزي":"English title"}<input value={slide.titleEn} onChange={e=>updateLocal(slide.id,{titleEn:e.target.value})}/></label>
              <label className={styles.field}>{ar?"الوصف العربي":"Arabic description"}<textarea value={slide.descriptionAr} onChange={e=>updateLocal(slide.id,{descriptionAr:e.target.value})}/></label>
              <label className={styles.field}>{ar?"الوصف الإنجليزي":"English description"}<textarea value={slide.descriptionEn} onChange={e=>updateLocal(slide.id,{descriptionEn:e.target.value})}/></label>
              <label className={styles.field}>{ar?"مدة العرض":"Duration"}<input type="number" min={2} max={30} value={slide.durationSeconds} onChange={e=>updateLocal(slide.id,{durationSeconds:Number(e.target.value)})}/></label>
              <label className={styles.field}>{ar?"التعتيم":"Overlay"}<div className={styles.rangeRow}><input type="range" min={0} max={0.8} step={0.1} value={slide.overlayOpacity} onChange={e=>updateLocal(slide.id,{overlayOpacity:Number(e.target.value)})}/><span>{Math.round(slide.overlayOpacity*100)}%</span></div></label>
              <label className={styles.field}>{ar?"بداية الظهور":"Start"}<input type="datetime-local" value={localInput(slide.startsAt)} onChange={e=>updateLocal(slide.id,{startsAt:e.target.value})}/></label>
              <label className={styles.field}>{ar?"نهاية الظهور":"End"}<input type="datetime-local" value={localInput(slide.endsAt)} onChange={e=>updateLocal(slide.id,{endsAt:e.target.value})}/></label>
            </div>
            <div className={styles.actions}>
              <button className={styles.primary} disabled={busy} onClick={()=>saveSlide(slide)}>{ar?"حفظ":"Save"}</button>
              <label className={`${styles.secondary} ${styles.replaceInput}`}>{ar?"استبدال الصورة":"Replace image"}<input type="file" hidden accept="image/jpeg,image/png,image/webp" onChange={e=>replaceImage(slide.id,e.currentTarget.files?.[0])}/></label>
              <button className={styles.mini} disabled={busy||index===0} onClick={()=>index>0&&reorder(slide.id,slides[index-1].id)}>↑</button>
              <button className={styles.mini} disabled={busy||index===slides.length-1} onClick={()=>index<slides.length-1&&reorder(slide.id,slides[index+1].id)}>↓</button>
              <button className={styles.danger} disabled={busy} onClick={()=>removeSlide(slide.id)}>{ar?"حذف":"Delete"}</button>
            </div>
          </div>
        </article>)}
      </div>}
    </section>
  </div>;
}
