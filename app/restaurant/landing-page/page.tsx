"use client";

import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect, useRef } from "react";
import { db } from "@/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { LandingPageConfig } from "@/types";
import { toast } from "@/lib/toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import {
  Save, UtensilsCrossed, MapPin, CalendarDays, Activity,
  Palette, Layout, Type, Settings2, Loader2, RotateCcw,
  ExternalLink, Smartphone, ImageIcon, Phone, Store,
  CheckCircle2, Eye, Layers
} from "lucide-react";
import Link from "next/link";

// ─── Types ───────────────────────────────────────────────────────────────────

const DEFAULT_CONFIG: LandingPageConfig = {
  theme: {
    primaryColor: "#059669",
    backgroundColor: "#f8fafc",
    buttonStyle: "solid",
    cardStyle: "rounded",
  },
  layout: {
    showTakeaway: true,
    showBookTable: true,
    showTrackOrder: false,
  },
  cta: {
    takeawayText: "View Menu & Order",
    bookingText: "Book a Table",
    trackOrderText: "Track My Order",
  },
};

const PRESETS = [
  { name: "Emerald", primary: "#059669", bg: "#f0fdf4" },
  { name: "Ocean",   primary: "#0284c7", bg: "#f0f9ff" },
  { name: "Violet",  primary: "#7c3aed", bg: "#faf5ff" },
  { name: "Rose",    primary: "#e11d48", bg: "#fff1f2" },
  { name: "Slate",   primary: "#334155", bg: "#f8fafc" },
  { name: "Amber",   primary: "#d97706", bg: "#fffbeb" },
];

// ─── Sidebar sections ────────────────────────────────────────────────────────

const SECTIONS = [
  { id: "branding",  label: "Branding",       icon: Store },
  { id: "theme",     label: "Theme",           icon: Palette },
  { id: "layout",    label: "Layout",          icon: Layers },
  { id: "cta",       label: "Buttons & CTA",  icon: Type },
  { id: "advanced",  label: "Advanced",        icon: Settings2 },
] as const;
type SectionId = typeof SECTIONS[number]["id"];

// ─── Component ───────────────────────────────────────────────────────────────

export default function LandingPageCustomizer() {
  const { restaurant } = useAuth();

  const [activeSection, setActiveSection] = useState<SectionId>("branding");
  const [saving, setSaving]               = useState(false);
  const [saved, setSaved]                 = useState(false);
  const [isDirty, setIsDirty]             = useState(false);
  const [previewScale, setPreviewScale]   = useState(1);

  // Branding
  const [name, setName]       = useState("");
  const [logo, setLogo]       = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone]     = useState("");

  // Config
  const [config, setConfig] = useState<LandingPageConfig>(DEFAULT_CONFIG);
  const originalRef = useRef<string>("");

  useEffect(() => {
    if (restaurant) {
      setName(restaurant.name ?? "");
      setLogo(restaurant.logo ?? "");
      setAddress(restaurant.address ?? "");
      setPhone(restaurant.phoneNumber ?? "");
      const cfg = restaurant.landingPageConfig ?? DEFAULT_CONFIG;
      setConfig(cfg);
      originalRef.current = JSON.stringify({ name: restaurant.name, logo: restaurant.logo, address: restaurant.address, phone: restaurant.phoneNumber, cfg });
    }
  }, [restaurant]);

  // Dirty-check
  useEffect(() => {
    const curr = JSON.stringify({ name, logo, address, phone, cfg: config });
    setIsDirty(curr !== originalRef.current);
  }, [name, logo, address, phone, config]);

  const updateTheme  = (k: keyof LandingPageConfig["theme"],  v: string)  => setConfig(p => ({ ...p, theme:  { ...p.theme,  [k]: v } }));
  const updateLayout = (k: keyof LandingPageConfig["layout"], v: boolean) => setConfig(p => ({ ...p, layout: { ...p.layout, [k]: v } }));
  const updateCta    = (k: keyof LandingPageConfig["cta"],    v: string)  => setConfig(p => ({ ...p, cta:   { ...p.cta,   [k]: v } }));

  const applyPreset = (preset: typeof PRESETS[number]) => {
    updateTheme("primaryColor",  preset.primary);
    updateTheme("backgroundColor", preset.bg);
    // micro-bounce on preview
    setPreviewScale(0.97);
    setTimeout(() => setPreviewScale(1), 200);
  };

  const resetToDefault = () => {
    setConfig(DEFAULT_CONFIG);
    if (restaurant) {
      setName(restaurant.name ?? "");
      setLogo(restaurant.logo ?? "");
      setAddress(restaurant.address ?? "");
      setPhone(restaurant.phoneNumber ?? "");
    }
  };

  const handleSave = async () => {
    if (!restaurant || !isDirty) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "restaurants", restaurant.id), {
        name, logo, address, phoneNumber: phone,
        landingPageConfig: config,
      });
      originalRef.current = JSON.stringify({ name, logo, address, phone, cfg: config });
      setIsDirty(false);
      setSaved(true);
      toast.success("Landing page published!");
      setTimeout(() => setSaved(false), 3000);
    } catch {
      toast.error("Failed to save changes.");
    } finally {
      setSaving(false);
    }
  };

  // ── preview helpers ─────────────────────────────────────────────────────
  const cardRadius = config.theme.cardStyle === "rounded" ? "1.5rem" : "0.25rem";
  const btnRadius  = config.theme.cardStyle === "rounded" ? "0.875rem" : "0.125rem";

  const btnStyle = (): React.CSSProperties => {
    if (config.theme.buttonStyle === "gradient")
      return { background: `linear-gradient(135deg, ${config.theme.primaryColor}cc, ${config.theme.primaryColor})`, color: "#fff", border: "none" };
    if (config.theme.buttonStyle === "outline")
      return { background: "transparent", border: `2px solid ${config.theme.primaryColor}`, color: config.theme.primaryColor };
    return { background: config.theme.primaryColor, color: "#fff", border: "none" };
  };

  const slug = restaurant?.customSlug ?? "";

  // ── Field sections ───────────────────────────────────────────────────────

  const SectionBranding = () => (
    <div className="space-y-5">
      <SectionHeader title="Core Branding" subtitle="These details appear on your public landing page." />

      <Field label="Restaurant Name">
        <Input value={name} onChange={e => setName(e.target.value)} className="focus-visible:ring-emerald-500" />
      </Field>

      <Field label="Logo URL" hint="Direct image URL (Cloudinary / any CDN)">
        <div className="flex gap-2">
          <Input value={logo} onChange={e => setLogo(e.target.value)} placeholder="https://..." className="focus-visible:ring-emerald-500 flex-1" />
          {logo && <img src={logo} alt="preview" className="h-10 w-10 rounded-lg object-cover shrink-0 border border-slate-200" />}
        </div>
      </Field>

      <Field label="Address">
        <Input value={address} onChange={e => setAddress(e.target.value)} className="focus-visible:ring-emerald-500" />
      </Field>

      <Field label="Phone Number">
        <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 98765 43210" className="focus-visible:ring-emerald-500" />
      </Field>
    </div>
  );

  const SectionTheme = () => (
    <div className="space-y-6">
      <SectionHeader title="Theme" subtitle="Colors and visual style for your page." />

      {/* Presets */}
      <div className="space-y-2">
        <Label className="text-xs font-bold uppercase tracking-widest text-slate-400">Quick Presets</Label>
        <div className="grid grid-cols-3 gap-2">
          {PRESETS.map(p => (
            <button
              key={p.name}
              onClick={() => applyPreset(p)}
              className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 hover:border-slate-400 transition-all text-sm font-semibold text-slate-700 hover:bg-slate-50 group"
            >
              <div className="w-5 h-5 rounded-full shrink-0 shadow-sm" style={{ background: p.primary }} />
              {p.name}
            </button>
          ))}
        </div>
      </div>

      <div className="h-px bg-slate-100" />

      {/* Color pickers */}
      <div className="grid grid-cols-2 gap-4">
        <ColorField label="Primary Color" value={config.theme.primaryColor} onChange={v => updateTheme("primaryColor", v)} />
        <ColorField label="Background Color" value={config.theme.backgroundColor} onChange={v => updateTheme("backgroundColor", v)} />
      </div>

      <Field label="Button Style">
        <Select value={config.theme.buttonStyle} onValueChange={v => updateTheme("buttonStyle", v ?? "")}>
          <SelectTrigger className="focus:ring-emerald-500"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="solid">Solid Block</SelectItem>
            <SelectItem value="gradient">Gradient Premium</SelectItem>
            <SelectItem value="outline">Outline / Ghost</SelectItem>
          </SelectContent>
        </Select>
      </Field>

      <Field label="Card Border Style">
        <Select value={config.theme.cardStyle} onValueChange={v => updateTheme("cardStyle", v ?? "")}>
          <SelectTrigger className="focus:ring-emerald-500"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="rounded">Soft & Rounded (Modern)</SelectItem>
            <SelectItem value="sharp">Sharp & Edgy (Classic)</SelectItem>
          </SelectContent>
        </Select>
      </Field>
    </div>
  );

  const SectionLayout = () => (
    <div className="space-y-5">
      <SectionHeader title="Page Layout" subtitle="Control which sections appear for your customers." />
      <ToggleRow
        title="Takeaway Orders"
        subtitle="Let customers place pickup orders online"
        checked={config.layout.showTakeaway}
        onChange={v => updateLayout("showTakeaway", v)}
        accent={config.theme.primaryColor}
      />
      <ToggleRow
        title="Book a Table"
        subtitle="Allow customers to reserve a table"
        checked={config.layout.showBookTable}
        onChange={v => updateLayout("showBookTable", v)}
        accent={config.theme.primaryColor}
      />
      <ToggleRow
        title="Track My Order"
        subtitle="Show a live order status tracker"
        checked={config.layout.showTrackOrder}
        onChange={v => updateLayout("showTrackOrder", v)}
        accent={config.theme.primaryColor}
      />
    </div>
  );

  const SectionCta = () => (
    <div className="space-y-5">
      <SectionHeader title="Button Text" subtitle="Customise the call-to-action labels customers see." />
      {config.layout.showTakeaway && (
        <Field label="Takeaway / Menu Button">
          <Input value={config.cta.takeawayText} onChange={e => updateCta("takeawayText", e.target.value)} className="focus-visible:ring-emerald-500" />
        </Field>
      )}
      {config.layout.showBookTable && (
        <Field label="Book Table Button">
          <Input value={config.cta.bookingText} onChange={e => updateCta("bookingText", e.target.value)} className="focus-visible:ring-emerald-500" />
        </Field>
      )}
      {config.layout.showTrackOrder && (
        <Field label="Track Order Button">
          <Input value={config.cta.trackOrderText} onChange={e => updateCta("trackOrderText", e.target.value)} className="focus-visible:ring-emerald-500" />
        </Field>
      )}
      {!config.layout.showTakeaway && !config.layout.showBookTable && !config.layout.showTrackOrder && (
        <div className="text-sm text-slate-400 bg-slate-50 rounded-xl p-4 text-center">
          Enable sections in <button className="underline text-emerald-600 font-medium" onClick={() => setActiveSection("layout")}>Layout</button> to edit their button text.
        </div>
      )}
    </div>
  );

  const SectionAdvanced = () => (
    <div className="space-y-5">
      <SectionHeader title="Advanced" subtitle="Danger zone and power-user options." />
      <div className="p-4 rounded-xl border border-red-100 bg-red-50 space-y-3">
        <p className="text-sm font-semibold text-red-700">Reset to Default</p>
        <p className="text-xs text-red-500">This will reset all theme, layout and CTA settings back to DineFlow defaults. Your branding (name, logo) will not be affected.</p>
        <Button variant="outline" className="border-red-200 text-red-600 hover:bg-red-100 rounded-xl" onClick={resetToDefault}>
          <RotateCcw className="w-4 h-4 mr-2" /> Reset Settings
        </Button>
      </div>
      {slug && (
        <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
          <p className="text-sm font-semibold text-slate-700">Open Live Page</p>
          <p className="text-xs text-slate-500">Preview how your landing page looks to real customers.</p>
          <Link href={`/@${slug}`} target="_blank">
            <Button variant="outline" className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 rounded-xl">
              <ExternalLink className="w-4 h-4 mr-2" /> Open in New Tab
            </Button>
          </Link>
        </div>
      )}
    </div>
  );

  if (!restaurant) return (
    <div className="flex justify-center items-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
    </div>
  );

  const activeContent: Record<SectionId, React.ReactNode> = {
    branding: <SectionBranding />,
    theme:    <SectionTheme />,
    layout:   <SectionLayout />,
    cta:      <SectionCta />,
    advanced: <SectionAdvanced />,
  };

  return (
    <div className="flex gap-0 h-[calc(100vh-5rem)] -mx-4 sm:-mx-8 -mt-6 overflow-hidden">

      {/* ── LEFT SIDEBAR ─────────────────────────────────────────────── */}
      <aside className="w-56 shrink-0 border-r border-slate-200 bg-white flex flex-col overflow-y-auto">
        <div className="px-4 pt-6 pb-4">
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-3">Customise</p>
          <nav className="space-y-0.5">
            {SECTIONS.map(({ id, label, icon: Icon }) => {
              const active = activeSection === id;
              return (
                <button
                  key={id}
                  onClick={() => setActiveSection(id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    active ? "bg-emerald-50 text-emerald-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${active ? "text-emerald-600" : "text-slate-400"}`} />
                  {label}
                  {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Save button at sidebar bottom */}
        <div className="mt-auto p-4 border-t border-slate-100">
          <Button
            onClick={handleSave}
            disabled={saving || !isDirty}
            className={`w-full rounded-xl h-10 font-bold transition-all ${
              saved ? "bg-emerald-500 text-white" : isDirty ? "bg-slate-900 hover:bg-slate-800 text-white" : "bg-slate-100 text-slate-400 cursor-not-allowed"
            }`}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> :
             saved   ? <CheckCircle2 className="w-4 h-4 mr-2" /> :
                       <Save className="w-4 h-4 mr-2" />}
            {saving ? "Saving…" : saved ? "Published!" : "Publish"}
          </Button>
          {isDirty && !saving && <p className="text-center text-[11px] text-amber-500 mt-2 font-medium">Unsaved changes</p>}
        </div>
      </aside>

      {/* ── MAIN SETTINGS PANEL ──────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto bg-slate-50/60 px-8 py-6 min-w-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="max-w-lg space-y-6"
          >
            {activeContent[activeSection]}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* ── LIVE PREVIEW ─────────────────────────────────────────────── */}
      <aside className="w-[320px] shrink-0 border-l border-slate-200 bg-slate-100 flex flex-col items-center justify-start overflow-y-auto py-6 px-4 gap-3">
        <div className="flex items-center justify-between w-full mb-1">
          <span className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5" /> Live Preview
          </span>
          <Badge variant="outline" className="text-[10px] font-bold text-emerald-700 border-emerald-200 bg-emerald-50">Mobile</Badge>
        </div>

        {/* Phone shell */}
        <motion.div
          animate={{ scale: previewScale }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          className="w-full max-w-[260px] rounded-[2.25rem] border-[5px] border-slate-800 bg-slate-800 shadow-2xl overflow-hidden relative"
          style={{ aspectRatio: "9 / 19" }}
        >
          {/* Notch */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-5 bg-slate-800 rounded-b-2xl z-50" />

          {/* Screen */}
          <div
            className="w-full h-full overflow-y-auto flex flex-col items-center"
            style={{ backgroundColor: config.theme.backgroundColor }}
          >
            {/* Hero */}
            <div
              className="w-full shrink-0"
              style={{
                height: "110px",
                background: `linear-gradient(135deg, ${config.theme.primaryColor}dd, ${config.theme.primaryColor})`,
              }}
            />

            {/* Card */}
            <div className="w-full px-3 -mt-10 pb-10">
              <div
                className="bg-white shadow-lg p-4 text-center"
                style={{ borderRadius: cardRadius }}
              >
                {/* Logo */}
                <div
                  className="mx-auto mb-3 flex items-center justify-center rounded-full border-4 border-white shadow-md overflow-hidden -mt-10 shrink-0"
                  style={{ width: 60, height: 60, backgroundColor: config.theme.backgroundColor }}
                >
                  {logo ? (
                    <img src={logo} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <UtensilsCrossed className="w-6 h-6 opacity-60" style={{ color: config.theme.primaryColor }} />
                  )}
                </div>

                <p className="text-[13px] font-black text-slate-900 leading-tight truncate">{name || "Your Restaurant"}</p>
                <p className="text-[9px] text-slate-400 mt-0.5 truncate">{address || "Location"}</p>

                {/* CTA Buttons */}
                <div className="flex flex-col gap-2 mt-4">
                  {config.layout.showTakeaway && (
                    <div
                      className="flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-bold shadow-sm"
                      style={{ ...btnStyle(), borderRadius: btnRadius }}
                    >
                      <UtensilsCrossed className="w-3.5 h-3.5 opacity-90" />
                      <span>{config.cta.takeawayText}</span>
                    </div>
                  )}
                  {config.layout.showBookTable && (
                    <div
                      className="flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-bold shadow-sm"
                      style={{ ...btnStyle(), borderRadius: btnRadius }}
                    >
                      <CalendarDays className="w-3.5 h-3.5 opacity-90" />
                      <span>{config.cta.bookingText}</span>
                    </div>
                  )}
                  {config.layout.showTrackOrder && (
                    <div
                      className="flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-bold shadow-sm"
                      style={{ ...btnStyle(), borderRadius: btnRadius }}
                    >
                      <Activity className="w-3.5 h-3.5 opacity-90" />
                      <span>{config.cta.trackOrderText}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Open live link */}
        {slug && (
          <Link href={`/@${slug}`} target="_blank" className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1 hover:underline mt-1">
            <ExternalLink className="w-3 h-3" /> View live page
          </Link>
        )}
      </aside>
    </div>
  );
}

// ── Small shared sub-components ───────────────────────────────────────────────

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-1">
      <h2 className="text-lg font-black text-slate-900">{title}</h2>
      <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="font-semibold text-slate-700">{label}</Label>
      {hint && <p className="text-[11px] text-slate-400">{hint}</p>}
      {children}
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label className="font-semibold text-slate-700 text-xs uppercase tracking-widest">{label}</Label>
      <div className="flex gap-2 items-center">
        <div className="relative">
          <input
            type="color"
            value={value}
            onChange={e => onChange(e.target.value)}
            className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
          />
          <div className="w-9 h-9 rounded-lg border-2 border-white shadow-md" style={{ background: value }} />
        </div>
        <Input
          value={value}
          onChange={e => onChange(e.target.value)}
          className="font-mono text-sm h-9 focus-visible:ring-emerald-500 uppercase"
        />
      </div>
    </div>
  );
}

function ToggleRow({ title, subtitle, checked, onChange, accent }: {
  title: string; subtitle: string; checked: boolean; onChange: (v: boolean) => void; accent: string;
}) {
  return (
    <div className={`flex items-center justify-between p-4 rounded-xl border transition-all ${checked ? "border-emerald-200 bg-emerald-50/60" : "border-slate-200 bg-white"}`}>
      <div>
        <p className="text-sm font-bold text-slate-900">{title}</p>
        <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
