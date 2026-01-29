// Design system tokens for consistent UI across the application

export const ICON_SIZES = {
  xs: 'w-3 h-3',
  sm: 'w-3.5 h-3.5',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
  xl: 'w-6 h-6',
} as const;

// Action button styles for edit/delete icons
export const ACTION_BUTTON = {
  size: 'h-6 w-6',
  iconSize: 'w-3 h-3',
} as const;

export const TIMER_STYLES = {
  active: 'px-2 py-1 rounded-md font-mono text-xs font-medium bg-primary/10 text-primary animate-pulse',
  paused: 'px-2 py-1 rounded-md font-mono text-xs font-medium bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
  display: 'px-2 sm:px-3 py-1 sm:py-1.5 rounded-md font-mono text-xs sm:text-sm font-medium',
} as const;

export const LOADING_CONTAINER = 'flex items-center justify-center h-64';

export const DIALOG_FOOTER = 'flex-col sm:flex-row gap-2';

export const BUTTON_LABEL_SPACING = 'ml-2';

export const CARD_PADDING = {
  default: 'p-6',
  compact: 'p-4',
  nested: 'p-3',
} as const;

export const SPACING = {
  page: 'p-4 sm:p-6 lg:p-8',
  section: 'space-y-4 sm:space-y-6',
  card: 'p-4 sm:p-6',
} as const;

export const BREAKPOINTS = {
  mobile: 'max-w-full',
  tablet: 'sm:max-w-xl',
  desktop: 'lg:max-w-4xl',
} as const;

export const LOGO_CONTAINER = {
  size: 'w-20 h-20',
  wrapper: 'flex items-center justify-center bg-muted rounded-lg overflow-hidden border border-border',
  image: 'max-w-full max-h-full object-contain',
} as const;
