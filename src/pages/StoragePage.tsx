import React from 'react';

export const StoragePage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Storage</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Disk usage and storage management
        </p>
      </div>
      <div className="bg-card shadow rounded-lg border border-border p-6">
        <p className="text-muted-foreground">Storage management features will be implemented here.</p>
      </div>
    </div>
  );
};

export default StoragePage;
