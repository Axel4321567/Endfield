import type { FC } from 'react';

interface DashboardCardProps {
  title: string;
  content: string;
}

export const DashboardCard: FC<DashboardCardProps> = ({ title, content }) => {
  return (
    <div className="dashboard-card">
      <h3 className="dashboard-card__title">{title}</h3>
      <p className="dashboard-card__content">{content}</p>
    </div>
  );
};
