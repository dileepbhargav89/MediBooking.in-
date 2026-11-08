/**
 * MediBooking Enterprise UI Design System Tokens & Component Library
 * Document ID: MB-SPEC-14 (Stage IV, Phase 33 & 36)
 */

export * from '@medibooking/types';
export * from './tokens';

// UI Components
export { Badge, type BadgeProps } from './components/Badge';
export { BharatQrModal, type BharatQrModalProps } from './components/BharatQrModal';
export { Button, type ButtonProps } from './components/Button';
export { Card, CardHeader, CardBody, CardFooter, type CardProps } from './components/Card';
export { ChamberBadge, type ChamberBadgeProps } from './components/ChamberBadge';
export { ClinicSwitcherModal, type ClinicSwitcherModalProps, type AffiliatedClinicItem } from './components/ClinicSwitcherModal';
export { Input, type InputProps } from './components/Input';
export { Modal, type ModalProps } from './components/Modal';
export { StatCard, type StatCardProps } from './components/StatCard';
export { TokenCard, type TokenCardProps } from './components/TokenCard';
export { HardwareDiagnosticModal, type HardwareDiagnosticModalProps } from './components/HardwareDiagnosticModal';
export { ProductTourGuide, type ProductTourGuideProps, type TourStep } from './components/ProductTourGuide';

// Hardware Printer Drivers
export {
  EscposPrinterDriver,
  type EscposReceiptData,
  type DirectPrintResult,
} from './printers/escpos-printer-driver';

// Offline PWA & Storage Drivers
export {
  OfflineSyncQueueManager,
  type OfflineIntakeRecord,
  type SyncBatchResult,
} from './storage/offline-sync-queue';

