import { useState } from "react";
import { Plus, X } from "lucide-react";
import { profileInputClass } from "../../candidate-profile/components/ProfileField";
import { Button } from "../../../components/ui/Button";

export function SkillsInput({
  value = [],
  onChange,
  placeholder = "Type a skill and press Enter (e.g. React.js, Node.js)",
  disabled = false,
}) {
  const [input, setInput] = useState("");

  function addSkills(raw) {
    const tokens = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (tokens.length === 0) return;

    const existingLower = new Set(value.map((s) => s.toLowerCase()));
    const next = [...value];

    for (const token of tokens) {
      if (!existingLower.has(token.toLowerCase())) {
        existingLower.add(token.toLowerCase());
        next.push(token);
      }
    }

    onChange(next);
    setInput("");
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addSkills(input);
    }
  }

  function removeSkill(index) {
    onChange(value.filter((_, idx) => idx !== index));
  }

  return (
    <div className="space-y-2.5">
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          disabled={disabled}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={profileInputClass}
        />
        <Button
          type="button"
          variant="secondary"
          disabled={disabled || !input.trim()}
          onClick={() => addSkills(input)}
          className="shrink-0 gap-1.5 px-3.5"
        >
          <Plus size={15} />
          Add
        </Button>
      </div>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((skill, index) => (
            <span
              key={`${skill}-${index}`}
              className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-brand"
            >
              {skill}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeSkill(index)}
                  aria-label={`Remove ${skill}`}
                  className="rounded-full p-0.5 text-brand/70 hover:bg-blue-100 hover:text-brand"
                >
                  <X size={12} />
                </button>
              )}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
