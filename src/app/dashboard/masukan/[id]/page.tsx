export const dynamic = "force-dynamic";
import MasukanThreadClient from "./MasukanThreadClient";

export default async function MasukanThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <MasukanThreadClient feedbackId={id} />;
}
