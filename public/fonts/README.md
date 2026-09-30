# Local font assets

## ContyGo Motion

`cabinet-grotesk-700.woff2` and `cabinet-grotesk-800.woff2` are unmodified Cabinet Grotesk fonts from Fontshare, downloaded on 2026-09-14 for `/contygo-motion` and loaded with `next/font/local` only on that route.

- Family and license: https://www.fontshare.com/fonts/cabinet-grotesk and https://www.fontshare.com/licenses/itf-ffl
- Official source stylesheet: https://api.fontshare.com/v2/css?f[]=cabinet-grotesk@400,500,700,800&display=swap

## Existing families

These unmodified WOFF2 files were downloaded from the official Google Fonts CDN
on 2026-09-10. The four families are loaded with `next/font/local` from
`app/layout.tsx`, so development and production builds do not request Google Fonts.

The source CSS was obtained from:

https://fonts.googleapis.com/css2?family=Nunito:wght@400..800&family=Nunito+Sans:wght@400..800&family=Source+Sans+3:wght@400..800&family=Source+Serif+4:wght@400..800&display=swap

The `latin` subset includes Spanish accented letters, ñ, ü, ¿ and ¡. Binary
metadata and glyph coverage were checked with the Fontkit parser bundled in Next.js.
All four files contain a variable `wght` axis, including every weight used by
the application. The declarations preserve Nunito 800, Nunito Sans 400–800,
Source Sans 3 400–700 and Source Serif 4 400–700.

| File | Original download | Weight axis in binary | License |
| --- | --- | --- | --- |
| `nunito-latin-variable.woff2` | https://fonts.gstatic.com/s/nunito/v32/XRXV3I6Li01BKofINeaB.woff2 | 200–1000 | `licenses/Nunito-OFL.txt` |
| `nunito-sans-latin-variable.woff2` | https://fonts.gstatic.com/s/nunitosans/v19/pe0TMImSLYBIv1o4X1M8ce2xCx3yop4tQpF_MeTm0lfGWVpNn64CL7U8upHZIbMV51Q42ptCp7t1R-s.woff2 | 200–1000 | `licenses/NunitoSans-OFL.txt` |
| `source-sans-3-latin-variable.woff2` | https://fonts.gstatic.com/s/sourcesans3/v19/nwpStKy2OAdR1K-IwhWudF-R3w8aZQ.woff2 | 200–900 | `licenses/SourceSans3-OFL.txt` |
| `source-serif-4-latin-variable.woff2` | https://fonts.gstatic.com/s/sourceserif4/v14/vEFF2_tTDB4M7-auWDN0ahZJW3IX2ih5nk3AucvUHf6kDXr4.woff2 | 200–900 | `licenses/SourceSerif4-OFL.txt` |

The licenses were copied unmodified from the official Google Fonts repository:

- https://raw.githubusercontent.com/google/fonts/main/ofl/nunito/OFL.txt
- https://raw.githubusercontent.com/google/fonts/main/ofl/nunitosans/OFL.txt
- https://raw.githubusercontent.com/google/fonts/main/ofl/sourcesans3/OFL.txt
- https://raw.githubusercontent.com/google/fonts/main/ofl/sourceserif4/OFL.txt
