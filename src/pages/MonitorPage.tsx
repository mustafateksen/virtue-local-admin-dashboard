import React, { useState } from 'react';
import { CircleAlert, CircleCheck, Cctv, X, Play, Square } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  Tooltip,
  CategoryScale,
} from 'chart.js';
import cam1image from '../assets/cam1.png';

ChartJS.register(LineElement, PointElement, LinearScale, Tooltip, CategoryScale);

export const MonitorPage: React.FC = () => {
  const { theme } = useTheme();
  const [learning, setLearning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalImg, setModalImg] = useState<string | null>(null);

  const handleLearningClick = () => {
    setLoading(true);
    setTimeout(() => {
      setLearning((prev) => !prev);
      setLoading(false);
    }, 2000);
  };

  const handleStopAllClick = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
    }, 2000);
  };

  const closeModal = () => {
    setModalOpen(false);
    setModalImg(null);
  };

  const cameras = [
    {
      id: 1,
      name: 'Camera1 - Empty Package',
      status: 'anomaly',
      data: [2, 19, 10, 9, 3, 20, 16, 5, 18, 22],
      overlayColor: 'bg-red-600',
      statusBg: theme === 'dark' ? 'bg-red-950' : 'bg-red-100',
      statusText: theme === 'dark' ? 'text-red-400' : 'text-red-600',
    },
    {
      id: 2,
      name: 'Camera2 - Seal Check',
      status: 'analyzing',
      data: [8, 15, 13, 20, 11, 18, 14, 19, 17, 21],
      overlayColor: 'bg-green-600',
      statusBg: theme === 'dark' ? 'bg-green-950' : 'bg-green-100',
      statusText: theme === 'dark' ? 'text-green-400' : 'text-green-600',
    },
  ];

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={closeModal}
        >
          <div
            className="relative"
            onClick={e => e.stopPropagation()}
          >
            <button
              className="absolute -top-4 -right-4 bg-background text-foreground rounded-full p-2 hover:bg-accent transition-colors shadow-lg z-10"
              onClick={closeModal}
            >
              <X size={20} />
            </button>
            <img
              src={modalImg ?? ''}
              alt="Camera Feed"
              className="max-h-[80vh] max-w-[90vw] rounded-xl shadow-2xl"
            />
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">
            System Monitor
          </h1>
          <p className="mt-2 lg:mt-3 text-sm sm:text-base lg:text-lg text-muted-foreground">
            Real-time camera streams and anomaly detection
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            className={`
              flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 min-w-[140px] h-10 border
              ${learning
                ? `${theme === 'dark' ? 'bg-red-950 text-red-400 border-red-800 hover:bg-red-900' : 'bg-red-100 text-red-600 border-red-200 hover:bg-red-50'}`
                : 'bg-primary text-primary-foreground border-primary hover:bg-primary/90'
              }
            `}
            onClick={handleLearningClick}
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full border-2 border-t-transparent border-current w-4 h-4" />
                Loading...
              </>
            ) : learning ? (
              <>
                <Square size={16} />
                Stop Learning
              </>
            ) : (
              <>
                <Play size={16} />
                Start Learning
              </>
            )}
          </button>
          
          <button
            className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all duration-300 min-w-[140px] h-10 ${theme === 'dark' ? 'bg-red-950 text-red-400 border-red-800 hover:bg-red-900' : 'bg-red-100 text-red-600 border-red-200 hover:bg-red-50'}`}
            onClick={handleStopAllClick}
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full border-2 border-t-transparent border-current w-4 h-4" />
                Loading...
              </>
            ) : (
              <>
                <Square size={16} />
                Stop All Actions
              </>
            )}
          </button>
        </div>
      </div>

      {/* Camera Grid */}
      <div className="flex flex-wrap justify-start gap-6 lg:gap-8">
        {cameras.map((camera) => (
          <div key={camera.id} className="flex flex-col space-y-4 w-full sm:w-[calc(50%-0.75rem)] lg:w-[calc(33.333%-1rem)] xl:w-[calc(25%-1.5rem)]">
            {/* Camera Feed */}
            <div className="relative">
              <img
                src={cam1image}
                alt={camera.name}
                className="w-full aspect-square object-cover rounded-xl cursor-pointer shadow-lg"
                onClick={() => { 
                  setModalImg(cam1image); 
                  setModalOpen(true); 
                }}
              />
              <div className={`absolute inset-0 rounded-xl ${camera.overlayColor} opacity-40 pointer-events-none`} />
              
              {/* Live indicator */}
              <div className="absolute top-3 left-3 bg-red-600 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                LIVE
              </div>
            </div>

            {/* Camera Info */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Cctv className="text-muted-foreground flex-shrink-0" size={18} />
                <span className="font-medium text-foreground text-base truncate">{camera.name}</span>
              </div>
              <span className={`${camera.statusBg} ${camera.statusText} rounded-lg flex items-center justify-center p-2 gap-2 text-sm font-medium transition-all duration-300 ease-in-out hover:scale-105 cursor-pointer`}>
                {camera.status === 'anomaly' ? <CircleAlert size={14} /> : <CircleCheck size={14} />}
                {camera.status === 'anomaly' ? 'Anomaly' : 'Analyzing'}
              </span>
            </div>

            {/* Chart */}
            <div className="w-full h-32 bg-card border border-border rounded-lg p-3">
              <Line
                data={{
                  labels: Array.from({ length: 10 }, (_, i) => `T${i + 1}`),
                  datasets: [
                    {
                      label: 'Activity Level',
                      data: camera.data,
                      borderColor: 'hsl(var(--primary))',
                      backgroundColor: 'hsl(var(--primary) / 0.2)',
                      tension: 0.4,
                      pointRadius: 2.5,
                      pointHoverRadius: 5,
                      fill: true,
                      pointBackgroundColor: 'hsl(var(--primary))',
                      pointBorderColor: 'hsl(var(--background))',
                      pointBorderWidth: 1.5,
                    },
                  ],
                }}
                options={{
                  plugins: {
                    legend: { display: false },
                    tooltip: { 
                      enabled: true,
                      backgroundColor: 'hsl(var(--popover))',
                      titleColor: 'hsl(var(--popover-foreground))',
                      bodyColor: 'hsl(var(--popover-foreground))',
                      borderColor: 'hsl(var(--border))',
                      borderWidth: 1,
                      titleFont: { size: 11 },
                      bodyFont: { size: 11 },
                    },
                  },
                  scales: {
                    x: { display: false },
                    y: { display: false },
                  },
                  elements: {
                    line: { borderWidth: 2.5 },
                  },
                  responsive: true,
                  maintainAspectRatio: false,
                  interaction: {
                    intersect: false,
                    mode: 'index',
                  },
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card p-4 rounded-lg border border-border">
          <div className="text-2xl font-bold text-foreground">{cameras.length}</div>
          <div className="text-sm text-muted-foreground">Active Cameras</div>
        </div>
        <div className="bg-card p-4 rounded-lg border border-border">
          <div className="text-2xl font-bold text-red-600">
            {cameras.filter(c => c.status === 'anomaly').length}
          </div>
          <div className="text-sm text-muted-foreground">Anomalies Detected</div>
        </div>
        <div className="bg-card p-4 rounded-lg border border-border">
          <div className="text-2xl font-bold text-green-600">
            {cameras.filter(c => c.status === 'analyzing').length}
          </div>
          <div className="text-sm text-muted-foreground">Analyzing</div>
        </div>
        <div className="bg-card p-4 rounded-lg border border-border">
          <div className="text-2xl font-bold text-blue-600">
            {learning ? 'ON' : 'OFF'}
          </div>
          <div className="text-sm text-muted-foreground">Learning Mode</div>
        </div>
      </div>
    </div>
  );
};

export default MonitorPage;
