import React, { useState } from 'react';
import { Star, Trash2, X, Search, Filter, Calendar, Download, FileText, FileSpreadsheet, ChevronDown } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
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
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);

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

  // Export fonksiyonları
  const generateChartDataURL = (chartData: number[], labels: string[], title: string): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 200;
      const ctx = canvas.getContext('2d')!;
      
      // Chart arka planı
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Chart alanı
      const chartWidth = 300;
      const chartHeight = 120;
      const chartX = 60;
      const chartY = 40;
      
      // Başlık
      ctx.fillStyle = '#1f2937';
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(title, canvas.width / 2, 20);
      
      // Y ekseni (değerler)
      const maxValue = Math.max(...chartData, 1);
      const yScale = chartHeight / maxValue;
      
      // Grid çizgileri
      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = 1;
      
      // Y ekseni grid çizgileri
      for (let i = 0; i <= 4; i++) {
        const y = chartY + (chartHeight / 4) * i;
        ctx.beginPath();
        ctx.moveTo(chartX, y);
        ctx.lineTo(chartX + chartWidth, y);
        ctx.stroke();
        
        // Y ekseni değerleri
        ctx.fillStyle = '#6b7280';
        ctx.font = '10px Arial';
        ctx.textAlign = 'right';
        const value = Math.round(maxValue - (maxValue / 4) * i);
        ctx.fillText(value.toString(), chartX - 5, y + 3);
      }
      
      // X ekseni grid çizgileri ve labellar
      const barWidth = chartWidth / chartData.length;
      for (let i = 0; i < chartData.length; i++) {
        const x = chartX + (barWidth * i) + barWidth / 2;
        
        // Vertical grid line
        ctx.strokeStyle = '#e5e7eb';
        ctx.beginPath();
        ctx.moveTo(x, chartY);
        ctx.lineTo(x, chartY + chartHeight);
        ctx.stroke();
        
        // X ekseni labelları
        ctx.fillStyle = '#6b7280';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(labels[i], x, chartY + chartHeight + 15);
      }
      
      // Bar chart çizimi
      ctx.fillStyle = '#3b82f6';
      for (let i = 0; i < chartData.length; i++) {
        const barHeight = chartData[i] * yScale;
        const x = chartX + (barWidth * i) + barWidth * 0.2;
        const y = chartY + chartHeight - barHeight;
        const width = barWidth * 0.6;
        
        ctx.fillRect(x, y, width, barHeight);
        
        // Değer gösterimi
        ctx.fillStyle = '#1f2937';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(
          chartData[i].toString(),
          x + width / 2,
          y - 5
        );
        ctx.fillStyle = '#3b82f6';
      }
      
      // Chart çerçevesi
      ctx.strokeStyle = '#d1d5db';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.rect(chartX, chartY, chartWidth, chartHeight);
      ctx.stroke();
      
      resolve(canvas.toDataURL('image/png'));
    });
  };

  const exportToPDF = async () => {
    try {
      // PDF oluştur
      const doc = new jsPDF();
      
      // Başlık ekle
      doc.setFontSize(20);
      doc.setTextColor(40, 40, 40);
      doc.text('Anomaly Logs Report', 14, 22);
      
      // Rapor tarihi ekle
      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      const reportDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      doc.text(`Generated on: ${reportDate}`, 14, 32);
      
      // Özet bilgi ekle
      doc.setTextColor(40, 40, 40);
      doc.text(`Total Records: ${filteredLogs.length}`, 14, 42);
      
      // Tablo verisini hazırla
      const tableData = filteredLogs.map((log, index) => [
        log.anomalyNo.toString(),
        log.streamerName,
        log.sinceThen,
        log.date,
        log.uuid,
        starred[index] ? 'Yes' : 'No'
      ]);
      
      // Tablo başlıkları
      const tableHeaders = [
        'Anomaly No',
        'Streamer Name', 
        'Since Then',
        'Date',
        'UUID',
        'Starred'
      ];
      
      // AutoTable ile tablo oluştur
      autoTable(doc, {
        head: [tableHeaders],
        body: tableData,
        startY: 50,
        theme: 'grid',
        styles: {
          fontSize: 10,
          cellPadding: 3,
        },
        headStyles: {
          fillColor: [59, 130, 246], // Blue-500
          textColor: 255,
          fontStyle: 'bold',
        },
        alternateRowStyles: {
          fillColor: [249, 250, 251], // Gray-50
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 25 }, // Anomaly No
          1: { cellWidth: 35 }, // Streamer Name
          2: { cellWidth: 25 }, // Since Then
          3: { cellWidth: 30 }, // Date
          4: { cellWidth: 40 }, // UUID
          5: { halign: 'center', cellWidth: 20 }, // Starred
        },
        margin: { top: 50, left: 14, right: 14 },
      });
      
      // Tablo sonrası Y pozisyonu al
      const finalY = (doc as any).lastAutoTable.finalY || 120;
      
      // Charts section başlığı
      doc.setFontSize(16);
      doc.setTextColor(40, 40, 40);
      doc.text('Anomaly Statistics', 14, finalY + 20);
      
      // Örnek chart verileri (gerçek verilerin simülasyonu)
      const chartData = {
        lastDay: [12, 8, 15, 10, 7, 9, 14], // Son 7 günün saatlik verileri (örnek)
        lastWeek: [45, 67, 32, 89, 56, 78, 23], // Son 7 günün günlük verileri
        lastMonth: [156, 203, 178, 245, 189, 234, 167, 289, 178, 145, 234, 198, 
                   234, 189, 167, 198, 145, 234, 189, 178, 203, 156, 289, 234, 
                   167, 189, 234, 178, 203, 156], // Son 30 günün verileri
        allTime: [1234, 1567, 1890, 2234, 2678, 3123, 2890, 3456, 3234, 2890, 3567, 3234] // Son 12 ayın verileri
      };
      
      const chartLabels = {
        lastDay: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '24:00'],
        lastWeek: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        lastMonth: Array.from({length: 30}, (_, i) => `${i + 1}`),
        allTime: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      };
      
      let currentY = finalY + 35;
      
      // Son 24 saat grafiği
      const dayChartURL = await generateChartDataURL(
        chartData.lastDay, 
        chartLabels.lastDay, 
        'Anomalies - Last 24 Hours'
      );
      doc.addImage(dayChartURL, 'PNG', 14, currentY, 90, 45);
      
      // Son hafta grafiği
      const weekChartURL = await generateChartDataURL(
        chartData.lastWeek, 
        chartLabels.lastWeek, 
        'Anomalies - Last Week'
      );
      doc.addImage(weekChartURL, 'PNG', 110, currentY, 90, 45);
      
      currentY += 55;
      
      // Yeni sayfa gerekiyorsa ekle
      if (currentY > 250) {
        doc.addPage();
        currentY = 20;
      }
      
      // Son ay grafiği
      const monthChartURL = await generateChartDataURL(
        chartData.lastMonth.slice(0, 10), // İlk 10 günü göster (yer sıkıntısı için)
        chartLabels.lastMonth.slice(0, 10), 
        'Anomalies - Last 10 Days'
      );
      doc.addImage(monthChartURL, 'PNG', 14, currentY, 90, 45);
      
      // Tüm zamanlar grafiği
      const allTimeChartURL = await generateChartDataURL(
        chartData.allTime, 
        chartLabels.allTime, 
        'Anomalies - Last 12 Months'
      );
      doc.addImage(allTimeChartURL, 'PNG', 110, currentY, 90, 45);
      
      // Footer ekle
      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(
          `Page ${i} of ${pageCount}`,
          doc.internal.pageSize.width - 30,
          doc.internal.pageSize.height - 10
        );
        doc.text(
          'Virtue Admin Dashboard',
          14,
          doc.internal.pageSize.height - 10
        );
      }
      
      // PDF'i indir
      const fileName = `anomaly-logs-${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      
      console.log('PDF exported successfully with charts:', fileName);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Failed to export PDF. Please try again.');
    }
    
    setExportDropdownOpen(false);
  };

  const exportToExcel = () => {
    try {
      // CSV formatında veri hazırla (Excel tarafından açılabilir)
      const headers = ['Anomaly No', 'Streamer Name', 'Since Then', 'Date', 'UUID', 'Starred'];
      const csvData = filteredLogs.map((log, index) => [
        log.anomalyNo,
        log.streamerName,
        log.sinceThen,
        log.date,
        log.uuid,
        starred[index] ? 'Yes' : 'No'
      ]);
      
      // CSV içeriğini oluştur
      const csvContent = [
        headers.join(','),
        ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');
      
      // BOM (Byte Order Mark) ekle UTF-8 encoding için
      const BOM = '\uFEFF';
      const csvWithBOM = BOM + csvContent;
      
      // Blob oluştur ve indir
      const blob = new Blob([csvWithBOM], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      const fileName = `anomaly-logs-${new Date().toISOString().split('T')[0]}.csv`;
      link.setAttribute('download', fileName);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log('Excel file exported successfully:', fileName);
    } catch (error) {
      console.error('Error exporting Excel:', error);
      alert('Failed to export Excel file. Please try again.');
    }
    
    setExportDropdownOpen(false);
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

        {/* Export Dropdown */}
        <div className="relative">
          {/* Dropdown backdrop */}
          {exportDropdownOpen && (
            <div 
              className="fixed inset-0 z-10" 
              onClick={() => setExportDropdownOpen(false)}
            />
          )}
          
          <button 
            onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
          >
            <Download className="h-4 w-4" />
            Export
            <ChevronDown className={`h-4 w-4 transition-transform ${exportDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {exportDropdownOpen && (
            <div className={`absolute right-0 top-full mt-2 w-48 ${
              theme === 'dark' ? 'bg-slate-800' : 'bg-white'
            } border ${
              theme === 'dark' ? 'border-slate-700' : 'border-gray-200'
            } rounded-lg shadow-xl p-2 z-50`}>
              <button
                onClick={exportToPDF}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm ${
                  theme === 'dark' 
                    ? 'text-white hover:bg-slate-700' 
                    : 'text-gray-900 hover:bg-gray-100'
                }`}
              >
                <FileText className="h-4 w-4" />
                Export as PDF
              </button>
              <button
                onClick={exportToExcel}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm ${
                  theme === 'dark' 
                    ? 'text-white hover:bg-slate-700' 
                    : 'text-gray-900 hover:bg-gray-100'
                }`}
              >
                <FileSpreadsheet className="h-4 w-4" />
                Export as Excel
              </button>
            </div>
          )}
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
