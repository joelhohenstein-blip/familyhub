import { useFamily } from '~/utils/familyContext';
import { Home } from 'lucide-react';

interface FamilyLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
  className?: string;
}

export function FamilyLogo({ 
  size = 'md', 
  showSubtitle = true,
  className = ''
}: FamilyLogoProps) {
  const { currentFamily, isLoaded } = useFamily();

  // Size configurations
  const sizeConfig = {
    sm: {
      iconSize: 'size-6',
      titleSize: 'text-base',
      subtitleSize: 'text-xs',
      containerGap: 'gap-2',
    },
    md: {
      iconSize: 'size-8',
      titleSize: 'text-lg',
      subtitleSize: 'text-sm',
      containerGap: 'gap-2.5',
    },
    lg: {
      iconSize: 'size-10',
      titleSize: 'text-xl',
      subtitleSize: 'text-base',
      containerGap: 'gap-3',
    },
  };

  const config = sizeConfig[size];

  if (!isLoaded || !currentFamily) {
    // Loading state - show placeholder
    return (
      <div className={`flex items-center ${config.containerGap} ${className}`}>
        <div className={`${config.iconSize} rounded-lg bg-gray-200 flex items-center justify-center`}>
          <div className="w-1/2 h-1/2 bg-gray-300 rounded"></div>
        </div>
        {showSubtitle && (
          <div className="grid flex-1 text-left">
            <div className={`${config.titleSize} font-semibold bg-gray-200 h-4 rounded w-24`}></div>
            <div className={`${config.subtitleSize} text-muted-foreground bg-gray-100 h-3 rounded w-32 mt-1`}></div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`flex items-center ${config.containerGap} ${className}`}>
      {/* Family Logo - Four Hands Heart */}
      <div className={`${config.iconSize} rounded-lg flex items-center justify-center flex-shrink-0`}>
        <img 
          src="/family-logo.svg" 
          alt="Family Logo" 
          className="w-full h-full"
        />
      </div>

      {/* Text Content */}
      {showSubtitle && (
        <div className="grid flex-1 text-left min-w-0">
          <span className={`${config.titleSize} font-semibold truncate`}>
            {currentFamily.surname} FamilyHub
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * Alternative version: Icon-only logo (for compact displays)
 */
export function FamilyLogoIcon({ 
  size = 'md',
  className = ''
}: Omit<FamilyLogoProps, 'showSubtitle'>) {
  const { currentFamily, isLoaded } = useFamily();

  const sizeConfig = {
    sm: 'size-6',
    md: 'size-8',
    lg: 'size-10',
  };

  const sizeClass = sizeConfig[size];

  if (!isLoaded || !currentFamily) {
    return (
      <div className={`${sizeClass} rounded-lg bg-gray-200 flex items-center justify-center ${className}`}>
        <Home className={size === 'sm' ? 'size-3' : size === 'md' ? 'size-4' : 'size-5'} />
      </div>
    );
  }

  return (
    <div className={`${sizeClass} rounded-lg flex items-center justify-center flex-shrink-0 ${className}`}>
      <img 
        src="/family-logo.svg" 
        alt="Family Logo Icon" 
        className="w-full h-full"
      />
    </div>
  );
}
