import React from 'react';

export const DevicesPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Raspberry Devices</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Manage connected Raspberry Pi devices
        </p>
      </div>
      <div className="bg-card shadow rounded-lg border border-border p-6">
        <p className="text-muted-foreground">Device management features will be implemented here.</p>
      </div>
    </div>
  );
};

export default DevicesPage;
