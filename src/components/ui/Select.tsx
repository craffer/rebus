interface SelectOption<T extends string> {
  value: T;
  label: string;
}

interface SelectProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: SelectOption<T>[];
  label: string;
  description?: string;
}

export default function Select<T extends string>({
  value,
  onChange,
  options,
  label,
  description,
}: SelectProps<T>) {
  return (
    <label className="flex items-center justify-between gap-4 py-2">
      <div>
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {label}
        </p>
        {description && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {description}
          </p>
        )}
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="rounded border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}
