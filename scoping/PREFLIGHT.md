# Rebuild preflight

Each row ran the real build pipeline on a small sample (first page, written to a throwaway folder) and validated the output: required columns, unique ids, no browser-unsafe column types, geometry decodes and sits inside the state's extent, at least one counted section, manifest has sha256 and source. Generated 2026-11-12T19:37Z by scripts/preflight.ts.

**54 of 54 passed.**

| Source | Result | Sample rows | Counted | With lanes | attr | Sample time | Full build: pages | est. size | Issues |
|---|---|---|---|---|---|---|---|---|---|
| MO HPMS | pass | 2000 | 2000 | 0 | yes | 4.1s | 265 | 90 MB |  |
| MO native (MoDOT) | pass | 86525 | 70750 | 70695 | yes | 374.8s | 265 | 90 MB |  |
| AR HPMS | pass | 2000 | 2000 | 2000 | yes | 16.2s | 106 | 36 MB |  |
| AR native (ARDOT) | pass | 2000 | 215 | 2000 | yes | 3.4s | 106 | 36 MB |  |
| OK HPMS | pass | 2000 | 2000 | 1918 | yes | 19.9s | 208 | 70 MB |  |
| KS HPMS | pass | 2000 | 2000 | 2000 | yes | 17.5s | 131 | 44 MB |  |
| NE HPMS | pass | 2000 | 2000 | 1987 | yes | 18.5s | 128 | 43 MB |  |
| IA HPMS | pass | 2000 | 2000 | 1779 | yes | 9.1s | 207 | 70 MB |  |
| IL HPMS | pass | 2000 | 2000 | 2000 | yes | 24s | 215 | 73 MB |  |
| KY HPMS | pass | 2000 | 2000 | 2000 | yes | 25.7s | 176 | 60 MB |  |
| TN HPMS | pass | 2000 | 2000 | 2000 | yes | 30.3s | 132 | 45 MB |  |
| TX HPMS | pass | 2000 | 2000 | 2000 | yes | 35.8s | 459 | 156 MB |  |
| NM HPMS | pass | 2000 | 2000 | 2000 | yes | 11.2s | 79 | 27 MB |  |
| CO HPMS | pass | 2000 | 2000 | 2000 | yes | 20.3s | 103 | 35 MB |  |
| WY HPMS | pass | 2000 | 2000 | 1793 | yes | 10.1s | 41 | 14 MB |  |
| SD HPMS | pass | 2000 | 2000 | 2000 | yes | 8s | 57 | 19 MB |  |
| MN HPMS | pass | 2000 | 2000 | 2000 | yes | 27.7s | 270 | 92 MB |  |
| WI HPMS | pass | 2000 | 2000 | 1885 | yes | 47s | 437 | 149 MB |  |
| IN HPMS | pass | 2000 | 2000 | 1856 | yes | 46.5s | 306 | 104 MB |  |
| OH HPMS | pass | 2000 | 2000 | 2000 | yes | 33.9s | 247 | 84 MB |  |
| WV HPMS | pass | 2000 | 2000 | 2000 | yes | 24s | 104 | 35 MB |  |
| VA HPMS | pass | 2000 | 2000 | 12 | yes | 52.5s | 285 | 97 MB |  |
| NC HPMS | pass | 2000 | 2000 | 2000 | yes | 36.4s | 217 | 74 MB |  |
| GA HPMS | pass | 2000 | 2000 | 2000 | yes | 28.5s | 189 | 64 MB |  |
| AL HPMS | pass | 2000 | 2000 | 1779 | yes | 26.9s | 179 | 61 MB |  |
| MS HPMS | pass | 2000 | 2000 | 2000 | yes | 23.3s | 91 | 31 MB |  |
| MS native (RCI copy) | pass | 1787 | 1619 | 1787 | yes | 1.3s | 91 | 31 MB |  |
| LA HPMS | pass | 2000 | 2000 | 2000 | yes | 26.1s | 190 | 65 MB |  |
| AZ HPMS | pass | 2000 | 2000 | 1824 | yes | 28.1s | 237 | 80 MB |  |
| UT HPMS | pass | 2000 | 2000 | 1978 | yes | 19.5s | 142 | 48 MB |  |
| ID HPMS | pass | 2000 | 2000 | 1798 | yes | 18.6s | 97 | 33 MB |  |
| MT HPMS | pass | 2000 | 2000 | 1542 | yes | 5.8s | 65 | 22 MB |  |
| ND HPMS | pass | 2000 | 2000 | 2000 | yes | 7.5s | 52 | 18 MB |  |
| MI HPMS | pass | 2000 | 2000 | 2000 | yes | 20s | 150 | 51 MB |  |
| PA HPMS | pass | 2000 | 2000 | 1959 | yes | 30.7s | 386 | 131 MB |  |
| MD HPMS | pass | 2000 | 2000 | 2000 | yes | 18.5s | 76 | 26 MB |  |
| SC HPMS | pass | 2000 | 2000 | 2000 | yes | 19.6s | 136 | 46 MB |  |
| FL HPMS | pass | 2000 | 2000 | 2000 | yes | 37.1s | 556 | 189 MB |  |
| CA HPMS | pass | 2000 | 2000 | 2000 | yes | 32.7s | 402 | 137 MB |  |
| NV HPMS | pass | 2000 | 2000 | 2000 | yes | 12.6s | 51 | 17 MB |  |
| OR HPMS | pass | 2000 | 2000 | 2000 | yes | 25.4s | 286 | 97 MB |  |
| WA HPMS | pass | 2000 | 2000 | 2000 | yes | 15.8s | 141 | 48 MB |  |
| NY HPMS | pass | 2000 | 2000 | 1997 | yes | 24.5s | 366 | 124 MB |  |
| NJ HPMS | pass | 2000 | 2000 | 2000 | yes | 13.6s | 80 | 27 MB |  |
| DE HPMS | pass | 2000 | 2000 | 2000 | yes | 7.6s | 48 | 16 MB |  |
| DE native (DelDOT) | pass | 4134 | 4134 | 0 | yes | 4.9s | 48 | 16 MB |  |
| VT HPMS | pass | 2000 | 2000 | 1996 | yes | 5.2s | 33 | 11 MB |  |
| MA HPMS | pass | 2000 | 2000 | 2000 | yes | 11.3s | 183 | 62 MB |  |
| CT HPMS | pass | 2000 | 2000 | 2000 | yes | 6.3s | 47 | 16 MB |  |
| NH HPMS | pass | 2000 | 2000 | 2000 | yes | 6.4s | 42 | 14 MB |  |
| RI HPMS | pass | 2000 | 2000 | 1899 | yes | 4.7s | 29 | 10 MB |  |
| ME HPMS | pass | 2000 | 2000 | 2000 | yes | 5.1s | 53 | 18 MB |  |
| AK HPMS | pass | 2000 | 2000 | 2000 | yes | 4.7s | 29 | 10 MB |  |
| HI HPMS | pass | 2000 | 2000 | 2000 | yes | 4.4s | 41 | 14 MB |  |
