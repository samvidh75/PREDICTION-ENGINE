# Git Line Ending Policy

**Project:** PREDICTION-ENGINE  
**Updated:** 2026-10-06 (TRACK-PORTABILITY-P2)

## Policy

All text files use **LF (Unix)** line endings via `.gitattributes`:

```
* text=auto eol=lf
```

### Platform-specific scripts

```
*.bat text eol=crlf
*.cmd text eol=crlf
*.ps1 text eol=crlf
```

### Binary files

```
*.png, *.jpg, *.jpeg, *.gif, *.ico
*.pdf, *.zip
*.db, *.sqlite, *.sqlite3
*.node, *.dll, *.dylib, *.so
```

## Current State (2026-10-06)

- `.gitattributes` is in place and correct
- No mass normalization needed