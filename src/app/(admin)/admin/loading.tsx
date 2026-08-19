export default function AdminLoading() {
  return (
    <div className="p-4">
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-onsurface-900 rounded-xl w-48"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-onsurface-900 rounded-xl"></div>
          ))}
        </div>
      </div>
    </div>
  );
}

