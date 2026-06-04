import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import type { Address } from '@signalwire/js';
import { useObservable } from '../hooks/useObservable';
import type { Directory } from '@signalwire/js';

interface DestinationPickerProps {
  directory: Directory | undefined;
  onDial: (destination: string) => Promise<void>;
  error: string | null;
}

/**
 * Destination picker with a text input for arbitrary URIs and a directory
 * list with infinite scroll and search.
 *
 * Search filters addresses client-side and automatically loads more pages
 * from the server until a match is found or the directory is exhausted.
 */
export function DestinationPicker({
  directory,
  onDial,
  error,
}: DestinationPickerProps) {
  const [destination, setDestination] = useState('');
  const [isDialing, setIsDialing] = useState(false);
  const [search, setSearch] = useState('');

  // Subscribe to directory addresses
  const addresses = useObservable(directory?.addresses$, []) as Address[];
  const hasMore = useObservable(directory?.hasMore$, false);
  const isLoadingDir = useObservable(directory?.loading$, false);

  // Callback ref for sentinel so the observer reconnects when the node mounts
  const [sentinelNode, setSentinelNode] = useState<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Filter addresses by search term (client-side)
  const filteredAddresses = useMemo(() => {
    if (!search.trim()) return addresses;
    const term = search.toLowerCase();
    return addresses.filter(
      (addr) =>
        addr.name.toLowerCase().includes(term) ||
        addr.displayName.toLowerCase().includes(term)
    );
  }, [addresses, search]);

  // Keep loading more pages while searching and no local matches are found.
  // The SDK's loadMore is guarded internally (no-op if already loading).
  useEffect(() => {
    if (!search.trim()) return;
    if (filteredAddresses.length > 0) return;
    if (!hasMore || isLoadingDir) return;

    directory?.loadMore();
  }, [search, filteredAddresses.length, hasMore, isLoadingDir, directory]);

  // Stable ref so the IntersectionObserver callback always sees the latest
  // hasMore / isLoadingDir without tearing down the observer on every toggle.
  const loadMoreRef = useRef(() => {});
  loadMoreRef.current = () => {
    if (hasMore && !isLoadingDir) {
      directory?.loadMore();
    }
  };

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    if (!sentinelNode) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          loadMoreRef.current();
        }
      },
      { root: scrollContainerRef.current, threshold: 0.1 }
    );

    observer.observe(sentinelNode);
    return () => observer.disconnect();
  }, [sentinelNode]);

  const handleDial = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!destination.trim()) return;
      setIsDialing(true);
      try {
        await onDial(destination.trim());
      } finally {
        setIsDialing(false);
      }
    },
    [destination, onDial]
  );

  const handleSelectAddress = useCallback((address: Address) => {
    // Use the preferred channel URI for calling
    const uri =
      address.channels?.video || address.channels?.audio || address.name;
    setDestination(uri);
  }, []);

  const showNoResults =
    search.trim() && filteredAddresses.length === 0 && !hasMore && !isLoadingDir;

  return (
    <div className="max-w-lg mx-auto p-4">
      {/* Dial form */}
      <form onSubmit={handleDial} className="mb-6">
        <label
          htmlFor="destination"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Destination
        </label>
        <div className="flex gap-2">
          <input
            id="destination"
            type="text"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="/public/test-room"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            type="submit"
            disabled={isDialing || !destination.trim()}
            className="px-6 py-2 bg-green-600 text-white rounded-lg font-medium text-sm hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isDialing ? 'Calling...' : 'Call'}
          </button>
        </div>
      </form>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Directory */}
      {(addresses.length > 0 || isLoadingDir) && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">Directory</h3>

          {/* Search input */}
          <input
            type="text"
            aria-label="Search directory"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search directory..."
            className="w-full px-3 py-2 mb-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />

          {/* Scrollable address list */}
          <div
            ref={scrollContainerRef}
            className="space-y-1 max-h-80 overflow-y-auto"
          >
            {filteredAddresses.map((address) => (
              <AddressItem
                key={address.id}
                address={address}
                onSelect={handleSelectAddress}
              />
            ))}

            {/* Sentinel element for infinite scroll */}
            <div ref={setSentinelNode} className="h-1" />
          </div>

          {/* Loading indicator */}
          {isLoadingDir && (
            <p className="mt-2 text-sm text-gray-500 text-center">
              Loading...
            </p>
          )}

          {/* No results after exhausting all pages */}
          {showNoResults && (
            <p className="mt-2 text-sm text-gray-500 text-center">
              No addresses match &ldquo;{search}&rdquo;
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// --- Address list item ---

function AddressItem({
  address,
  onSelect,
}: {
  address: Address;
  onSelect: (address: Address) => void;
}) {
  const displayName = useObservable(address.displayName$, address.name);
  const type = useObservable(address.type$, 'room');

  return (
    <button
      onClick={() => onSelect(address)}
      className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 transition-colors text-left"
    >
      {/* Type badge */}
      <span className="shrink-0 w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold uppercase">
        {String(type).charAt(0)}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {displayName}
        </p>
        <p className="text-xs text-gray-500 truncate">{String(type)}</p>
      </div>
    </button>
  );
}
