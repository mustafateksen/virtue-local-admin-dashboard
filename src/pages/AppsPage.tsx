import React, { useState } from 'react';
import { Camera, Cpu, Settings, RefreshCw, Search, ChevronDown, Check } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface CameraFeature {
  id: string;
  name: string;
  description: string;
  color: string;
}

interface Camera {
  id: number;
  name: string;
  status: 'active' | 'inactive' | 'error';
  features: string[];
  resolution: string;
  fps: number;
  lastActivity: string;
}

interface ComputeUnit {
  id: number;
  name: string;
  ip: string;
  status: 'online' | 'offline';
  cameras: Camera[];
  uptime: string;
}

const availableFeatures: CameraFeature[] = [
  { id: 'anomaly_detection', name: 'Anomaly Detection', description: 'Detect anomalies in video feed', color: 'bg-red-100 text-red-800' },
  { id: 'ocr', name: 'OCR', description: 'Optical Character Recognition', color: 'bg-blue-100 text-blue-800' },
  { id: 'barcode_scanner', name: 'Barcode Scanner', description: 'Scan and decode barcodes', color: 'bg-green-100 text-green-800' },
  { id: 'motion_detection', name: 'Motion Detection', description: 'Detect motion in video feed', color: 'bg-yellow-100 text-yellow-800' },
  { id: 'face_recognition', name: 'Face Recognition', description: 'Recognize and identify faces', color: 'bg-purple-100 text-purple-800' },
  { id: 'object_tracking', name: 'Object Tracking', description: 'Track objects in video feed', color: 'bg-indigo-100 text-indigo-800' }
];

export const AppsPage: React.FC = () => {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Multi-select component
  const MultiSelectFeatures: React.FC<{
    cameraName: string;
    selectedFeatures: string[];
    onFeaturesChange: (features: string[]) => void;
  }> = ({ cameraName, selectedFeatures, onFeaturesChange }) => {
    const [open, setOpen] = useState(false);
    const { theme } = useTheme();

    const toggleFeature = (featureId: string) => {
      if (selectedFeatures.includes(featureId)) {
        onFeaturesChange(selectedFeatures.filter(f => f !== featureId));
      } else {
        onFeaturesChange([...selectedFeatures, featureId]);
      }
    };

    const selectedCount = selectedFeatures.length;
    const displayText = selectedCount === 0 
      ? 'No features selected' 
      : `${selectedCount} feature${selectedCount > 1 ? 's' : ''} selected`;

    // Tema tabanlı stiller
    const dropdownBg = theme === 'dark' ? 'bg-slate-800' : 'bg-white';
    const textColor = theme === 'dark' ? 'text-gray-100' : 'text-gray-900';
    const subtextColor = theme === 'dark' ? 'text-gray-400' : 'text-gray-600';
    const separatorColor = theme === 'dark' ? 'bg-gray-600' : 'bg-gray-200';
    const hoverBg = theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100';
    const hoverBorder = theme === 'dark' ? 'hover:border-gray-600' : 'hover:border-gray-200';
    const checkboxBorder = theme === 'dark' ? 'border-gray-600' : 'border-gray-300';
    const checkboxBg = theme === 'dark' ? 'bg-gray-800' : 'bg-white';
    const checkboxHover = theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-50';

    return (
      <div className="relative">
        {/* Backdrop */}
        {open && (
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setOpen(false)}
          />
        )}
        
        <button 
          onClick={() => setOpen(!open)}
          className="w-full flex items-center justify-between gap-2 px-6 py-3 text-base bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
        >
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            <span>Configure Features</span>
          </div>
          <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>

        {open && (
          <div className={`absolute left-0 bottom-full mb-2 w-80 ${dropdownBg} ${textColor} border border-border rounded-lg shadow-xl p-4 z-50`}>
            <div className="space-y-4">
              <div>
                <h4 className={`font-semibold ${textColor} text-base mb-2`}>
                  Configure Features for {cameraName}
                </h4>
                <p className={`text-sm ${subtextColor}`}>
                  {displayText}
                </p>
              </div>
              
              <div className={`h-px ${separatorColor}`} />
              
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {availableFeatures.map((feature) => (
                  <div
                    key={feature.id}
                    className={`flex items-start gap-3 p-3 ${hoverBg} rounded-lg cursor-pointer transition-colors border border-transparent ${hoverBorder}`}
                    onClick={() => toggleFeature(feature.id)}
                  >
                    <div className={`flex h-5 w-5 items-center justify-center rounded border-2 ${checkboxBorder} ${checkboxBg} ${checkboxHover} focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2`}>
                      {selectedFeatures.includes(feature.id) && (
                        <Check className="h-3 w-3 text-primary" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className={`font-medium ${textColor}`}>
                        {feature.name}
                      </div>
                      <div className={`text-sm ${subtextColor} mt-1`}>
                        {feature.description}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const [computeUnits, setComputeUnits] = useState<ComputeUnit[]>([
    {
      id: 1,
      name: 'Compute Unit #001',
      ip: '192.168.1.101',
      status: 'online',
      uptime: '2d 5h',
      cameras: [
        { id: 1, name: 'Camera 1', status: 'active', features: ['anomaly_detection', 'ocr'], resolution: '1920x1080', fps: 30, lastActivity: '2 min ago' },
        { id: 2, name: 'Camera 2', status: 'active', features: ['barcode_scanner'], resolution: '1920x1080', fps: 30, lastActivity: '5 min ago' },
        { id: 3, name: 'Camera 3', status: 'inactive', features: [], resolution: '1920x1080', fps: 30, lastActivity: '1h ago' },
        { id: 4, name: 'Camera 4', status: 'error', features: ['motion_detection'], resolution: '1920x1080', fps: 30, lastActivity: '30 min ago' }
      ]
    },
    {
      id: 2,
      name: 'Compute Unit #002',
      ip: '192.168.1.102',
      status: 'online',
      uptime: '1d 12h',
      cameras: [
        { id: 5, name: 'Camera 1', status: 'active', features: ['face_recognition', 'object_tracking'], resolution: '1920x1080', fps: 30, lastActivity: '1 min ago' },
        { id: 6, name: 'Camera 2', status: 'active', features: ['anomaly_detection'], resolution: '1920x1080', fps: 30, lastActivity: '3 min ago' }
      ]
    },
    {
      id: 3,
      name: 'Compute Unit #003',
      ip: '192.168.1.103',
      status: 'offline',
      uptime: '-',
      cameras: [
        { id: 7, name: 'Camera 1', status: 'inactive', features: [], resolution: '1920x1080', fps: 30, lastActivity: '2h ago' },
        { id: 8, name: 'Camera 2', status: 'inactive', features: [], resolution: '1920x1080', fps: 30, lastActivity: '2h ago' },
        { id: 9, name: 'Camera 3', status: 'inactive', features: [], resolution: '1920x1080', fps: 30, lastActivity: '2h ago' }
      ]
    }
  ]);

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
    }, 2000);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'online':
        return theme === 'dark' ? 'text-green-400' : 'text-green-800';
      case 'inactive':
      case 'offline':
        return 'text-muted-foreground';
      case 'error':
        return theme === 'dark' ? 'text-red-400' : 'text-red-800';
      default:
        return 'text-muted-foreground';
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'active':
      case 'online':
        return theme === 'dark' ? 'bg-green-900/50' : 'bg-green-100';
      case 'inactive':
      case 'offline':
        return 'bg-muted';
      case 'error':
        return theme === 'dark' ? 'bg-red-900/50' : 'bg-red-100';
      default:
        return 'bg-muted';
    }
  };

  const filteredUnits = computeUnits.filter(unit => 
    unit.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    unit.ip.includes(searchTerm)
  );

  const totalCameras = computeUnits.reduce((acc, unit) => acc + unit.cameras.length, 0);
  const activeCameras = computeUnits.reduce((acc, unit) => acc + unit.cameras.filter(c => c.status === 'active').length, 0);
  const onlineUnits = computeUnits.filter(unit => unit.status === 'online').length;

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">
            App Management
          </h1>
          <p className="mt-2 lg:mt-3 text-sm sm:text-base lg:text-lg text-muted-foreground">
            Assign different features to streamers across compute units
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <input
          type="text"
          placeholder="Search compute units..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-card p-4 rounded-lg border border-border">
          <div className="flex items-center gap-3">
            <Cpu className="h-8 w-8 text-primary" />
            <div>
              <div className="text-2xl font-bold text-foreground">{computeUnits.length}</div>
              <div className="text-sm text-muted-foreground">Compute Units</div>
            </div>
          </div>
        </div>
        <div className="bg-card p-4 rounded-lg border border-border">
          <div className="flex items-center gap-3">
            <Cpu className="h-8 w-8 text-green-600" />
            <div>
              <div className="text-2xl font-bold text-green-600">{onlineUnits}</div>
              <div className="text-sm text-muted-foreground">Online Units</div>
            </div>
          </div>
        </div>
        <div className="bg-card p-4 rounded-lg border border-border">
          <div className="flex items-center gap-3">
            <Camera className="h-8 w-8 text-blue-600" />
            <div>
              <div className="text-2xl font-bold text-blue-600">{totalCameras}</div>
              <div className="text-sm text-muted-foreground">Total Cameras</div>
            </div>
          </div>
        </div>
        <div className="bg-card p-4 rounded-lg border border-border">
          <div className="flex items-center gap-3">
            <Camera className="h-8 w-8 text-green-600" />
            <div>
              <div className="text-2xl font-bold text-green-600">{activeCameras}</div>
              <div className="text-sm text-muted-foreground">Active Cameras</div>
            </div>
          </div>
        </div>
      </div>

      {/* Compute Units */}
      <div className="space-y-6">
        {filteredUnits.map((unit) => (
          <div key={unit.id} className="bg-card rounded-lg border border-border">
            <div className="p-6">
              {/* Unit Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <Cpu className="h-8 w-8 text-primary" />
                  <div>
                    <h3 className="text-xl lg:text-2xl font-semibold text-foreground">{unit.name}</h3>
                    <p className="text-sm text-muted-foreground">{unit.ip} • Uptime: {unit.uptime}</p>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBg(unit.status)} ${getStatusColor(unit.status)}`}>
                  {unit.status.charAt(0).toUpperCase() + unit.status.slice(1)}
                </span>
              </div>

              {/* Cameras Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                {unit.cameras.map((camera) => (
                  <div key={camera.id} className="bg-muted/50 rounded-lg p-4 space-y-4">
                    {/* Camera Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Camera className="h-5 w-5 text-muted-foreground" />
                        <span className="font-medium text-foreground">{camera.name}</span>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBg(camera.status)} ${getStatusColor(camera.status)}`}>
                        {camera.status}
                      </span>
                    </div>

                    {/* Camera Info */}
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <div>Resolution: {camera.resolution}</div>
                      <div>FPS: {camera.fps}</div>
                      <div>Last Activity: {camera.lastActivity}</div>
                    </div>

                    {/* Features Section */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground">Features</span>
                      </div>

                      {/* Active Features */}
                      <div className="flex flex-wrap gap-1">
                        {camera.features.length > 0 ? camera.features.map((featureId) => {
                          const feature = availableFeatures.find(f => f.id === featureId);
                          return feature ? (
                            <span
                              key={feature.id}
                              className={`px-2 py-1 rounded text-xs font-medium ${feature.color}`}
                            >
                              {feature.name}
                            </span>
                          ) : null;
                        }) : (
                          <span className="text-xs text-muted-foreground italic">No features configured</span>
                        )}
                      </div>
                    </div>

                    {/* Configure Button */}
                    <div>
                      <MultiSelectFeatures
                        cameraName={camera.name}
                        selectedFeatures={camera.features}
                        onFeaturesChange={(features) => {
                          setComputeUnits(prev => prev.map(u => 
                            u.id === unit.id 
                              ? {
                                  ...u,
                                  cameras: u.cameras.map(c => 
                                    c.id === camera.id
                                      ? { ...c, features }
                                      : c
                                  )
                                }
                              : u
                          ));
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredUnits.length === 0 && (
        <div className="text-center py-12">
          <Cpu className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground text-lg">No compute units found matching your search.</p>
        </div>
      )}
    </div>
  );
};

export default AppsPage;
