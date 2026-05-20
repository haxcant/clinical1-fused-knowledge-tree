# v5.6.9 / L11 data-page PDF TOC rebuild report

## Scope
This patch only rebuilds the five dedicated source-data pages and their section-to-quiz scopes. It does not change core quiz logic, formula logic, relation graph logic, or L11 sharding strategy.

## Main fixes

1. Rebuilt the five book source pages from the uploaded PDF tables of contents.
2. Added PDF-section question mapping by detecting question markers such as `【108-1-臨床一-19】` in each PDF page.
3. Section-level quiz buttons now pass `question_ids` gathered from that section and all descendants. This avoids the old failure mode where UI section IDs did not match quiz-bank section IDs.
4. Replaced the old zhengzhi/diagnosis standalone data tabs with the same PDF-TOC source-page view used by shanghan/jingui/wenbing, so all five books have consistent behavior.
5. Source pages now show question counts, PDF page ranges, direct/descendant question markers, and a focused section detail panel.

## Rebuild summary

| Book | PDF TOC sections | PDF question markers | Markers matched to quiz bank | Unique matched quiz ids | Sections with questions |
|---|---:|---:|---:|---:|---:|
| shanghan | 181 | 399 | 399 | 1151 | 107 |
| jingui | 50 | 365 | 365 | 1060 | 47 |
| wenbing | 69 | 368 | 368 | 704 | 55 |
| zhengzhi | 68 | 831 | 825 | 1062 | 65 |
| diagnosis | 20 | 240 | 240 | 688 | 20 |

## Spot checks

- `溫病的病因與發病`: 30 matched quiz ids / markers, no longer empty.
- `第一章 辨太陽病脈證並治`: descendant section scope includes the full chapter question set.
- `臟腑經絡先後病脈證第一`: 21 matched quiz ids / markers.
- `痙濕暍病脈證治第二`: 69 matched quiz ids / markers.

## Caveat

Some PDF question markers map to both official-exam questions and PDF-note duplicate rows in the quiz payload. The source page intentionally passes all matched IDs; the existing quiz layer selector still controls whether official-only or broader question sources are used.
