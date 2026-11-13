import { Skeleton } from '@/components/ui/skeleton';

export default function RootLoading() {
  return (
    <div className="min-h-screen bg-[#FAFBFD] px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <Skeleton className="h-12 w-72" />
        <Skeleton className="h-72 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    </div>
  );
}
