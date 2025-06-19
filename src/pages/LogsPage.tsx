import React, { useState } from 'react';
import { Star, Trash2, X, Search, Filter, Calendar } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import cam from "../assets/cam1.png";

interface AnomalyLog {
  anomalyNo: number;
  streamerName: string;
  sinceThen: string;
  date: string;
  uuid: string;
}

export const LogsPage: React.FC = () => {
  const { theme } = useTheme();
  
  // Örnek veri
  const [logs] = useState<AnomalyLog[]>([
    {
      anomalyNo: 1,
      streamerName: "RaspberryPi-001",
      sinceThen: "2 hours",
      date: "2024-06-10",
      uuid: "a1b2c3d4",
    },
    {
      anomalyNo: 2,
      streamerName: "RaspberryPi-002",
      sinceThen: "5 hours",
      date: "2024-06-09",
      uuid: "e5f6g7h8",
    },
    {
      anomalyNo: 3,
      streamerName: "RaspberryPi-003",
      sinceThen: "1 day",
      date: "2024-06-08",
      uuid: "i9j0k1l2",
    },
    {
      anomalyNo: 4,
      streamerName: "RaspberryPi-004",
      sinceThen: "3 hours",
      date: "2024-06-10",
      uuid: "m3n4o5p6",
    },
    {
      anomalyNo: 5,
      streamerName: "RaspberryPi-005",
      sinceThen: "6 hours",
      date: "2024-06-09",
      uuid: "q7r8s9t0",
    },
  ]);

  // State yönetimi
  const [starred, setStarred] = useState<boolean[]>(new Array(logs.length).fill(false));
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AnomalyLog | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const handleStarClick = (idx: number) => {
    setStarred(prev => {
      const updated = [...prev];
      updated[idx] = !updated[idx];
      return updated;
    });
  };

  const handleRowClick = (e: React.MouseEvent, log: AnomalyLog) => {
    // Sadece satırdaki butonlara tıklanmadıysa modal aç
    if ((e.target as HTMLElement).closest('button')) return;
    setSelectedLog(log);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedLog(null);
  };

  const handleDelete = (idx: number) => {
    // Silme işlemi burada yapılacak
    console.log(`Deleting log ${idx}`);
  };

  // Filtreleme
  const filteredLogs = logs.filter(log => 
    log.streamerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.uuid.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">
          Anomaly Logs
        </h1>
        <p className="mt-2 lg:mt-3 text-sm sm:text-base lg:text-lg text-muted-foreground">
          Anomalies that are captured can be viewed here
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <input
              type="text"
              placeholder="Search logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-foreground placeholder:text-muted-foreground"
            />
          </div>
          
          {/* Filter buttons */}
          <div className="flex gap-2">
            <button className="flex items-center gap-2 px-3 py-2 bg-muted hover:bg-muted/80 rounded-lg transition-colors text-sm font-medium">
              <Filter className="h-4 w-4" />
              Filter
            </button>
            <button className="flex items-center gap-2 px-3 py-2 bg-muted hover:bg-muted/80 rounded-lg transition-colors text-sm font-medium">
              <Calendar className="h-4 w-4" />
              Date Range
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card shadow rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Preview</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Anomaly No</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Device Name</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Since Then</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Date</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">UUID</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-foreground">Star</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredLogs.map((log, idx) => (
                <tr
                  key={log.uuid}
                  className="hover:bg-accent/50 cursor-pointer transition-colors"
                  onClick={(e) => handleRowClick(e, log)}
                >
                  <td className="px-4 py-3">
                    <img
                      src={cam}
                      alt="Preview"
                      className="w-12 h-12 object-cover rounded-lg border border-border"
                    />
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-foreground">
                    #{log.anomalyNo}
                  </td>
                  <td className="px-4 py-3 text-sm text-foreground">
                    {log.streamerName}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {log.sinceThen}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {log.date}
                  </td>
                  <td className="px-4 py-3 text-sm font-mono text-muted-foreground">
                    {log.uuid}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      className="p-1 hover:bg-accent rounded-md transition-colors"
                      title={starred[idx] ? "Unstar" : "Star"}
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        handleStarClick(idx); 
                      }}
                    >
                      <Star
                        className={`h-4 w-4 ${
                          starred[idx] 
                            ? "text-yellow-500 fill-yellow-500" 
                            : "text-muted-foreground hover:text-yellow-500"
                        }`}
                      />
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      className="p-1 hover:bg-destructive/10 rounded-md transition-colors text-destructive hover:text-destructive/80"
                      title="Delete"
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        handleDelete(idx); 
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty state */}
        {filteredLogs.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">No logs found matching your search.</p>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card p-4 rounded-lg border border-border">
          <div className="text-2xl font-bold text-foreground">{logs.length}</div>
          <div className="text-sm text-muted-foreground">Total Anomalies</div>
        </div>
        <div className="bg-card p-4 rounded-lg border border-border">
          <div className="text-2xl font-bold text-green-600">{starred.filter(Boolean).length}</div>
          <div className="text-sm text-muted-foreground">Starred</div>
        </div>
        <div className="bg-card p-4 rounded-lg border border-border">
          <div className="text-2xl font-bold text-blue-600">{logs.filter(log => log.sinceThen.includes('hour')).length}</div>
          <div className="text-sm text-muted-foreground">Recent (Today)</div>
        </div>
      </div>

      {/* Modal */}
      {modalOpen && selectedLog && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm p-4 ${
            theme === 'dark' ? 'bg-black/60' : 'bg-black/40'
          }`}
          onClick={handleCloseModal}
        >
          <div
            className="relative bg-card rounded-lg border border-border max-w-4xl max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  Anomaly #{selectedLog.anomalyNo}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {selectedLog.streamerName} • {selectedLog.date}
                </p>
              </div>
              <button
                className="p-2 hover:bg-accent rounded-md transition-colors cursor-pointer"
                onClick={handleCloseModal}
                title="Close"
              >
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
            
            {/* Modal Content */}
            <div className="p-4">
              <img
                src={cam}
                alt={`Anomaly ${selectedLog.anomalyNo}`}
                className="w-full h-auto max-h-[60vh] object-contain rounded-lg"
              />
              
              {/* Anomaly Details */}
              <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">UUID:</span>
                  <span className="ml-2 font-mono text-foreground">{selectedLog.uuid}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Detected:</span>
                  <span className="ml-2 text-foreground">{selectedLog.sinceThen} ago</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LogsPage;
