# Mobile CSS

`mobile.css` is a dedicated responsive layer for screens up to 768px.

- Desktop CSS files were not rewritten.
- The existing sidebar becomes a bottom navigation on phones.
- Main content becomes a single-column portrait layout.
- Horizontal phone orientation is intentionally covered with a rotate-to-portrait message.
- The viewport uses `viewport-fit=cover`.
- Browser chrome cannot be removed by CSS; true fullscreen requires browser/PWA fullscreen behavior.
