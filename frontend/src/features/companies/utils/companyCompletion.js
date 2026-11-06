const COMPANY_COMPLETION_FIELDS = [
  { key: "name", label: "Company Name" },
  { key: "logoUrl", label: "Company Logo" },
  { key: "website", label: "Company Website" },
  { key: "email", label: "Company Email" },
  { key: "contactNumber", label: "Contact Number" },
  { key: "industry", label: "Industry" },
  { key: "companySize", label: "Company Size" },
  { key: "companyType", label: "Company Type" },
  { key: "foundedYear", label: "Founded Year" },
  { key: "country", label: "Country" },
  { key: "state", label: "State" },
  { key: "city", label: "City" },
  { key: "address", label: "Office Address" },
  { key: "description", label: "Company Description" },
  { key: "linkedinUrl", label: "LinkedIn Profile" },
];

export function calculateCompanyCompletion(company = {}) {
  if (company?.completion && typeof company.completion.percentage === "number") {
    return company.completion;
  }

  const total = COMPANY_COMPLETION_FIELDS.length;
  const missingFields = [];
  let completed = 0;

  for (const field of COMPANY_COMPLETION_FIELDS) {
    const val = company[field.key];
    const filled = val !== null && val !== undefined && String(val).trim() !== "";
    if (filled) {
      completed += 1;
    } else {
      missingFields.push(field.label);
    }
  }

  return {
    completed,
    total,
    percentage: Math.round((completed / total) * 100),
    missingFields,
  };
}
