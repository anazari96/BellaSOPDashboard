import PresetForm from "@/components/admin/PresetForm";

interface EditPresetPageProps {
  params: Promise<{ id: string }>;
}

const EditPresetPage = async ({ params }: EditPresetPageProps) => {
  const { id } = await params;
  return <PresetForm presetId={id} />;
};

export default EditPresetPage;
