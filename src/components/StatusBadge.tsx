import type { ComplianceStatus } from '../types';

interface Props {
  status: ComplianceStatus;
  size?: 'sm' | 'md';
}

const config: Record<ComplianceStatus, { label: string; classes: string }> = {
  COMPLIANT: {
    label: 'Compliant',
    classes: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  },
  NON_COMPLIANT: {
    label: 'Non-Compliant',
    classes: 'bg-red-50 text-red-700 border border-red-200',
  },
  VERIFICATION_REQUIRED: {
    label: 'Verification Required',
    classes: 'bg-amber-50 text-amber-700 border border-amber-200',
  },
};

export default function StatusBadge({ status, size = 'md' }: Props) {
  const { label, classes } = config[status];
  const sizeClasses = size === 'sm'
    ? 'text-[10px] px-1.5 py-0.5 font-semibold tracking-wide'
    : 'text-xs px-2 py-1 font-semibold tracking-wide';
  return (
    <span className={`inline-flex items-center rounded uppercase ${sizeClasses} ${classes}`}>
      {label}
    </span>
  );
}

export function StatusDot({ status }: { status: ComplianceStatus }) {
  const colors: Record<ComplianceStatus, string> = {
    COMPLIANT: 'bg-emerald-500',
    NON_COMPLIANT: 'bg-red-500',
    VERIFICATION_REQUIRED: 'bg-amber-500',
  };
  return <span className={`inline-block w-2 h-2 rounded-full ${colors[status]}`} />;
}
