export function OperationItemSkeleton() {
  return (
    <tr className="animate-pulse bg-onsurface-900 rounded-xl">
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
  );
}

