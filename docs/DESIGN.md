# Design Notes

daybook 的当前视觉结构已经稳定，本文件只记录维护边界。

## Stable Areas

* `.persistent-logo` 已稳定，不要修改位置、字号、字体或结构。
* side-nav 已稳定，不要修改头像位置、链接顺序或导航结构。
* 首页 hero 已稳定，不要修改头像、昵称、slogan、社交图标布局。
* 文章列表页和文章详情页布局已稳定，结构重构时应保持 class 和语义不变。

## CSS Layers

`static/css/global.css` 是入口文件，并按职责导入 tokens、fonts、base、layout、components、markdown、transitions 和页面样式。

## Template Layers

`templates/layouts/` 放基础布局，`templates/pages/` 放页面模板，`templates/partials/` 放复用片段。

结构重构只移动边界，不重新设计 UI。
