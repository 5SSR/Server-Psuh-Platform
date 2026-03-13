# IDC 二手服务器交易平台

- 目标：一期跑通“担保交易闭环”，后续逐步扩展议价/求购/寄售。
- 文档：`docs/architecture.md` 提供 ERD、状态机与接口草案。
- 技术栈（推荐）：NestJS + Next.js + PostgreSQL + Redis + pnpm + turbo。

## 仓库结构
- apps/api：后端 API（NestJS）
- apps/web：前端（Next.js App Router）
- packages/shared：共享类型与 DTO
- docs：设计与规范文档

## 快速开始
1. 安装 pnpm：`npm i -g pnpm@9`
2. 安装依赖：`pnpm install`
3. 启动全部服务：`pnpm dev`（turbo 并行 web + api）

## 注意
- 所有代码注释与文档统一使用中文。
- 首个迭代聚焦核心交易链路与安全性。
