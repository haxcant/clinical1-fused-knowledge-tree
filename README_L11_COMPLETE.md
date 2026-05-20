# Clinical1 v5.6.8 L11 Complete

本包是 v5.6.8 bugfix polish reviewed full 的 L11 完整懶載入版。

## 原則

- 不刪減應有知識內容。
- 大型 runtime payload 改用 stub + shard/reconstruct bundle。
- 首頁不自動載入搜尋、題庫、知識樹、學習頁等大型資料。
- 點進功能或執行搜尋時，才按需載入資料。
- 移除 runtime 不需要的開發稽核資料與重複 debug 檔。

## 啟動

Windows：雙擊

```bat
00_START_CLINICAL1_FUSED_L11_COMPLETE.bat
```

手動啟動：

```bat
python -m http.server 8756 --bind 127.0.0.1
```

然後開：

```text
http://127.0.0.1:8756/app/index.html?v=L11-COMPLETE
```

## GitHub Pages 部署

直接部署整個資料夾內容即可。必要 runtime：

```text
index.html
app/
lazy_loading_manifest.json
payload_size_report.md
README_L11_COMPLETE.md
```

`reports/` 只放 L11 報告，不是 runtime 必須。

## 驗收摘要

見：

```text
payload_size_report.md
lazy_loading_manifest.json
lazy_loading_regression_report.json
```

目前主要指標：

```text
初始 app shell 估計：約 0.30 MB
最大單一 JSON：約 14.65 MB
GitHub Pages：純靜態相對路徑，可部署
```
