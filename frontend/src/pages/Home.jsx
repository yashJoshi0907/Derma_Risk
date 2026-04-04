import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Activity, ShieldCheck, ArrowRight, Sparkles, CheckCircle, Brain, BarChart3, Users, Layers, Play } from 'lucide-react';

// ─── Feature data ────────────────────────────────────────────────────────────
const FEATURES = [
  {
    id: 1,
    icon: Layers,
    title: 'Multi-Class Lesion Detection',
    description:
      'Classifies skin lesions into multiple categories using trained deep learning models.',
    image: '/features/feature-classification.png',
    accent: 'from-trustBlue-500 to-trustBlue-700',
    iconBg: 'bg-trustBlue-50',
    iconColor: 'text-trustBlue-600',
  },
  {
    id: 2,
    icon: Brain,
    title: 'Explainable AI Insights',
    description:
      'Provides Grad-CAM and LIME visual explanations highlighting the exact regions influencing predictions.',
    image: '/features/feature-explainability.jpg',
    accent: 'from-violet-500 to-purple-700',
    iconBg: 'bg-violet-50',
    iconColor: 'text-violet-600',
  },
  {
    id: 3,
    icon: BarChart3,
    title: 'Risk Stratification Engine',
    description:
      'Translates model outputs into actionable risk levels to support clinical prioritization and follow-up planning.',
    image: '/features/feature-risk.png',
    accent: 'from-amber-500 to-orange-600',
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-600',
  },
  {
    id: 4,
    icon: Users,
    title: 'Patient Case Management',
    description:
      'Organize, review, and track patient cases with image history, AI results, and diagnostic insights in one place.',
    image: '/features/feature-patient.jpg',
    accent: 'from-emerald-500 to-teal-600',
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
  },
];

// ─── Statistics data ──────────────────────────────────────────────────────────
const STATS = [
  { value: '670+', label: 'Cases Analyzed' },
  { value: '95%', label: 'Model Accuracy' },
  { value: '<52s', label: 'Prediction Time' },
  { value: '7', label: 'Lesion Categories' },
];

export function Home() {
  const [activeFeature, setActiveFeature] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const demoRef = useRef(null);
  const videoRef = useRef(null);

  const scrollToDemo = () => {
    if (demoRef.current) {
      const navbarHeight = 72;
      const elementTop = demoRef.current.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({
        top: elementTop - navbarHeight - 20,
        behavior: 'smooth',
      });
    }
  };

  const handlePlayClick = () => {
    if (videoRef.current) {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleVideoPause = () => setIsPlaying(false);
  const handleVideoPlay = () => setIsPlaying(true);

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
          <button
            onClick={scrollToDemo}
            className="hidden sm:inline-flex text-sm font-medium text-slate-600 hover:text-trustBlue-900 transition-colors px-4 py-2 rounded-lg hover:bg-slate-50"
          >
            View Demo
          </button>
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
              Enhance your clinical diagnostic workflow with DermaRisk's explainable Two-Stage Intelligence Pipeline — accurate skin lesion classification with verifiable AI logic via Grad-CAM &amp; LIME.
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
              <button
                onClick={scrollToDemo}
                className="inline-flex items-center gap-2 px-7 py-4 rounded-2xl border-2 border-slate-200 text-slate-700 hover:border-trustBlue-200 hover:text-trustBlue-900 hover:bg-trustBlue-50/50 font-semibold transition-all duration-200 text-base"
              >
                <Sparkles className="w-4 h-4" />
                View Demo
              </button>
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

      {/* ── SECTION 1: Statistics ───────────────────────────── */}
      <section className="w-full bg-white border-y border-slate-100 py-14 px-6 lg:px-12">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-0">
            {STATS.map((stat, index) => (
              <div
                key={stat.label}
                className={`flex flex-col items-center justify-center text-center py-6 px-4 ${
                  index < STATS.length - 1
                    ? 'border-r border-slate-100'
                    : ''
                }`}
              >
                <span
                  className="text-4xl xl:text-5xl font-extrabold text-trustBlue-900 tracking-tight leading-none"
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  {stat.value}
                </span>
                <span className="mt-2.5 text-sm font-medium text-slate-400 uppercase tracking-widest">
                  {stat.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION: Demo Video ─────────────────────────────── */}
      <section
        ref={demoRef}
        id="demo"
        className="w-full py-20 px-6 lg:px-12"
        style={{
          background: 'linear-gradient(180deg, #f8fafc 0%, #eef2f7 50%, #f8fafc 100%)',
        }}
      >
        <div className="max-w-5xl mx-auto">

          {/* Section heading */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-trustBlue-50 border border-trustBlue-100 text-trustBlue-700 text-sm font-semibold mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-trustBlue-500" />
              Product Demo
            </div>
            <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight">
              See DermaRisk in Action
            </h2>
            <p className="mt-4 text-slate-500 text-lg max-w-2xl mx-auto leading-relaxed">
              Watch how our AI-powered clinical decision support system analyzes skin lesions with explainable insights in real time.
            </p>
          </div>

          {/* Video card */}
          <div
            className="relative rounded-[24px] overflow-hidden"
            style={{
              boxShadow: '0 32px 80px rgba(26,54,93,0.18), 0 8px 24px rgba(26,54,93,0.10)',
              border: '1.5px solid rgba(26,54,93,0.08)',
              transition: 'box-shadow 0.3s ease, transform 0.3s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 40px 100px rgba(26,54,93,0.28), 0 0 0 4px rgba(26,54,93,0.06), 0 8px 32px rgba(26,54,93,0.14)';
              e.currentTarget.style.transform = 'translateY(-4px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 32px 80px rgba(26,54,93,0.18), 0 8px 24px rgba(26,54,93,0.10)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            {/* 16:9 aspect ratio wrapper */}
            <div style={{ position: 'relative', paddingTop: '56.25%', background: '#020d1a' }}>
              <video
                ref={videoRef}
                src="/demo.mov"
                controls
                playsInline
                preload="metadata"
                onPlay={handleVideoPlay}
                onPause={handleVideoPause}
                onEnded={handleVideoPause}
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                }}
              />

              {/* Play overlay — hidden when playing */}
              {!isPlaying && (
                <button
                  onClick={handlePlayClick}
                  aria-label="Play demo video"
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'linear-gradient(135deg, rgba(2,13,26,0.55) 0%, rgba(10,36,64,0.45) 100%)',
                    cursor: 'pointer',
                    zIndex: 10,
                    border: 'none',
                    backdropFilter: 'blur(2px)',
                    transition: 'background 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(2,13,26,0.70) 0%, rgba(10,36,64,0.60) 100%)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(2,13,26,0.55) 0%, rgba(10,36,64,0.45) 100%)';
                  }}
                >
                  {/* Glow ring behind play button */}
                  <div
                    style={{
                      position: 'absolute',
                      width: '100px',
                      height: '100px',
                      borderRadius: '50%',
                      background: 'rgba(59,130,246,0.25)',
                      filter: 'blur(20px)',
                      animation: 'pulse 2s ease-in-out infinite',
                    }}
                  />
                  {/* Play button circle */}
                  <div
                    style={{
                      position: 'relative',
                      width: '76px',
                      height: '76px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #1a365d 0%, #2b6cb0 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 8px 32px rgba(26,54,93,0.5), 0 2px 8px rgba(0,0,0,0.4)',
                      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                    }}
                  >
                    <Play
                      style={{
                        width: '28px',
                        height: '28px',
                        color: '#ffffff',
                        marginLeft: '4px',
                        filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))',
                      }}
                      fill="currentColor"
                    />
                  </div>
                  {/* Label below play button */}
                  <span
                    style={{
                      position: 'absolute',
                      bottom: '28px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      color: 'rgba(255,255,255,0.85)',
                      fontSize: '13px',
                      fontWeight: '600',
                      letterSpacing: '0.05em',
                      whiteSpace: 'nowrap',
                      textShadow: '0 1px 4px rgba(0,0,0,0.5)',
                    }}
                  >
                    Watch Demo
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* Subtle caption below video */}
          <p className="text-center text-slate-400 text-sm mt-6">
            Full walkthrough · No sign-up required · 2 min
          </p>
        </div>
      </section>

      {/* ── SECTION 2: Interactive Features ────────────────── */}
      <section className="w-full bg-gradient-to-b from-slate-50 to-white py-24 px-6 lg:px-12">
        <div className="max-w-[1300px] mx-auto">

          {/* Section heading */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-trustBlue-50 border border-trustBlue-100 text-trustBlue-700 text-sm font-semibold mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-trustBlue-500" />
              Platform Capabilities
            </div>
            <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight">
              Built for Clinical Excellence
            </h2>
            <p className="mt-4 text-slate-500 text-lg max-w-xl mx-auto leading-relaxed">
              Every feature is designed to augment clinician decision-making with transparent, explainable AI.
            </p>
          </div>

          {/* Main layout: left cards + right image */}
          <div className="flex flex-col lg:flex-row gap-8 items-stretch">

            {/* ── LEFT: Feature cards ─────────────────────── */}
            <div className="flex flex-col gap-4 lg:w-[42%]">
              {FEATURES.map((feature, index) => {
                const Icon = feature.icon;
                const isActive = activeFeature === index;
                return (
                  <div
                    key={feature.id}
                    onMouseEnter={() => setActiveFeature(index)}
                    className="group relative rounded-[20px] px-6 py-5 cursor-pointer select-none overflow-hidden"
                    style={{
                      background: isActive
                        ? 'linear-gradient(135deg, #f0f5fa 0%, #e8f0f9 100%)'
                        : '#ffffff',
                      border: isActive
                        ? '1.5px solid #c5d7eb'
                        : '1.5px solid #f1f5f9',
                      boxShadow: isActive
                        ? '0 8px 32px rgba(26,54,93,0.10), 0 2px 8px rgba(26,54,93,0.06)'
                        : '0 2px 8px rgba(0,0,0,0.04)',
                      transform: isActive ? 'translateY(-2px)' : 'translateY(0)',
                      transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                  >
                    {/* Active left accent bar */}
                    <div
                      className={`absolute left-0 top-0 h-full w-1 rounded-l-[20px] bg-gradient-to-b ${feature.accent}`}
                      style={{
                        opacity: isActive ? 1 : 0,
                        transition: 'opacity 0.3s ease',
                      }}
                    />

                    <div className="flex items-start gap-4 pl-1">
                      {/* Icon */}
                      <div
                        className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${feature.iconBg} ${feature.iconColor}`}
                        style={{
                          transition: 'transform 0.3s ease',
                          transform: isActive ? 'scale(1.1)' : 'scale(1)',
                        }}
                      >
                        <Icon className="w-5 h-5" strokeWidth={2} />
                      </div>

                      {/* Text */}
                      <div className="flex-1 min-w-0">
                        <h3
                          className="font-bold text-slate-900 leading-tight"
                          style={{
                            fontSize: isActive ? '15px' : '15.5px',
                            transition: 'font-size 0.3s ease',
                          }}
                        >
                          {feature.title}
                        </h3>
                        <p
                          className="text-slate-500 text-sm leading-relaxed mt-1.5"
                          style={{
                            opacity: isActive ? 1 : 0.6,
                            maxHeight: isActive ? '80px' : '0px',
                            overflow: 'hidden',
                            transition: 'opacity 0.35s ease, max-height 0.35s cubic-bezier(0.4,0,0.2,1)',
                          }}
                        >
                          {feature.description}
                        </p>
                      </div>

                      {/* Active indicator dot */}
                      <div
                        className="shrink-0 w-2 h-2 rounded-full bg-trustBlue-500 mt-1.5"
                        style={{
                          opacity: isActive ? 1 : 0,
                          transition: 'opacity 0.3s ease',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── RIGHT: Image panel ──────────────────────── */}
            <div className="lg:flex-1 relative rounded-[28px] overflow-hidden bg-slate-100 shadow-2xl"
              style={{ minHeight: '460px' }}>

              {/* Subtle inner border */}
              <div className="absolute inset-0 rounded-[28px] border border-slate-200 pointer-events-none z-10" />

              {/* Image stack with fade transitions */}
              {FEATURES.map((feature, index) => (
                <div
                  key={feature.id}
                  className="absolute inset-0"
                  style={{
                    opacity: activeFeature === index ? 1 : 0,
                    transform: activeFeature === index ? 'scale(1)' : 'scale(0.98)',
                    transition: 'opacity 0.45s ease-in-out, transform 0.45s ease-in-out',
                    zIndex: activeFeature === index ? 2 : 1,
                  }}
                >
                  <img
                    src={feature.image}
                    alt={feature.title}
                    className="w-full h-full object-cover"
                    draggable={false}
                  />
                  {/* Gradient overlay at bottom for label */}
                  <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-slate-900/60 to-transparent" />
                  {/* Feature label chip */}
                  <div className="absolute bottom-5 left-5 flex items-center gap-2.5">
                    <div className={`w-2 h-2 rounded-full bg-gradient-to-br ${feature.accent}`} />
                    <span className="text-white text-sm font-semibold tracking-wide drop-shadow">
                      {feature.title}
                    </span>
                  </div>
                </div>
              ))}

              {/* Feature number indicator (top-right) */}
              <div className="absolute top-5 right-5 z-20 bg-white/90 backdrop-blur-sm rounded-xl px-3 py-1.5 shadow-md border border-slate-100">
                <span className="text-xs font-bold text-slate-500">
                  {activeFeature + 1} / {FEATURES.length}
                </span>
              </div>
            </div>

          </div>

          {/* Navigation dots for mobile feature indicator */}
          <div className="flex justify-center gap-2 mt-8 lg:hidden">
            {FEATURES.map((_, index) => (
              <button
                key={index}
                onClick={() => setActiveFeature(index)}
                className="rounded-full transition-all duration-300"
                style={{
                  width: activeFeature === index ? '24px' : '8px',
                  height: '8px',
                  background: activeFeature === index ? '#1a365d' : '#cbd5e1',
                }}
                aria-label={`View feature ${index + 1}`}
              />
            ))}
          </div>

        </div>
      </section>

    </div>
  );
}
