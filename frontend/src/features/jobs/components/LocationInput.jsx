import {
  ProfileField,
  profileInputClass,
} from "../../candidate-profile/components/ProfileField";

export function LocationInput({ register, errors, workMode }) {
  const isRemote = workMode === "Remote";

  return (
    <>
      <ProfileField
        label={isRemote ? "Country (optional for Remote)" : "Country *"}
        error={errors.country?.message}
      >
        <input
          type="text"
          placeholder="e.g. India"
          className={profileInputClass}
          {...register("country")}
        />
      </ProfileField>

      <ProfileField
        label="State / Province"
        error={errors.state?.message}
      >
        <input
          type="text"
          placeholder="e.g. Karnataka"
          className={profileInputClass}
          {...register("state")}
        />
      </ProfileField>

      <ProfileField
        label={isRemote ? "City (optional for Remote)" : "City *"}
        error={errors.city?.message}
      >
        <input
          type="text"
          placeholder="e.g. Bengaluru"
          className={profileInputClass}
          {...register("city")}
        />
      </ProfileField>

      <ProfileField
        label="Pincode / Postal Code (optional)"
        error={errors.pincode?.message}
      >
        <input
          type="text"
          placeholder="e.g. 560103"
          className={profileInputClass}
          {...register("pincode")}
        />
      </ProfileField>

      <ProfileField
        label="Office location / Landmark"
        error={errors.officeLocation?.message}
        className="sm:col-span-2"
      >
        <input
          type="text"
          placeholder={
            isRemote
              ? "Remote / Work from anywhere"
              : "e.g. Embassy TechVillage, Outer Ring Road"
          }
          className={profileInputClass}
          {...register("officeLocation")}
        />
      </ProfileField>
    </>
  );
}
