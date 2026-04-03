import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../utils/api';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { PlusCircle, History, Activity, AlertTriangle, ShieldCheck, PieChart } from 'lucide-react';

export function Dashboard() {
  const [stats, setStats] = useState({ total: 0, high: 0, medium: 0, low: 0 });
  const [recentCases, setRecentCases] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const res = await api.get('/history?limit=5');
        const cases = res.data.predictions || [];
        setRecentCases(cases);
        
        // Mocking Risk Distribution for dashboard since backend doesn't aggregate it, 
        // we could compute from a larger history dump, but let's calculate from all we can fetch easily 
        // or just use recent cases + mock if history is small for demo visual.
        const allRes = await api.get('/history?limit=100');
        const allCases = allRes.data.predictions || [];
        
        let high = 0, medium = 0, low = 0;
        allCases.forEach(c => {
          if (c.risk_level === 'high') high++;
          else if (c.risk_level === 'medium') medium++;
          else low++;
        });
        
        setStats({ total: allCases.length, high, medium, low });
      } catch (err) {
        console.error("Dashboard data fetch error", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-trustBlue-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Clinical Hub</h1>
          <p className="text-slate-500 mt-1">Overview of recent screening cases and risk distributions.</p>
        </div>
        <div className="flex gap-3">
          <Link to="/dashboard/history">
            <Button variant="outline" className="w-full md:w-auto">
              <History className="w-4 h-4 mr-2" />
              Case History
            </Button>
          </Link>
          <Link to="/dashboard/new">
            <Button className="w-full md:w-auto">
              <PlusCircle className="w-4 h-4 mr-2" />
              New Screening
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-trustBlue-500">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-500">Total Cases</p>
                <h3 className="text-3xl font-bold text-slate-800 mt-1">{stats.total}</h3>
              </div>
              <div className="p-3 bg-trustBlue-50 rounded-lg text-trustBlue-600">
                <Activity className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-softRed-500">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-500">High Risk</p>
                <h3 className="text-3xl font-bold text-slate-800 mt-1">{stats.high}</h3>
              </div>
              <div className="p-3 bg-softRed-50 rounded-lg text-softRed-600">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-statusAmber-500">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-500">Medium Risk</p>
                <h3 className="text-3xl font-bold text-slate-800 mt-1">{stats.medium}</h3>
              </div>
              <div className="p-3 bg-statusAmber-50 rounded-lg text-statusAmber-600">
                <PieChart className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-sageGreen-500">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-500">Low Risk</p>
                <h3 className="text-3xl font-bold text-slate-800 mt-1">{stats.low}</h3>
              </div>
              <div className="p-3 bg-sageGreen-50 rounded-lg text-sageGreen-600">
                <ShieldCheck className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Recent Screenings</CardTitle>
            </CardHeader>
            <CardContent>
              {recentCases.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-sm">No cases found. Initiate a new screening.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 font-medium">
                        <th className="pb-3 pr-4">Case Date</th>
                        <th className="pb-3 px-4">Lesion Type</th>
                        <th className="pb-3 px-4">Risk Stratification</th>
                        <th className="pb-3 pl-4">Confidence</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {recentCases.map(c => (
                        <tr key={c.prediction_id} className="hover:bg-slate-50/50">
                          <td className="py-4 pr-4 text-slate-600">
                            {new Date(c.timestamp).toLocaleDateString()}
                          </td>
                          <td className="py-4 px-4 font-medium text-slate-900">{c.full_name || 'Unknown'}</td>
                          <td className="py-4 px-4">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold
                              ${c.risk_level === 'high' ? 'bg-softRed-100 text-softRed-700' : ''}
                              ${c.risk_level === 'medium' ? 'bg-statusAmber-100 text-statusAmber-700' : ''}
                              ${c.risk_level === 'low' ? 'bg-sageGreen-100 text-sageGreen-700' : ''}
                              ${!['high', 'medium', 'low'].includes(c.risk_level) ? 'bg-slate-100 text-slate-600' : ''}
                            `}>
                              {c.risk_level?.toUpperCase()}
                            </span>
                          </td>
                          <td className="py-4 pl-4 text-slate-600">
                            {(c.confidence * 100).toFixed(1)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        <div className="lg:col-span-1">
          <Card className="h-full bg-trustBlue-900 text-white border-0 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full mix-blend-overlay -mr-10 -mt-10"></div>
            <CardHeader className="relative z-10 pb-0 pt-8 px-8">
              <CardTitle className="text-white text-xl">Quick Action</CardTitle>
            </CardHeader>
            <CardContent className="relative z-10 p-8 flex flex-col justify-between h-[calc(100%-80px)]">
              <div className="space-y-4">
                <p className="text-trustBlue-200">
                  Ready to analyze a new skin lesion? The Two-Stage Intelligence Pipeline is ready.
                </p>
                <ul className="text-trustBlue-100 text-sm space-y-2 mt-4 ml-2 border-l-2 border-trustBlue-700 pl-4">
                  <li>• High-resolution lesion image required</li>
                  <li>• Grad-CAM explainability powered</li>
                  <li>• Instant clinical decision support</li>
                </ul>
              </div>
              <Link to="/dashboard/new" className="mt-8">
                <Button className="w-full bg-white text-trustBlue-900 hover:bg-slate-100 group border-0 font-bold">
                  Start Workflow <PlusCircle className="ml-2 w-4 h-4 group-hover:rotate-90 transition-transform" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
