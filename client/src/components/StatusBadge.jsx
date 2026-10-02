function StatusBadge({ status }) {
  const isActive = status === 'ACTIVE' || status === 'OPEN';
  return (
    <span
      className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${
        isActive ? 'bg-green-100 text-green-800' : 'bg-slate-200 text-slate-600'
      }`}
    >
      {status}
    </span>
  );
}

export default StatusBadge;
