import SearchForm from "./SearchForm";

export const dynamic = "force-dynamic";

export default function SimilarPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Find similar issues</h1>
        <p className="text-accentMuted mt-2">
          Paste an arbitrary ticket or crash snippet. We embed it and surface the 5 closest issues
          already in the index — useful for spotting duplicates.
        </p>
      </div>
      <SearchForm />
    </div>
  );
}
