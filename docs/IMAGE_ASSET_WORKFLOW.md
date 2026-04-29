# Image Asset Workflow

## Folder Rule
- Master/source files (do not import in code):
  - `assets/source/characters/`
- Runtime files (import in Vue/JS):
  - `src/image/characters/`

## Current Runtime Files
- `src/image/characters/samurai.runtime.webp`
- `src/image/characters/samu-q-front.runtime.webp`

## Conversion Command (example)
```bash
cwebp -q 82 -resize 640 960 assets/source/characters/samurai-master.png -o src/image/characters/samurai.runtime.webp
cwebp -q 82 -resize 640 960 assets/source/characters/samu-q-front-master.png -o src/image/characters/samu-q-front.runtime.webp
```

## Notes
- Keep `assets/source` as high-quality archive for future edits.
- Only runtime files in `src/image/characters` are bundled into app build.
- If character looks blurry on a future device, raise output size to `768x1152` first.
