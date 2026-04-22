import SimilarSearch from "@/components/SimilarSearch";

export const dynamic = "force-dynamic";

export default function SimilarPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Find similar issues</h1>
        <p className="text-accentMuted mt-2">
          Paste arbitrary text and see the 5 closest existing issues by cosine distance.
        </p>
      </div>
      <SimilarSearch />
    </div>
  );
}
