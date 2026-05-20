# Knowledge tree PDF strict quiz scope fix v5.6.9

本版修正知識樹節點出題規則：PDF 綱目節點不再用關鍵字或全題庫 fallback。若節點已有 question_ids，嚴格使用該題組；若小標題沒有獨立題組，但有合適的上層 PDF 題組，會清楚標示「上層題」並沿用上層題組；若完全沒有可對應題目，按鈕顯示暫無題。

| View | Nodes | Own scope | Inherited scope | No scope |
|---|---:|---:|---:|---:|
| shanghan_classic | 181 | 107 | 65 | 9 |
| jingui_classic | 50 | 47 | 0 | 3 |
| wenbing_stage | 69 | 55 | 2 | 12 |
| zhengzhi_syndrome | 68 | 65 | 0 | 3 |
| diagnosis_diagnostics | 20 | 20 | 0 | 0 |
| shanghan_sections | 181 | 107 | 65 | 9 |
| jingui_sections | 50 | 47 | 0 | 3 |
| wenbing_sections | 69 | 55 | 2 | 12 |
| zhengzhi_sections | 68 | 65 | 0 | 3 |
| diagnosis_sections | 20 | 20 | 0 | 0 |

## Inherited examples

### shanghan_classic
- 一、太陽病脈證提綱 → 沿用 `第一節 太陽病綱要` (2 題)
- 三、辨病發於陽、病發於陰 → 沿用 `第一節 太陽病綱要` (2 題)
- 四、辨傳辨與欲解時 → 沿用 `第一節 太陽病綱要` (2 題)
- 桂枝湯證 → 沿用 `一、中風表虛證` (29 題)
- 桂枝湯禁例 → 沿用 `一、中風表虛證` (29 題)
- 兼證 → 沿用 `一、中風表虛證` (29 題)
- 麻黃湯證 → 沿用 `二、傷寒表實證` (21 題)
- 麻黃湯禁例 → 沿用 `二、傷寒表實證` (21 題)
- 麻黃湯兼證 → 沿用 `二、傷寒表實證` (21 題)
- 梔子鼓湯類證 → 沿用 `五、熱證` (11 題)
### wenbing_stage
- 1.3 辨舌苔：灰苔 → 沿用 `第一節 辨舌` (17 題)
- 1.4 辨舌苔：黑苔 → 沿用 `第一節 辨舌` (17 題)
### shanghan_sections
- 一、太陽病脈證提綱 → 沿用 `第一節 太陽病綱要` (2 題)
- 三、辨病發於陽、病發於陰 → 沿用 `第一節 太陽病綱要` (2 題)
- 四、辨傳辨與欲解時 → 沿用 `第一節 太陽病綱要` (2 題)
- 桂枝湯證 → 沿用 `一、中風表虛證` (29 題)
- 桂枝湯禁例 → 沿用 `一、中風表虛證` (29 題)
- 兼證 → 沿用 `一、中風表虛證` (29 題)
- 麻黃湯證 → 沿用 `二、傷寒表實證` (21 題)
- 麻黃湯禁例 → 沿用 `二、傷寒表實證` (21 題)
- 麻黃湯兼證 → 沿用 `二、傷寒表實證` (21 題)
- 梔子鼓湯類證 → 沿用 `五、熱證` (11 題)
### wenbing_sections
- 1.3 辨舌苔：灰苔 → 沿用 `第一節 辨舌` (17 題)
- 1.4 辨舌苔：黑苔 → 沿用 `第一節 辨舌` (17 題)

## No-scope examples

### shanghan_classic
- 概說：no own question_ids and no suitable non-empty ancestor
- 一、變證治則：no own question_ids and no suitable non-empty ancestor
- 二、辨虛證實證：no own question_ids and no suitable non-empty ancestor
- 十四、火逆證：no own question_ids and no suitable non-empty ancestor
- 十五、欲愈候：no own question_ids and no suitable non-empty ancestor
- 概說：no own question_ids and no suitable non-empty ancestor
- 概說：no own question_ids and no suitable non-empty ancestor
- 概說：no own question_ids and no suitable non-empty ancestor
- 陰陽易差後勞復病備考原文：no own question_ids and no suitable non-empty ancestor
### jingui_classic
- 驚悸：no own question_ids and no suitable non-empty ancestor
- 瘡癰：no own question_ids and no suitable non-empty ancestor
- 腸癰：no own question_ids and no suitable non-empty ancestor
### wenbing_stage
- 第一節 風溫概說：no own question_ids and no suitable non-empty ancestor
- 第二節 風溫辨證論治：no own question_ids and no suitable non-empty ancestor
- 第一節 春溫概說：no own question_ids and no suitable non-empty ancestor
- 第二節 春溫辨證論治：no own question_ids and no suitable non-empty ancestor
- 第一節 暑溫概說：no own question_ids and no suitable non-empty ancestor
- 第二節 暑溫辨證論治：no own question_ids and no suitable non-empty ancestor
- 第一節 濕溫概說：no own question_ids and no suitable non-empty ancestor
- 第二節 濕溫辨證論治：no own question_ids and no suitable non-empty ancestor
- 第一節 伏暑概說：no own question_ids and no suitable non-empty ancestor
- 第二節 伏暑辨證論治：no own question_ids and no suitable non-empty ancestor
### zhengzhi_syndrome
- 第一章 中醫內科學術理論的源流和發展：no own question_ids and no suitable non-empty ancestor
- 第三章 臟腑病機四大要素：no own question_ids and no suitable non-empty ancestor
- 第四章 中醫病機的內涵與特色：no own question_ids and no suitable non-empty ancestor
### shanghan_sections
- 概說：no own question_ids and no suitable non-empty ancestor
- 一、變證治則：no own question_ids and no suitable non-empty ancestor
- 二、辨虛證實證：no own question_ids and no suitable non-empty ancestor
- 十四、火逆證：no own question_ids and no suitable non-empty ancestor
- 十五、欲愈候：no own question_ids and no suitable non-empty ancestor
- 概說：no own question_ids and no suitable non-empty ancestor
- 概說：no own question_ids and no suitable non-empty ancestor
- 概說：no own question_ids and no suitable non-empty ancestor
- 陰陽易差後勞復病備考原文：no own question_ids and no suitable non-empty ancestor
### jingui_sections
- 驚悸：no own question_ids and no suitable non-empty ancestor
- 瘡癰：no own question_ids and no suitable non-empty ancestor
- 腸癰：no own question_ids and no suitable non-empty ancestor
### wenbing_sections
- 第一節 風溫概說：no own question_ids and no suitable non-empty ancestor
- 第二節 風溫辨證論治：no own question_ids and no suitable non-empty ancestor
- 第一節 春溫概說：no own question_ids and no suitable non-empty ancestor
- 第二節 春溫辨證論治：no own question_ids and no suitable non-empty ancestor
- 第一節 暑溫概說：no own question_ids and no suitable non-empty ancestor
- 第二節 暑溫辨證論治：no own question_ids and no suitable non-empty ancestor
- 第一節 濕溫概說：no own question_ids and no suitable non-empty ancestor
- 第二節 濕溫辨證論治：no own question_ids and no suitable non-empty ancestor
- 第一節 伏暑概說：no own question_ids and no suitable non-empty ancestor
- 第二節 伏暑辨證論治：no own question_ids and no suitable non-empty ancestor
### zhengzhi_sections
- 第一章 中醫內科學術理論的源流和發展：no own question_ids and no suitable non-empty ancestor
- 第三章 臟腑病機四大要素：no own question_ids and no suitable non-empty ancestor
- 第四章 中醫病機的內涵與特色：no own question_ids and no suitable non-empty ancestor

## Validation after patch

| View | Nodes | Can launch by PDF scope | Still empty | Missing question IDs |
|---|---:|---:|---:|---:|
| shanghan_sections | 181 | 172 | 9 | 0 |
| jingui_sections | 50 | 47 | 3 | 0 |
| wenbing_sections | 69 | 57 | 12 | 0 |
| zhengzhi_sections | 68 | 65 | 3 | 0 |
| diagnosis_sections | 20 | 20 | 0 | 0 |
