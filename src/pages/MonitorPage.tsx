import React from 'react';

export const MonitorPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">System Monitor</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Real-time system monitoring and performance metrics
        </p>
      </div>
      <div className="bg-card shadow rounded-lg border border-border p-6">
        <p className="text-muted-foreground">System monitoring features will be implemented here.</p>
      </div>
    </div>
  );
};

export default MonitorPage;
