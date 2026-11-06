import { useState } from "react";
import { Plus, Trash2, CheckCircle2 } from "lucide-react";
import { profileInputClass } from "../../candidate-profile/components/ProfileField";
import { Button } from "../../../components/ui/Button";

export function ResponsibilitiesInput({
  value = [],
  onChange,
  disabled = false,
  placeholder = "e.g. Design, build, and maintain scalable REST APIs",
}) {
  const [draft, setDraft] = useState("");

  function handleAdd() {
    const trimmed = draft.trim();
    if (!trimmed) return;
    onChange([...value, trimmed]);
    setDraft("");
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  }

  function handleUpdateItem(index, text) {
    const next = [...value];
    next[index] = text;
    onChange(next);
  }

  function handleRemoveItem(index) {
    onChange(value.filter((_, idx) => idx !== index));
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          type="text"
          value={draft}
          disabled={disabled}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={profileInputClass}
        />
        <Button
          type="button"
          variant="secondary"
          disabled={disabled || !draft.trim()}
          onClick={handleAdd}
          className="shrink-0 gap-1.5 px-3.5"
        >
          <Plus size={15} />
          Add item
        </Button>
      </div>

      {value.length > 0 && (
        <ul className="space-y-2">
          {value.map((item, idx) => (
            <li
              key={idx}
              className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
            >
              <CheckCircle2 size={15} className="shrink-0 text-brand" />
              <input
                type="text"
                value={item}
                disabled={disabled}
                onChange={(e) => handleUpdateItem(idx, e.target.value)}
                className="min-w-0 flex-1 bg-transparent text-sm text-slate-800 outline-none"
              />
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleRemoveItem(idx)}
                  aria-label="Remove responsibility"
                  className="rounded-lg p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 size={15} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
