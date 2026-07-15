import React from 'react';
import { Tag } from '../../../components/common/Badge';

export interface PriorityBadgeProps {
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
}

/**
 * Purpose: Badge labeling notification priorities with color indicators.
 */
export default function PriorityBadge({ priority }: PriorityBadgeProps) {
  const getLabel = () => {
    switch (priority) {
      case 'LOW': return 'Low';
      case 'NORMAL': return 'Normal';
      case 'HIGH': return 'High';
      case 'CRITICAL': return 'Critical';
      default: return 'Normal';
    }
  };

  const getStatus = () => {
    switch (priority) {
      case 'LOW': return 'info';
      case 'NORMAL': return 'primary';
      case 'HIGH': return 'warning';
      case 'CRITICAL': return 'danger';
      default: return 'primary';
    }
  };

  return (
    <Tag 
      label={getLabel()} 
      type={getStatus() as any} 
    />
  );
}
