import React from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, description, actions }) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8 pr-0 sm:pr-12 lg:pr-16">
      <div className="min-w-0">
        <h1 className="text-xl sm:text-2xl font-semibold text-foreground truncate">{title}</h1>
        {description && (
          <p className="mt-1 text-sm sm:text-base text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
    </div>
  );
};