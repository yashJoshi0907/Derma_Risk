import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Activity, ShieldCheck, ArrowRight, Sparkles, CheckCircle } from 'lucide-react';

export function Home() {
  return (
    <div className="min-h-screen bg-white">

      {/* ── Navigation ─────────────────────────────────────── */}
      <nav className="border-b border-slate-100 px-6 lg:px-12 py-4 flex items-center justify-between z-50 bg-white/90 backdrop-blur-md sticky top-0 shadow-sm">
        <div className="font-bold tracking-wide text-2xl flex items-center gap-2.5 text-trustBlue-900">
          <div className="w-10 h-10 rounded-xl bg-trustBlue-900 text-white flex items-center justify-center font-extrabold shadow-sm text-lg">
            D
          </div>
          DermaRisk
        </div>
        <div className="flex items-center gap-3">
          <Link to="/login">
            <button className="hidden sm:inline-flex text-sm font-medium text-slate-600 hover:text-trustBlue-900 transition-colors px-4 py-2 rounded-lg hover:bg-slate-50">
              View Demo
            </button>
          </Link>
          <Link to="/login">
            <button className="inline-flex items-center gap-2 text-sm font-semibold bg-trustBlue-900 text-white px-5 py-2.5 rounded-xl hover:bg-trustBlue-800 transition-all duration-200 shadow-sm hover:shadow-md">
              Clinician Login <ArrowRight className="w-4 h-4" />
            </button>
          </Link>
        </div>
      </nav>

      {/* ── Hero Section ───────────────────────────────────── */}
      <section className="relative overflow-hidden flex items-center pt-[50px] pb-16">

        {/* Subtle left-side background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-trustBlue-50/30 pointer-events-none" />

        <div className="relative w-full max-w-[1400px] mx-auto px-6 lg:px-12 xl:px-20 grid lg:grid-cols-2 gap-0 items-center">

          {/* ── LEFT: Copy ─────────────────────────────────── */}
          <div className="relative z-10 py-16 lg:py-0 flex flex-col justify-center space-y-8 lg:pr-12 xl:pr-20">

            {/* Badge */}
            <div className="inline-flex items-center gap-2 self-start px-4 py-2 rounded-full bg-trustBlue-50 border border-trustBlue-100 text-trustBlue-800 text-sm font-semibold shadow-sm">
              <span className="w-2 h-2 rounded-full bg-trustBlue-500 animate-pulse" />
              Clinical Decision Support System
            </div>

            {/* Headline */}
            <div className="space-y-3">
              <h1 className="text-5xl xl:text-6xl font-extrabold text-slate-900 leading-[1.08] tracking-tight">
                AI-Powered<br />
                <span className="relative">
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-trustBlue-600 via-trustBlue-700 to-trustBlue-900">
                    Dermatology
                  </span>
                </span>
                <br />
                Risk Analysis
              </h1>
            </div>

            {/* Description */}
            <p className="text-lg text-slate-600 max-w-[480px] leading-relaxed">
              Enhance your clinical diagnostic workflow with DermaRisk's explainable Two-Stage Intelligence Pipeline — accurate skin lesion classification with verifiable AI logic via Grad-CAM & LIME.
            </p>

            {/* Trust signals */}
            <div className="flex flex-col gap-2.5">
              {[
                'Grad-CAM & LIME explainability built-in',
                'Validated on HAM10000 clinical dataset',
                'HIPAA-ready secure authentication',
              ].map((item) => (
                <div key={item} className="flex items-center gap-2.5 text-slate-600 text-sm">
                  <CheckCircle className="w-4.5 h-4.5 text-trustBlue-600 shrink-0 w-5 h-5" />
                  <span>{item}</span>
                </div>
              ))}
            </div>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link to="/login">
                <button className="group inline-flex items-center gap-2.5 bg-trustBlue-900 hover:bg-trustBlue-800 text-white font-bold px-8 py-4 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 text-base">
                  <ShieldCheck className="w-5 h-5" />
                  Access Platform
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </Link>
              <Link to="/login">
                <button className="inline-flex items-center gap-2 px-7 py-4 rounded-2xl border-2 border-slate-200 text-slate-700 hover:border-trustBlue-200 hover:text-trustBlue-900 hover:bg-trustBlue-50/50 font-semibold transition-all duration-200 text-base">
                  <Sparkles className="w-4 h-4" />
                  View Demo
                </button>
              </Link>
            </div>

          </div>

          {/* ── RIGHT: Image Collage ────────────────────────── */}
          <div className="relative hidden lg:flex items-center justify-center" style={{ minHeight: '620px' }}>

            {/* Dark gradient background panel */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#0a2440] via-[#0d3060] to-[#0f4d3a] rounded-[40px] my-8 xl:my-12 ml-4" />

            {/* Decorative glow blobs */}
            <div className="absolute top-20 right-16 w-64 h-64 bg-trustBlue-500/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-24 left-8 w-48 h-48 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-white/5 rounded-full blur-2xl pointer-events-none" />

            {/* ── Card Collage ─── */}
            <div className="relative w-full h-full flex items-center justify-center py-16 px-8 xl:px-12" style={{ minHeight: '580px' }}>

              {/* MAIN CARD — Skin Scan (largest, center-left, slightly rotated CCW) */}
              <div
                className="absolute z-20"
                style={{
                  left: '8%',
                  top: '50%',
                  transform: 'translateY(-50%) rotate(-2.5deg)',
                  width: '52%',
                  maxWidth: '260px',
                }}
              >
                <div
                  className="rounded-[22px] overflow-hidden shadow-2xl border-2 border-white/10"
                  style={{
                    boxShadow: '0 30px 80px rgba(0,0,0,0.5), 0 4px 20px rgba(0,0,0,0.3)',
                  }}
                >
                  <img
                    src="/hero/hero-scan.png"
                    alt="Dermatology skin scan interface"
                    className="w-full h-full object-cover block"
                    draggable={false}
                  />
                </div>
                {/* Floating label */}
                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap bg-trustBlue-600 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg flex items-center gap-1.5">
                  <Activity className="w-3 h-3" />
                  Live Scan Analysis
                </div>
              </div>

              {/* SECONDARY CARD — Doctor (top-right, larger, tilted CW) */}
              <div
                className="absolute z-30"
                style={{
                  right: '3%',
                  top: '6%',
                  transform: 'rotate(2.5deg)',
                  width: '46%',
                  maxWidth: '220px',
                }}
              >
                <div
                  className="rounded-[22px] overflow-hidden shadow-2xl border-2 border-white/15"
                  style={{
                    boxShadow: '0 25px 60px rgba(0,0,0,0.45), 0 4px 16px rgba(0,0,0,0.25)',
                  }}
                >
                  <img
                    src="/hero/hero-doctor.jpg"
                    alt="Doctor with tablet"
                    className="w-full h-full object-cover block"
                    draggable={false}
                  />
                </div>
                {/* Trust badge */}
                <div className="absolute -top-3 right-3 bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  Verified Clinician
                </div>
              </div>

              {/* SUPPORT CARD — Futuristic AI (bottom-right, medium, tilted) */}
              <div
                className="absolute z-10"
                style={{
                  right: '2%',
                  bottom: '7%',
                  transform: 'rotate(-1.5deg)',
                  width: '55%',
                  maxWidth: '270px',
                }}
              >
                <div
                  className="rounded-[22px] overflow-hidden shadow-xl border-2 border-white/10"
                  style={{
                    boxShadow: '0 20px 50px rgba(0,0,0,0.4), 0 4px 14px rgba(0,0,0,0.2)',
                  }}
                >
                  <img
                    src="/hero/hero-ai.png"
                    alt="Futuristic AI skin analysis"
                    className="w-full h-full object-cover block"
                    style={{ aspectRatio: '16/9' }}
                    draggable={false}
                  />
                </div>
                {/* AI label */}
                <div className="absolute -bottom-3 right-4 bg-slate-900/90 backdrop-blur-sm text-white border border-white/20 text-xs font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-yellow-400" />
                  XAI Powered
                </div>
              </div>

              {/* Floating metrics card (decorative) */}
              <div
                className="absolute z-40 bg-white/95 backdrop-blur-md rounded-2xl px-4 py-3 shadow-xl border border-slate-100"
                style={{ left: '5%', top: '8%' }}
              >
                <p className="text-xs text-slate-400 font-medium">Risk Level</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-sm font-bold text-slate-900">Low Risk</span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">Confidence: 94.2%</p>
              </div>

            </div>
          </div>

        </div>
      </section>
    </div>
  );
}
