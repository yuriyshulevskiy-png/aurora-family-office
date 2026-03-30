export default function MetricBar({ items }) {
  return (
    <div className="flex gap-8 px-6 py-3 bg-white border-b border-[#e3e8ee]">
      {items.map((item, i) => (
        <div key={i} className="flex flex-col">
          <span className="text-[11px] uppercase tracking-wide text-[#a3acb9]">{item.label}</span>
          <span className={`mono text-sm font-medium ${item.color || 'text-[#1a1f36]'}`}>
            {item.value}
          </span>
        </div>
      ))}
    </div>
  );
}
