# Daybook

Daybook 是一个使用 Go 编写的极简静态博客与 Obsidian 笔记发布工具，用于把 `content/notes/` 中的 Markdown 笔记发布成静态网站。

当前版本已经完成首页、文章列表页、文章详情页、明暗主题、页面切换动画和基础 Markdown/GFM 渲染。

## 笔记格式

笔记放在 `content/notes/` 目录中，格式如下：

```markdown
---
title: "示例笔记"
date: "2026-06-08"
slug: "example-note"
tags: ["Go", "Blog"]
summary: "一段简短摘要。"
draft: false
---

这里是笔记正文。
```

必填字段：

- `title`
- `date`
- `slug`

可选字段：

- `tags`
- `summary`
- `draft`

当 `draft: true` 时，这篇笔记不会发布。

## 构建

```bash
go run ./cmd/daybook build
```

构建结果会生成到 `public/` 目录。

## 本地预览

先构建：

```bash
go run ./cmd/daybook build
```

再启动预览服务器：

```bash
go run ./cmd/daybook serve
```

访问：

```text
http://localhost:1313
```

## 辅助脚本

```bash
scripts/check.sh
scripts/build.sh
scripts/clean.sh
```

## 当前不包含

当前还没有实现 Obsidian 双链、嵌入笔记、callout、反链、关系图谱、标签页、归档页、RSS、sitemap 和搜索。
