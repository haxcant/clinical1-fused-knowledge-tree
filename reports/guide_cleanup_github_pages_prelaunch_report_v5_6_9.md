# Guide cleanup and GitHub Pages prelaunch assessment v5.6.9
## 修改內容
- 導覽頁已移除指定的綱目說明獨立區塊。
- 導覽頁流程卡片已移除指定前綴，改為「快速查資料」「照 PDF 綱目出題」「分析高頻考點」「讀單本書」。
- 保留前一版 PDF strict knowledge-tree quiz scope 修正。

## 自動檢查結果
- Overall status: **PASS**
- JS syntax check: 14 files passed via `node --check`
- JSON parse check: 104 files passed
- CSV readability check: 14 files passed
- HTML local asset references: passed
- Literal `loadJSON()` / `fetch()` local paths: passed
- Removed guide phrases check: passed

## Knowledge tree quiz scope validation
| View | Nodes | Own scope | Inherited scope | Empty scope | Scope ID refs | Missing question IDs |
|---|---:|---:|---:|---:|---:|---:|
| shanghan_sections | 181 | 107 | 65 | 9 | 2273 | 0 |
| jingui_sections | 50 | 47 | 0 | 3 | 541 | 0 |
| wenbing_sections | 69 | 55 | 2 | 12 | 774 | 0 |
| zhengzhi_sections | 68 | 65 | 0 | 3 | 1629 | 0 |
| diagnosis_sections | 20 | 20 | 0 | 0 | 449 | 0 |

Note: Empty scope means the PDF綱目 node has no directly or inherited question set. It should show disabled/empty status rather than falling back to keyword or full-bank quiz.

## Static size / GitHub Pages readiness
- Deploy folder files: 148
- Uncompressed deploy size: 283.083 MB
- No single file exceeds 100 MiB.
- Root `index.html` redirects to `app/index.html`.
- Static relative paths only; no server-side runtime required.

### Largest files
| Path | Size MB |
|---|---:|
| app/data/question_hotspot_payload_v3_1.json | 14.647 |
| app/data/search/search_payload_v3.json | 13.529 |
| app/data/l11/reconstruct/learning_exam_pattern_payload/comparison_index_0001.json | 10.872 |
| app/data/diagnosis_pages_payload.json | 10.712 |
| app/data/clinical1_fused_source_refs_v3.csv | 10.341 |
| app/data/formula_tools_payload_v3_1.json | 9.177 |
| app/data/l11/reconstruct/search_payload_full/base.json | 7.224 |
| app/data/formula/formula_page_blocks_v3.json | 5.944 |
| app/data/l11/reconstruct/knowledge_tree_payload/base.json | 5.847 |
| app/data/l11/reconstruct/quiz_question_bank_payload/base.json | 5.293 |
| app/data/l11/reconstruct/clinical1_fused_entity_pages_v3/pages_0002.json | 4.767 |
| app/data/l11/reconstruct/clinical1_fused_entity_pages_v3/pages_0007.json | 4.766 |

## Remaining limitations before launch
- Browser E2E was not run in this container, so final manual testing in Chrome/Edge is still required.
- Because the site loads large JSON payloads lazily, first use of search/knowledge tree/quiz can still take time on mobile or slow networks.
- Do not commit the ZIP file itself into the GitHub Pages source branch; commit the extracted site folder contents.
