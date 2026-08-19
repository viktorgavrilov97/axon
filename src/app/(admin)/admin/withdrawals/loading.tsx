export default function WithdrawalsLoading() {
  return (
    <div className="p-4">
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-onsurface-900 rounded-xl w-48"></div>
        <div className="space-y-4">
          <div className="h-12 bg-onsurface-900 rounded-xl w-96"></div>
          <div className="h-64 bg-onsurface-900 rounded-xl"></div>
        </div>
      </div>
    </div>
  );
}

