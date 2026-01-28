const IdeaCardSkeleton = () => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden animate-pulse">
      <div className="p-6">
        {/* Header Skeleton */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
          <div className="h-3 bg-gray-200 rounded w-16"></div>
        </div>

        {/* Description Skeleton */}
        <div className="space-y-2 mb-4">
          <div className="h-4 bg-gray-200 rounded w-full"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          <div className="h-4 bg-gray-200 rounded w-4/6"></div>
        </div>

        {/* Footer Skeleton */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <div className="w-7 h-7 bg-gray-200 rounded-full"></div>
              <div className="ml-2 h-4 bg-gray-200 rounded w-8"></div>
            </div>
            <div className="flex items-center">
              <div className="w-7 h-7 bg-gray-200 rounded-full"></div>
              <div className="ml-2 h-4 bg-gray-200 rounded w-8"></div>
            </div>
          </div>
          <div className="h-3 bg-gray-200 rounded w-20"></div>
        </div>
      </div>
    </div>
  );
};

export default IdeaCardSkeleton;

