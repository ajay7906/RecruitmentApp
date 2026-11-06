import { SkillsInput } from "./SkillsInput";
import { ProfileField } from "../../candidate-profile/components/ProfileField";

export function BenefitsInput({
  benefits = [],
  onBenefitsChange,
  perks = [],
  onPerksChange,
  disabled = false,
}) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 sm:col-span-2">
      <ProfileField label="Job benefits">
        <SkillsInput
          value={benefits}
          onChange={onBenefitsChange}
          disabled={disabled}
          placeholder="e.g. Health Insurance, Paid Time Off, PF"
        />
      </ProfileField>

      <ProfileField label="Perks & allowances">
        <SkillsInput
          value={perks}
          onChange={onPerksChange}
          disabled={disabled}
          placeholder="e.g. Remote Setup Stipend, Learning Budget, Flexible Hours"
        />
      </ProfileField>
    </div>
  );
}
