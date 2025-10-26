"use client";

interface SelectFieldProps<T extends string> {
  id: string;
  label: string;
  value: T;
  options: readonly T[];
  onChange: (value: T) => void;
  renderLabel?: (value: T) => string;
}

export function SelectField<T extends string>({
  id,
  label,
  value,
  options,
  onChange,
  renderLabel
}: SelectFieldProps<T>) {
  return (
    <label htmlFor={id} className="flex flex-col gap-2">
      <span className="text-sm font-medium text-slate-300">{label}</span>
      <select
        id={id}
        className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {renderLabel ? renderLabel(option) : option.replace(/_/g, " ")}
          </option>
        ))}
      </select>
    </label>
  );
}
