import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Activity, ShieldCheck, Microscope } from 'lucide-react';

export function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b border-slate-100 px-6 py-4 flex items-center justify-between z-10 bg-white/80 backdrop-blur-md sticky top-0">
        <div className="font-bold tracking-wide text-2xl flex items-center gap-2 text-trustBlue-900">
          <div className="w-10 h-10 rounded-xl bg-trustBlue-900 text-white flex items-center justify-center font-extrabold shadow-sm">
            D
          </div>
          DermaRisk
        </div>
        <div className="flex items-center gap-4">
          <Link to="/login">
            <Button variant="ghost">View Demo</Button>
          </Link>
          <Link to="/login">
            <Button variant="primary" className="ml-2 font-semibold">Secure Clinician Login</Button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-6 py-20 lg:py-32 grid md:grid-cols-2 gap-12 items-center">
        <div className="space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-trustBlue-50 text-trustBlue-900 font-medium text-sm border border-trustBlue-100">
            <Activity className="w-4 h-4" />
            Clinical Decision Support System
          </div>
          
          <h1 className="text-5xl lg:text-6xl font-extrabold text-slate-900 leading-tight tracking-tight">
            AI-Powered Dermatology <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-trustBlue-600 to-trustBlue-900">Risk Stratification</span>
          </h1>
          
          <p className="text-lg text-slate-600 max-w-lg leading-relaxed">
            Enhance your clinical diagnostic workflow with DermaRisk's explainable Two-Stage Intelligence Pipeline. Accurate classification with clear, verifiable logic via Grad-CAM heatmaps.
          </p>
          
          <div className="pt-4 flex items-center gap-4">
            <Link to="/login">
              <Button size="lg" className="w-full sm:w-auto h-14 px-8 text-base">Access Platform <ShieldCheck className="ml-2 w-5 h-5" /></Button>
            </Link>
          </div>
        </div>
        
        {/* Abstract/Minimal Visual representation */}
        <div className="relative flex justify-center mt-10 md:mt-0">
          <div className="absolute inset-0 bg-gradient-to-tr from-trustBlue-100 to-white transform rotate-3 rounded-[3rem] shadow-xl"></div>
          <div className="relative bg-white p-8 rounded-[3rem] shadow-2xl border border-slate-100 -rotate-2 w-full max-w-md ml-auto">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-6">
              <div className="w-3 h-3 rounded-full bg-slate-200"></div>
              <div className="w-3 h-3 rounded-full bg-slate-200"></div>
              <div className="w-3 h-3 rounded-full bg-slate-200"></div>
            </div>
            
            <div className="space-y-6">
              <div className="h-48 rounded-xl bg-slate-100 flex items-center justify-center border-2 border-dashed border-slate-200">
                <Microscope className="w-10 h-10 text-slate-300" />
              </div>
              <div className="flex justify-between items-center">
                <div className="w-1/2 h-4 bg-slate-100 rounded-md"></div>
                <div className="w-1/4 h-6 rounded-full bg-softRed-500/10 border border-softRed-500/20"></div>
              </div>
              <div className="w-full h-24 rounded-lg bg-gradient-to-r from-trustBlue-50/50 to-transparent p-4 border border-trustBlue-100/50">
                <div className="w-2/3 h-3 bg-slate-200 rounded mb-3"></div>
                <div className="w-1/2 h-3 bg-slate-200 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
