import { useState } from "react";
import { Plus, Trash2, HelpCircle } from "lucide-react";
import {
  ProfileField,
  profileInputClass,
} from "../../candidate-profile/components/ProfileField";
import { questionTypeOptions } from "../schema/jobSchemas";
import { Button } from "../../../components/ui/Button";

export function ApplicationSettings({
  register,
  errors,
  questions = [],
  onQuestionsChange,
  disabled = false,
}) {
  const [newQuestion, setNewQuestion] = useState("");
  const [newType, setNewType] = useState("SHORT_TEXT");
  const [newRequired, setNewRequired] = useState(false);
  const [newOptions, setNewOptions] = useState("");

  const isChoice = newType === "SINGLE_CHOICE" || newType === "MULTIPLE_CHOICE";

  function handleAddQuestion() {
    const qText = newQuestion.trim();
    if (qText.length < 2) return;

    const optionsList = isChoice
      ? newOptions
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

    const item = {
      id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      question: qText,
      type: newType,
      required: newRequired,
      options: optionsList,
    };

    onQuestionsChange([...questions, item]);
    setNewQuestion("");
    setNewType("SHORT_TEXT");
    setNewRequired(false);
    setNewOptions("");
  }

  function handleRemoveQuestion(idx) {
    onQuestionsChange(questions.filter((_, i) => i !== idx));
  }

  return (
    <>
      <ProfileField
        label="Application deadline"
        error={errors.applicationDeadline?.message}
      >
        <input
          type="date"
          className={profileInputClass}
          {...register("applicationDeadline")}
        />
      </ProfileField>

      <ProfileField
        label="Maximum applications (optional)"
        error={errors.maxApplications?.message}
      >
        <input
          type="number"
          min="1"
          placeholder="e.g. 200 (leave blank for unlimited)"
          className={profileInputClass}
          {...register("maxApplications")}
        />
      </ProfileField>

      {/* Checkboxes */}
      <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:col-span-2 sm:grid-cols-2">
        <label className="inline-flex cursor-pointer items-center gap-2.5 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand"
            {...register("requireResume")}
          />
          Require Resume / CV (Recommended)
        </label>

        <label className="inline-flex cursor-pointer items-center gap-2.5 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand"
            {...register("requireCoverLetter")}
          />
          Require Cover Letter
        </label>

        <label className="inline-flex cursor-pointer items-center gap-2.5 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand"
            {...register("allowAfterDeadline")}
          />
          Allow applications after deadline
        </label>
      </div>

      {/* Additional Screening Questions Builder */}
      <div className="sm:col-span-2 space-y-4 border-t border-slate-100 pt-4">
        <div className="flex items-center gap-2">
          <HelpCircle size={17} className="text-brand" />
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Additional Screening Questions
            </h3>
            <p className="text-xs text-slate-500">
              Configure custom questions candidates will answer when applying.
            </p>
          </div>
        </div>

        <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-12">
          <div className="sm:col-span-6">
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Question prompt
            </label>
            <input
              type="text"
              value={newQuestion}
              disabled={disabled}
              onChange={(e) => setNewQuestion(e.target.value)}
              placeholder="e.g. What is your notice period in days?"
              className={profileInputClass}
            />
          </div>

          <div className="sm:col-span-3">
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Input type
            </label>
            <select
              value={newType}
              disabled={disabled}
              onChange={(e) => setNewType(e.target.value)}
              className={`${profileInputClass} appearance-none`}
            >
              {questionTypeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end justify-between gap-2 sm:col-span-3">
            <label className="mb-3 inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-700">
              <input
                type="checkbox"
                checked={newRequired}
                disabled={disabled}
                onChange={(e) => setNewRequired(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-brand"
              />
              Required
            </label>

            <Button
              type="button"
              variant="secondary"
              disabled={disabled || newQuestion.trim().length < 2}
              onClick={handleAddQuestion}
              className="gap-1.5 px-3 py-2.5 text-xs"
            >
              <Plus size={14} /> Add
            </Button>
          </div>

          {isChoice && (
            <div className="sm:col-span-12">
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Options (comma-separated)
              </label>
              <input
                type="text"
                value={newOptions}
                disabled={disabled}
                onChange={(e) => setNewOptions(e.target.value)}
                placeholder="e.g. Immediate, 15 Days, 30 Days, 60+ Days"
                className={profileInputClass}
              />
            </div>
          )}
        </div>

        {questions.length > 0 && (
          <div className="space-y-2">
            {questions.map((q, index) => (
              <div
                key={q.id || index}
                className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-slate-900">
                      {index + 1}. {q.question}
                    </span>
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                      {questionTypeOptions.find((t) => t.value === q.type)
                        ?.label || q.type}
                    </span>
                    {q.required && (
                      <span className="rounded-md bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-600">
                        Required
                      </span>
                    )}
                  </div>
                  {q.options?.length > 0 && (
                    <p className="mt-1 text-xs text-slate-500">
                      Options: {q.options.join(" · ")}
                    </p>
                  )}
                </div>

                {!disabled && (
                  <button
                    type="button"
                    onClick={() => handleRemoveQuestion(index)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
