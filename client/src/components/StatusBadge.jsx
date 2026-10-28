export default function StatusBadge({ status }) {
  const configs = {
    active:                  { label: 'Active',           bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' },
    pending_seller_decision: { label: 'Decision Needed',  bg: '#fffbeb', text: '#92400e', border: '#fde68a' },
    approved:                { label: 'Approved',          bg: '#eff6ff', text: '#1e40af', border: '#bfdbfe' },
    handover_pending:        { label: 'Handover Pending', bg: '#faf5ff', text: '#6b21a8', border: '#e9d5ff' },
    completed:               { label: 'Completed',        bg: '#f0fdf4', text: '#166534', border: '#bbf7d0' },
    rejected:                { label: 'Rejected',         bg: '#fef2f2', text: '#991b1b', border: '#fecaca' },
    cancelled:               { label: 'Cancelled',        bg: '#f9fafb', text: '#6b7280', border: '#e5e7eb' },
    unsold:                  { label: 'Unsold',           bg: '#f9fafb', text: '#6b7280', border: '#e5e7eb' },
    pickup_failed:           { label: 'Pickup Failed',    bg: '#fef2f2', text: '#991b1b', border: '#fecaca' },
  };

  const current = configs[status] || { label: status, bg: '#f9fafb', text: '#6b7280', border: '#e5e7eb' };

  return (
    <span
      style={{
        display: 'inline-block',
        fontSize: '11px',
        fontWeight: '600',
        padding: '2px 7px',
        borderRadius: '4px',
        backgroundColor: current.bg,
        color: current.text,
        border: `1px solid ${current.border}`,
        whiteSpace: 'nowrap',
      }}
    >
      {current.label}
    </span>
  );
}
