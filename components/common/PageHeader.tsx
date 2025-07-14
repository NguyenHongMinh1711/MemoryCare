
import React from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, icon }) => {
  return (
    <div className="mb-8 pb-4 border-b border-slate-300">
      <div className="flex items-center space-x-3">
        {icon && <span className="text-sky-600">{icon}</span>}
        <h2 className="text-3xl md:text-4xl font-bold text-sky-700">{title}</h2>
      </div>
      {subtitle && <p className="mt-2 text-slate-600 text-lg">{subtitle}</p>}
    </div>
  );
};

export default PageHeader;
