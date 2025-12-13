export function RangeSlider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  unit = '',
  valueDisplay,
  leftLabel,
  rightLabel,
  colorClass = 'blue'
}) {
  const bgColor = colorClass === 'indigo' ? 'bg-indigo-50' : 'bg-blue-50';
  const textColor = colorClass === 'indigo' ? 'text-indigo-600' : 'text-blue-600';

  const displayValue = valueDisplay ?? value;

  return (
    <div>
      <div className="flex justify-between items-baseline mb-2">
        <label className="text-sm font-bold text-slate-700">{label}</label>
        <span className={`text-sm font-mono ${textColor} ${bgColor} px-2.5 py-0.5 rounded-md`}>
          {displayValue}{unit}
        </span>
      </div>
      <input
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer"
      />
      <div className="flex justify-between mt-1.5 text-xs text-slate-400">
        <span>{leftLabel}</span>
        <span>{rightLabel}</span>
      </div>
    </div>
  );
}
