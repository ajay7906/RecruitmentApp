import {
  ProfileField,
  profileInputClass,
} from "../../candidate-profile/components/ProfileField";
import {
  salaryCurrencyOptions,
  salaryPeriodOptions,
} from "../schema/jobSchemas";

export function SalaryInput({ register, errors }) {
  return (
    <>
      <ProfileField label="Minimum salary" error={errors.minSalary?.message}>
        <input
          type="number"
          min="0"
          step="1000"
          placeholder="e.g. 800000"
          className={profileInputClass}
          {...register("minSalary")}
        />
      </ProfileField>

      <ProfileField label="Maximum salary" error={errors.maxSalary?.message}>
        <input
          type="number"
          min="0"
          step="1000"
          placeholder="e.g. 1500000"
          className={profileInputClass}
          {...register("maxSalary")}
        />
      </ProfileField>

      <ProfileField label="Salary currency" error={errors.salaryCurrency?.message}>
        <select
          className={`${profileInputClass} appearance-none`}
          {...register("salaryCurrency")}
        >
          {salaryCurrencyOptions.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </ProfileField>

      <ProfileField label="Salary period" error={errors.salaryPeriod?.message}>
        <select
          className={`${profileInputClass} appearance-none`}
          {...register("salaryPeriod")}
        >
          {salaryPeriodOptions.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </ProfileField>

      <div className="sm:col-span-2">
        <label className="inline-flex cursor-pointer items-center gap-2.5 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand"
            {...register("discloseSalary")}
          />
          Disclose salary range on public job listing
        </label>
      </div>
    </>
  );
}
