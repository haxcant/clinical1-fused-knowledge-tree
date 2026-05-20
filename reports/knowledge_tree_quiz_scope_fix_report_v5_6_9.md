# Knowledge Tree Quiz Scope Fix Report v5.6.9

## 修正摘要
- 知識樹五本書入口改以 PDF TOC 綱目／章節為主。
- 每個綱目節點直接帶入該章節與下層章節的 question_ids。
- question_ids 依 period + subject + question_no 去重，優先採 official_exam；若官方題不存在，保留 Bula 筆記題或 seed drill。
- 考題系統偵測到知識樹指定題組時，先套用 question_ids，再做年份／關鍵字等附加篩選，避免被題源或書本下拉選單篩成 0 題。

## 五本書驗收
- shanghan_sections: nodes=181, nodes_with_questions=107, unique_questions=380, layers={'official_exam': 380}, missing=0, duplicate_logical_key_nodes=0
- jingui_sections: nodes=50, nodes_with_questions=47, unique_questions=353, layers={'official_exam': 353}, missing=0, duplicate_logical_key_nodes=0
- wenbing_sections: nodes=69, nodes_with_questions=55, unique_questions=352, layers={'official_exam': 352}, missing=0, duplicate_logical_key_nodes=0
- zhengzhi_sections: nodes=68, nodes_with_questions=65, unique_questions=784, layers={'official_exam': 278, 'bula_note': 503, 'fragment_or_excluded': 3}, missing=0, duplicate_logical_key_nodes=0
- diagnosis_sections: nodes=20, nodes_with_questions=20, unique_questions=232, layers={'official_exam': 224, 'bula_note': 8}, missing=0, duplicate_logical_key_nodes=0

## 範例節點驗收
- wenbing_sections / 第二章 溫病的病因與發病: 15 題，layers={'official_exam': 15}
- shanghan_sections / 二、太陽病分類: 2 題，layers={'official_exam': 2}
- zhengzhi_sections / 第一節 感冒: 20 題，layers={'official_exam': 4, 'bula_note': 16}
- jingui_sections / 痙濕暍病脈證治第二: 23 題，layers={'official_exam': 23}
- diagnosis_sections / 第二篇：八綱: 12 題，layers={'official_exam': 12}
