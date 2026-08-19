export default function InvestorsLoading() {
  return (
    <div className="p-4">
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-onsurface-900 rounded-xl w-48"></div>
        <div className="space-y-4">
          <div className="h-6 bg-onsurface-900 rounded-xl w-64"></div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 bg-onsurface-900 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

