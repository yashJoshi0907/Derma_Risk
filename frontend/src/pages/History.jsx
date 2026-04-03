import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Search, History as HistoryIcon, Activity } from 'lucide-react';

export function History() {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await api.get('/history?limit=50');
        setCases(res.data.predictions || []);
      } catch (err) {
        console.error("Failed to fetch history", err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  const filteredCases = cases.filter(c => 
    (c.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.risk_level || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <HistoryIcon className="w-6 h-6 text-trustBlue-900" />
            Patient Case History
          </h1>
          <p className="text-slate-500 mt-1">Review longitudinal data of past skin lesion screenings.</p>
        </div>
      </div>

      <Card>
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4">
          <CardTitle className="text-lg">Screening Database</CardTitle>
          <div className="relative w-full max-w-xs">
            <Input 
              type="text" 
              placeholder="Search by diagnosis or risk..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-slate-500 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-trustBlue-900"></div>
            </div>
          ) : filteredCases.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <Activity className="mx-auto h-12 w-12 text-slate-300 mb-4" />
              <p className="text-lg font-medium text-slate-700">No cases found</p>
              <p className="max-w-md mx-auto mt-2">
                {searchQuery ? 'Adjust your search filters.' : 'Your screening database is empty. Initiate a new case to see history.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="py-4 px-6">Timestamp</th>
                    <th className="py-4 px-6">Case Summary (Prediction)</th>
                    <th className="py-4 px-6">Risk Protocol</th>
                    <th className="py-4 px-6">Confidence Score</th>
                    <th className="py-4 px-6">Record Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCases.map((c) => (
                    <tr key={c.prediction_id} className="hover:bg-trustBlue-50/30 transition-colors">
                      <td className="py-4 px-6 text-slate-600">
                        {new Date(c.timestamp).toLocaleString()}
                      </td>
                      <td className="py-4 px-6 font-medium text-slate-900">
                        {c.full_name || 'Unknown Diagnosis'}
                        <div className="text-xs font-normal mt-0.5 text-slate-500">
                          {c.metadata?.location || 'Unknown Location'} • {c.metadata?.age ? `${c.metadata.age}yo` : ''} {c.metadata?.sex || ''}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase
                          ${c.risk_level === 'high' ? 'bg-softRed-100 text-softRed-700' : ''}
                          ${c.risk_level === 'medium' ? 'bg-statusAmber-100 text-statusAmber-700' : ''}
                          ${c.risk_level === 'low' ? 'bg-sageGreen-100 text-sageGreen-700' : ''}
                          ${!['high', 'medium', 'low'].includes(c.risk_level) ? 'bg-slate-100 text-slate-600' : ''}
                        `}>
                          {c.risk_level} Risk
                        </span>
                      </td>
                      <td className="py-4 px-6 text-slate-600">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${c.confidence >= 0.8 ? 'bg-trustBlue-600' : 'bg-trustBlue-400'}`} 
                              style={{ width: `${c.confidence * 100}%` }}
                            ></div>
                          </div>
                          <span className="text-xs font-medium">
                            {(c.confidence * 100).toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <Button variant="outline" size="sm">View Report</Button>
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
  );
}
