import React from 'react';

export const StoragePage: React.FC = () => {
  return (
    <div className="space-y-8 lg:space-y-10">
      <div>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-foreground">Storage</h1>
        <p className="mt-3 lg:mt-4 text-base sm:text-lg lg:text-xl text-muted-foreground">
          Disk usage and storage management
        </p>
      </div>
      <div className="bg-card shadow rounded-lg border border-border p-6 sm:p-8 lg:p-10 hover:shadow-lg transition-shadow">
        <p className="text-base sm:text-lg lg:text-xl text-muted-foreground">Storage management features will be implemented here.</p>
      </div>
    </div>
  );
};

export default StoragePage;
