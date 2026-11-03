/**
 * MediBooking Enterprise Healthcare Design System Tokens
 * Document ID: MB-SPEC-14 (Section 3)
 * High-Contrast Healthcare Palette (WCAG AAA compliant)
 */

export const DESIGN_TOKENS = {
  colors: {
    // Primary Brand Blue (Deep Trust Royal Medical Blue)
    primary: {
      default: '#1D4ED8',      // bg-blue-600 / text-blue-700
      hover: '#1E40AF',        // bg-blue-700
      light: '#EFF6FF',        // bg-blue-50
      dark: '#172554',         // text-blue-950
      border: '#BFDBFE',       // border-blue-200
    },
    // Backgrounds
    background: {
      white: '#FFFFFF',        // Pure Crisp White
      secondary: '#F8FAFC',    // Ultra-soft Medical Tint (bg-slate-50)
      muted: '#F1F5F9',        // Soft Slate Surface (bg-slate-100)
    },
    // Faded Mint / Sage Green Accent (Success / Available)
    mint: {
      default: '#10B981',      // Emerald 500
      surface: '#D1FAE5',      // bg-emerald-100 / bg-emerald-50
      text: '#047857',         // text-emerald-700
      darkText: '#065F46',     // text-emerald-800
      border: '#A7F3D0',       // border-emerald-200
    },
    // High-Visibility Amber (Urgent Triage / Delayed)
    amber: {
      default: '#F59E0B',      // Amber 500
      surface: '#FEF3C7',      // bg-amber-100
      text: '#B45309',         // text-amber-700
      darkText: '#92400E',     // text-amber-800
      border: '#FDE68A',       // border-amber-200
    },
    // High-Alert Red / Coral (Emergency / Cancelled)
    red: {
      default: '#EF4444',      // Red 500
      surface: '#FEE2E2',      // bg-red-100
      text: '#B91C1C',         // text-red-700
      darkText: '#991B1B',     // text-red-800
      border: '#FECACA',       // border-red-200
    },
    // Text Primary & Secondary
    text: {
      primary: '#0F172A',      // Slate 900
      secondary: '#475569',    // Slate 600
      muted: '#94A3B8',        // Slate 400
      inverse: '#FFFFFF',      // White
    },
    // Borders
    border: {
      default: '#E2E8F0',      // Slate 200
      light: '#F1F5F9',        // Slate 100
      strong: '#CBD5E1',       // Slate 300
    },
    // Chamber Badges (Multi-Chamber Polyclinic Distinction)
    chambers: {
      'CH-1': {
        name: 'Chamber 1',
        bg: '#EFF6FF',
        border: '#93C5FD',
        text: '#1E40AF',
        accent: '#2563EB',
      },
      'CH-2': {
        name: 'Chamber 2',
        bg: '#ECFDF5',
        border: '#86EFAC',
        text: '#065F46',
        accent: '#10B981',
      },
      'CH-3': {
        name: 'Chamber 3',
        bg: '#FAF5FF',
        border: '#D8B4FE',
        text: '#6B21A8',
        accent: '#9333EA',
      },
      'CH-4': {
        name: 'Chamber 4',
        bg: '#FFF7ED',
        border: '#FDBA74',
        text: '#9A3412',
        accent: '#EA580C',
      },
    },
    // Status Badges
    chamberStatus: {
      ACTIVE: {
        bg: '#ECFDF5',
        text: '#065F46',
        border: '#A7F3D0',
        dot: '#10B981',
        label: 'In Session',
      },
      BREAK: {
        bg: '#FEF3C7',
        text: '#92400E',
        border: '#FDE68A',
        dot: '#F59E0B',
        label: 'Short Break',
      },
      DELAYED: {
        bg: '#FFF1F2',
        text: '#9F1239',
        border: '#FECDD3',
        dot: '#F43F5E',
        label: 'Delayed',
      },
      OFFLINE: {
        bg: '#F1F5F9',
        text: '#475569',
        border: '#CBD5E1',
        dot: '#94A3B8',
        label: 'Not Started',
      },
    },
  },
  typography: {
    fontSans: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontMono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    tabularNums: 'tabular-nums',
  },
  shadows: {
    card: '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)',
    cardHover: '0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -2px rgba(0, 0, 0, 0.07)',
    activePulse: '0 0 0 3px rgba(16, 185, 129, 0.25)',
    urgentPulse: '0 0 0 3px rgba(245, 158, 11, 0.25)',
  },
  classes: {
    card: 'border border-slate-200 bg-white shadow-sm rounded-xl',
    cardInteractive: 'border border-slate-200 bg-white shadow-sm hover:shadow-md transition-all duration-150 rounded-xl cursor-pointer',
    tabular: 'font-mono tabular-nums',
    brandHeader: 'font-bold tracking-tight text-slate-900',
  },
} as const;

export type ChamberCode = 'CH-1' | 'CH-2' | 'CH-3' | 'CH-4';
export type ChamberStatus = 'ACTIVE' | 'BREAK' | 'DELAYED' | 'OFFLINE';
export type TriageUrgency = 'NORMAL' | 'URGENT' | 'EMERGENCY';
export type PaymentBadgeStatus = 'PENDING' | 'PAID_CASH' | 'PAID_UPI_QR' | 'WAIVED' | 'REFUNDED';
export type QueueStatus = 'SCHEDULED' | 'ARRIVED' | 'WAITING' | 'IN_CONSULTATION' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';

/**
 * Returns style definition for a given chamber identifier
 */
export function getChamberStyle(chamberNumber: string) {
  const code = chamberNumber.toUpperCase() as ChamberCode;
  return DESIGN_TOKENS.colors.chambers[code] || {
    name: chamberNumber,
    bg: '#F8FAFC',
    border: '#E2E8F0',
    text: '#334155',
    accent: '#64748B',
  };
}

/**
 * Returns visual badge styling for a chamber status
 */
export function getChamberStatusStyle(status: string) {
  const key = status.toUpperCase() as ChamberStatus;
  return DESIGN_TOKENS.colors.chamberStatus[key] || DESIGN_TOKENS.colors.chamberStatus.OFFLINE;
}

/**
 * Returns visual styling for triage urgency (Emergency vs Urgent vs Normal)
 */
export function getTriageStyle(isUrgent?: boolean, triageUrgency?: string) {
  if (triageUrgency === 'EMERGENCY') {
    return {
      bg: DESIGN_TOKENS.colors.red.surface,
      text: DESIGN_TOKENS.colors.red.text,
      border: DESIGN_TOKENS.colors.red.border,
      dot: DESIGN_TOKENS.colors.red.default,
      label: 'EMERGENCY',
      pulse: true,
    };
  }
  if (isUrgent || triageUrgency === 'URGENT') {
    return {
      bg: DESIGN_TOKENS.colors.amber.surface,
      text: DESIGN_TOKENS.colors.amber.text,
      border: DESIGN_TOKENS.colors.amber.border,
      dot: DESIGN_TOKENS.colors.amber.default,
      label: 'URGENT',
      pulse: false,
    };
  }
  return {
    bg: DESIGN_TOKENS.colors.background.muted,
    text: DESIGN_TOKENS.colors.text.secondary,
    border: DESIGN_TOKENS.colors.border.default,
    dot: DESIGN_TOKENS.colors.text.muted,
    label: 'NORMAL',
    pulse: false,
  };
}

/**
 * Returns visual styling for payment statuses
 */
export function getPaymentBadgeStyle(status: string) {
  switch (status.toUpperCase()) {
    case 'PAID_CASH':
      return {
        bg: '#ECFDF5',
        text: '#065F46',
        border: '#A7F3D0',
        label: 'Paid (Cash)',
      };
    case 'PAID_UPI_QR':
      return {
        bg: '#EFF6FF',
        text: '#1E40AF',
        border: '#BFDBFE',
        label: 'Paid (UPI)',
      };
    case 'WAIVED':
      return {
        bg: '#F5F3FF',
        text: '#5B21B6',
        border: '#DDD6FE',
        label: 'Waived',
      };
    case 'REFUNDED':
      return {
        bg: '#FFF1F2',
        text: '#9F1239',
        border: '#FECDD3',
        label: 'Refunded',
      };
    case 'PENDING':
    default:
      return {
        bg: '#FEF3C7',
        text: '#92400E',
        border: '#FDE68A',
        label: 'Unpaid at Desk',
      };
  }
}

/**
 * Returns visual styling for queue states
 */
export function getQueueStatusBadgeStyle(status: string) {
  switch (status.toUpperCase()) {
    case 'IN_CONSULTATION':
      return {
        bg: '#ECFDF5',
        text: '#065F46',
        border: '#86EFAC',
        label: 'In Consultation',
        dot: '#10B981',
      };
    case 'WAITING':
      return {
        bg: '#EFF6FF',
        text: '#1D4ED8',
        border: '#BFDBFE',
        label: 'In Waiting Area',
        dot: '#2563EB',
      };
    case 'ARRIVED':
      return {
        bg: '#FAF5FF',
        text: '#6B21A8',
        border: '#E9D5FF',
        label: 'Checked In',
        dot: '#9333EA',
      };
    case 'COMPLETED':
      return {
        bg: '#F1F5F9',
        text: '#334155',
        border: '#CBD5E1',
        label: 'Completed',
        dot: '#64748B',
      };
    case 'CANCELLED':
      return {
        bg: '#FFF1F2',
        text: '#9F1239',
        border: '#FECDD3',
        label: 'Cancelled',
        dot: '#F43F5E',
      };
    case 'NO_SHOW':
      return {
        bg: '#F8FAFC',
        text: '#64748B',
        border: '#E2E8F0',
        label: 'No Show',
        dot: '#94A3B8',
      };
    case 'SCHEDULED':
    default:
      return {
        bg: '#F8FAFC',
        text: '#475569',
        border: '#E2E8F0',
        label: 'Scheduled',
        dot: '#94A3B8',
      };
  }
}
