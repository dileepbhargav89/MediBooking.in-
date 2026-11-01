/**
 * MediBooking Enterprise UI Design System Tokens & Base Types
 */
export * from '@medibooking/types';

export interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'urgent' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isLoading?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export interface ChamberBadgeProps {
  chamberNumber: string;
  doctorName: string;
  specialty: string;
  status: 'ACTIVE' | 'BREAK' | 'DELAYED' | 'OFFLINE';
  delayMinutes?: number;
}

export interface TokenCardProps {
  tokenNumber: number;
  patientName: string;
  status: string;
  isUrgent?: boolean;
  estimatedTime?: string;
  source: string;
  paymentStatus: string;
}

