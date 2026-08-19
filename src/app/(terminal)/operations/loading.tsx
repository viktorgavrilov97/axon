export default function OperationsLoading() {
  return (
    <div className="min-h-screen p-4">
      <div className="animate-pulse">
        <div className="h-8 bg-onsurface-900 rounded w-48 mb-8"></div>
        <div className="overflow-x-auto">
          <table className="w-full table-fixed border-separate" style={{ borderSpacing: '0 12px' }}>
            <colgroup>
              <col className="w-[40%]" />
              <col className="w-[30%]" />
              <col className="w-[30%]" />
            </colgroup>
            <thead>
              <tr>
                <th className="text-left text-small text-white-700 pb-4 pl-0">
                  <div className="h-4 w-24 bg-onsurface-900 rounded"></div>
                </th>
                <th className="text-left text-small text-white-700 pb-4 pl-8 ml-8">
                  <div className="h-4 w-16 bg-onsurface-900 rounded"></div>
                </th>
                <th className="text-right text-small text-white-700 pb-4 pr-0">
                  <div className="h-4 w-20 bg-onsurface-900 rounded ml-auto"></div>
                </th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4, 5].map((i) => (
                <tr key={i} className="animate-pulse bg-onsurface-900 rounded-xl">
                  <td className="py-5 px-5 rounded-l-xl overflow-hidden">
                    <div className="flex items-center gap-3">
                      <div className="w-[52px] h-[52px] rounded-full bg-onsurface-950 flex-shrink-0"></div>
                      <div className="flex flex-col gap-2 min-w-0">
                        <div className="h-4 w-32 bg-onsurface-950 rounded"></div>
                        <div className="h-3 w-24 bg-onsurface-950 rounded"></div>
                      </div>
                    </div>
                  </td>
                  <td className="py-5 px-5 pl-8 overflow-hidden text-left">
                    <div className="h-4 w-28 bg-onsurface-950 rounded"></div>
                  </td>
                  <td className="py-5 px-5 rounded-r-xl text-right overflow-hidden">
                    <div className="h-4 w-24 bg-onsurface-950 rounded ml-auto"></div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

