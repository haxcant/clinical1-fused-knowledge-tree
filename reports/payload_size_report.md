# L11 Complete Payload Size Report
Base: v5.6.8 bugfix polish reviewed full. This package keeps required content and makes large data lazy-loaded.
- Estimated initial app shell payload: **0.301 MB**
- Largest physical JSON: **14.647 MB**
- Deploy folder size: **278.54 MB**

## Runtime lazy-loading changes
- Search no longer auto-loads on the default page. The user must press 搜尋.
- Entity pages are split into shards and loaded per node.
- Questions are indexed by id and individual question pages can be loaded without full quiz reconstruction.
- Knowledge tree / quiz / learning payloads remain fully available through on-demand reconstruct bundles.
- Section CSV is exposed as per-book section shards for L11 navigation/indexing.

## Largest files

| file | size MB |
|---|---:|
| `app/data/question_hotspot_payload_v3_1.json` | 14.65 |
| `app/data/search/search_payload_v3.json` | 13.53 |
| `app/data/l11/reconstruct/learning_exam_pattern_payload/comparison_index_0001.json` | 10.87 |
| `app/data/diagnosis_pages_payload.json` | 10.71 |
| `app/data/clinical1_fused_source_refs_v3.csv` | 10.34 |
| `app/data/formula_tools_payload_v3_1.json` | 9.18 |
| `app/data/l11/reconstruct/search_payload_full/base.json` | 7.22 |
| `app/data/formula/formula_page_blocks_v3.json` | 5.94 |
| `app/data/l11/reconstruct/quiz_question_bank_payload/base.json` | 5.29 |
| `app/data/l11/reconstruct/clinical1_fused_entity_pages_v3/pages_0002.json` | 4.77 |
| `app/data/l11/reconstruct/clinical1_fused_entity_pages_v3/pages_0007.json` | 4.77 |
| `app/data/l11/reconstruct/clinical1_fused_entity_pages_v3/pages_0004.json` | 4.77 |
| `app/data/l11/reconstruct/clinical1_fused_entity_pages_v3/pages_0005.json` | 4.76 |
| `app/data/l11/reconstruct/clinical1_fused_entity_pages_v3/pages_0006.json` | 4.76 |
| `app/data/l11/reconstruct/clinical1_fused_entity_pages_v3/pages_0000.json` | 4.76 |
| `app/data/l11/reconstruct/clinical1_fused_entity_pages_v3/pages_0001.json` | 4.76 |
| `app/data/l11/reconstruct/clinical1_fused_entity_pages_v3/pages_0008.json` | 4.75 |
| `app/data/l11/reconstruct/clinical1_fused_entity_pages_v3/pages_0009.json` | 4.75 |
| `app/data/l11/reconstruct/clinical1_fused_entity_pages_v3/pages_0003.json` | 4.75 |
| `app/data/l11/reconstruct/knowledge_tree_payload/graph_edges_0004.json` | 4.29 |
| `app/data/l11/reconstruct/knowledge_tree_payload/graph_edges_0002.json` | 4.29 |
| `app/data/l11/reconstruct/knowledge_tree_payload/graph_edges_0000.json` | 4.29 |
| `app/data/l11/reconstruct/knowledge_tree_payload/graph_edges_0003.json` | 4.29 |
| `app/data/l11/reconstruct/knowledge_tree_payload/graph_edges_0005.json` | 4.29 |
| `app/data/l11/reconstruct/search_payload_full/docs_0000.json` | 4.29 |
| `app/data/l11/reconstruct/knowledge_tree_payload/graph_edges_0001.json` | 4.29 |
| `app/data/l11/reconstruct/search_payload_full/docs_0001.json` | 4.29 |
| `app/data/l11/reconstruct/quiz_question_bank_payload/questions_0001.json` | 4.29 |
| `app/data/l11/reconstruct/quiz_question_bank_payload/questions_0002.json` | 4.29 |
| `app/data/l11/reconstruct/quiz_question_bank_payload/questions_0000.json` | 4.29 |
| `app/data/l11/reconstruct/quiz_question_bank_payload/questions_0003.json` | 4.29 |
| `app/data/pivot_analysis_payload.json` | 4.28 |
| `app/data/l11/reconstruct/knowledge_tree_payload/questions_by_entity_0000.json` | 3.93 |
| `app/data/zhengzhi_pages_payload.json` | 3.67 |
| `app/data/l11/reconstruct/knowledge_tree_payload/graph_edges_0006.json` | 2.97 |

## Largest JSON files

| json | size MB |
|---|---:|
| `app/data/question_hotspot_payload_v3_1.json` | 14.65 |
| `app/data/search/search_payload_v3.json` | 13.53 |
| `app/data/l11/reconstruct/learning_exam_pattern_payload/comparison_index_0001.json` | 10.87 |
| `app/data/diagnosis_pages_payload.json` | 10.71 |
| `app/data/formula_tools_payload_v3_1.json` | 9.18 |
| `app/data/l11/reconstruct/search_payload_full/base.json` | 7.22 |
| `app/data/formula/formula_page_blocks_v3.json` | 5.94 |
| `app/data/l11/reconstruct/quiz_question_bank_payload/base.json` | 5.29 |
| `app/data/l11/reconstruct/clinical1_fused_entity_pages_v3/pages_0002.json` | 4.77 |
| `app/data/l11/reconstruct/clinical1_fused_entity_pages_v3/pages_0007.json` | 4.77 |
| `app/data/l11/reconstruct/clinical1_fused_entity_pages_v3/pages_0004.json` | 4.77 |
| `app/data/l11/reconstruct/clinical1_fused_entity_pages_v3/pages_0005.json` | 4.76 |
| `app/data/l11/reconstruct/clinical1_fused_entity_pages_v3/pages_0006.json` | 4.76 |
| `app/data/l11/reconstruct/clinical1_fused_entity_pages_v3/pages_0000.json` | 4.76 |
| `app/data/l11/reconstruct/clinical1_fused_entity_pages_v3/pages_0001.json` | 4.76 |
| `app/data/l11/reconstruct/clinical1_fused_entity_pages_v3/pages_0008.json` | 4.75 |
| `app/data/l11/reconstruct/clinical1_fused_entity_pages_v3/pages_0009.json` | 4.75 |
| `app/data/l11/reconstruct/clinical1_fused_entity_pages_v3/pages_0003.json` | 4.75 |
| `app/data/l11/reconstruct/knowledge_tree_payload/graph_edges_0004.json` | 4.29 |
| `app/data/l11/reconstruct/knowledge_tree_payload/graph_edges_0002.json` | 4.29 |
| `app/data/l11/reconstruct/knowledge_tree_payload/graph_edges_0000.json` | 4.29 |
| `app/data/l11/reconstruct/knowledge_tree_payload/graph_edges_0003.json` | 4.29 |
| `app/data/l11/reconstruct/knowledge_tree_payload/graph_edges_0005.json` | 4.29 |
| `app/data/l11/reconstruct/search_payload_full/docs_0000.json` | 4.29 |
| `app/data/l11/reconstruct/knowledge_tree_payload/graph_edges_0001.json` | 4.29 |
| `app/data/l11/reconstruct/search_payload_full/docs_0001.json` | 4.29 |
| `app/data/l11/reconstruct/quiz_question_bank_payload/questions_0001.json` | 4.29 |
| `app/data/l11/reconstruct/quiz_question_bank_payload/questions_0002.json` | 4.29 |
| `app/data/l11/reconstruct/quiz_question_bank_payload/questions_0000.json` | 4.29 |
| `app/data/l11/reconstruct/quiz_question_bank_payload/questions_0003.json` | 4.29 |
| `app/data/pivot_analysis_payload.json` | 4.28 |
| `app/data/l11/reconstruct/knowledge_tree_payload/questions_by_entity_0000.json` | 3.93 |
| `app/data/zhengzhi_pages_payload.json` | 3.67 |
| `app/data/l11/reconstruct/knowledge_tree_payload/graph_edges_0006.json` | 2.97 |
| `app/data/l11/reconstruct/knowledge_tree_payload/question_by_id_0000.json` | 2.94 |
