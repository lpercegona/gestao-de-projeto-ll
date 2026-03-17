

## Plan: Settings Dialog Mobile Refinements

### Changes to `src/components/settings/SettingsDialog.tsx`

1. **Max-width**: Replace `max-w-3xl max-w-[768px]` with `max-w-[95vw] sm:max-w-[768px]` and add `rounded-xl` to ensure mobile gets rounded corners (base dialog only applies `sm:rounded-xl`).

2. **Close button on mobile**: Override the default dialog close button positioning on mobile — give it a background matching the nav bar (`bg-muted/30`) so it's visible over the horizontal menu area.

3. **Gradient fade on mobile nav**: Add a right-edge gradient overlay on the horizontal scroll nav that fades out when scrolled to the end. Use a `ref` + `onScroll` listener to detect if the nav is scrolled to the rightmost position, toggling a gradient `div` with `pointer-events-none` overlaying the right edge. The gradient uses the same muted background color.

4. **Last item right padding**: Add `pr-8` to the last nav item (or the container's inner `div`) so the last item isn't hidden behind the gradient/close button.

### Technical Approach for Gradient

```tsx
const navRef = useRef<HTMLElement>(null);
const [showGradient, setShowGradient] = useState(true);

const handleNavScroll = () => {
  const el = navRef.current;
  if (!el) return;
  const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
  setShowGradient(!atEnd);
};
```

A `div` with `absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-muted/30 to-transparent pointer-events-none` overlays the nav, hidden when `!showGradient`.

### Files to Modify
- `src/components/settings/SettingsDialog.tsx` — all changes above

