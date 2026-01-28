'use client';

interface MenuSkeletonLoaderProps {
  count?: number;
  collapsed?: boolean;
}

export default function MenuSkeletonLoader({ count = 8, collapsed = false }: MenuSkeletonLoaderProps) {
  return (
    <div className="space-y-2 px-2">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className={`flex items-center gap-3 px-2 py-3 rounded-xl animate-pulse ${
            collapsed ? 'justify-center' : ''
          }`}
        >
          {collapsed ? (
            <div className="w-10 h-10 rounded-xl bg-gray-200 dark:bg-gray-700" />
          ) : (
            <>
              <div className="w-10 h-10 rounded-xl bg-gray-200 dark:bg-gray-700" />
              <div className="h-5 flex-1 rounded bg-gray-200 dark:bg-gray-700" />
            </>
          )}
        </div>
      ))}
    </div>
  );
}
