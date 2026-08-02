"use client";

import { Trade } from "@/lib/types";

export function ShipmentMap({ trade }: { trade: Trade }) {
  const location = trade.shipmentLocation || {
    lat: 31.2304,
    lng: 121.4737,
    address: "Shanghai Port, China",
  };

  // Mock map visualization using a simple div with gradient
  const mapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${location.lat},${location.lng}&zoom=6&size=600x300&markers=color:red%7C${location.lat},${location.lng}&key=mock`;

  return (
    <div className="glass-panel rounded-lg overflow-hidden">
      <div className="relative h-64 bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center">
        {/* Mock map background */}
        <div className="absolute inset-0 opacity-20">
          <svg
            className="w-full h-full"
            viewBox="0 0 600 300"
            preserveAspectRatio="none"
          >
            <defs>
              <pattern
                id="grid"
                width="40"
                height="40"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 40 0 L 0 0 0 40"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="0.5"
                />
              </pattern>
            </defs>
            <rect width="600" height="300" fill="url(#grid)" />
          </svg>
        </div>

        {/* Location marker */}
        <div className="relative z-10 flex flex-col items-center">
          <div className="w-6 h-6 bg-red-500 rounded-full shadow-lg animate-pulse" />
          <div className="absolute top-8 bg-white dark:bg-slate-800 px-3 py-1 rounded shadow-lg whitespace-nowrap">
            <p className="text-xs font-semibold text-foreground">
              {location.address}
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 bg-muted/30">
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">
            Shipment Location:
          </span>{" "}
          {location.address}
        </p>
      </div>
    </div>
  );
}
