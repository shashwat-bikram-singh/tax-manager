import PropertyForm from "@/components/property/PropertyForm";

const DEMO_DATA = {
  kittaNo: "4529-B",
  wardNo: null,          // nullable
  groundCode: null,      // nullable
  constructionYear: null, // nullable
  bigha: 12,
  kattha: 5,
  dhur: 10.5,
  ownershipType: "Institutional (Government)",
  legalStatus: "Clear Title",
  usageRights: "Educational / Administrative",
  encroachmentRisk: "None Detected",
  province: "Bagmati Province",
  district: "Kathmandu District",
  campusName: "Central Campus Kirtipur",
  currentUsage: "Research Facility",
  topography: "Mixed Plateau",
  latitude: 27.6811,
  longitude: 85.2848,
  verificationStatus: "verified" as const,
  lastUpdated: "12 Oct 2023",
};

export default function PropertyInventoryPage() {
  return (
    <PropertyForm
      mode="view"
      initialData={DEMO_DATA}
      onSuccess={() => console.log("Saved")}
    />
  );
}
