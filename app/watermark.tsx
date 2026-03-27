// Copyright © 2026 Hohenstein. All rights reserved.

import React from 'react';
import { Heart } from 'lucide-react';

/**
 * FamilyHub Watermark
 * Simple branding footer - no dependency on FamilyProvider
 * Shows "Powered by FamilyHub" with warm gradient
 */
export const Watermark = ({ h = 10, w = 10, className = '' }) => {
  return (
    <div
      className="px-4 fixed bottom-4 right-4 rounded-lg bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 shadow-lg hover:shadow-xl transition-all duration-200 z-40 flex items-center gap-2"
      title="FamilyHub - Stay Connected with Your Family"
    >
      <Heart className="h-4 w-4 text-white fill-white flex-shrink-0" />
      <div className="text-white text-sm font-medium whitespace-nowrap">
        Powered by FamilyHub
      </div>
    </div>
  );
};
