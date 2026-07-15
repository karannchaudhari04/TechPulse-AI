import React from 'react';
import { useTheme } from '../../../theme';
import Badge from '../../../components/common/Badge';

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
      case 'NORMAL': return 'default';
      case 'HIGH': return 'warning';
      case 'CRITICAL': return 'danger';
      default: return 'default';
    }
  };

  return (
    <Badge 
      label={getLabel()} 
      status={getStatus() as any} 
      variant="solid" 
    />
  );
}
