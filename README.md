# FilmRank

FilmRank 是一个面向电影与电视内容的发现与收藏平台，前端基于 Vue 3，后端使用 Node.js + Express + MySQL，并集成 TMDB 数据源。

## 功能概览
- 首页内容发现：今日专属片单、本周热映、电视播出分区
- 搜索与筛选：支持片名/导演/演员/角色搜索与多条件筛选
- 详情页：电影/电视详情、TMDB 评论、演员表、关键词
- 个人中心：收藏记录、书签记录、简介编辑
- 访问性：跳转主内容、清晰焦点样式、动态提示

## 项目结构
- `client/`：前端 Vue 3 应用
- `server/`：后端 Express API
- `server/src/db/`：数据库结构与升级脚本
- `docker-compose.yml`：Docker 本地开发/部署配置

## 技术栈
前端：
- Vue 3 + Vue Router
- Vite 构建工具

后端：
- Express + mysql2
- JWT 鉴权 + bcryptjs

数据库：
- MySQL 8

部署：
- Docker Compose + Nginx（前端静态托管并代理 `/api`）

## 快速开始（推荐 Docker）
1) 启动服务：
```
docker compose up -d --build
```
2) 初始化数据库：
```
docker exec -i filmrank-db mysql -uroot -pfilmrank_root filmrank < server/src/db/schema.sql
```
3) 访问：
- 前端：`http://127.0.0.1/`
- 后端健康检查：`http://127.0.0.1:3000/health`

## 环境要求
- Node.js 18+（本地开发）
- Docker + Docker Compose（推荐）
- MySQL 8+（若不使用 Docker）

## 环境变量
`server/.env` 示例（如未提供可自行创建）：
```
PORT=3000
DB_HOST=127.0.0.1
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=filmrank
JWT_SECRET=change-me
TMDB_API_KEY=your_tmdb_key
TMDB_READ_ACCESS_TOKEN=your_tmdb_read_token
TMDB_LANGUAGE=zh-CN
TMDB_CACHE_DAYS=30
```

## 数据库初始化
1) 创建表结构：
```
mysql -uroot -p filmrank < server/src/db/schema.sql
```
2) 设置管理员（可选）：
```
UPDATE users SET role='admin' WHERE username='your_admin';
```

## 数据源与缓存策略
- 电影/电视数据来源：TMDB API
- 本地缓存：`movies` 表会记录 `last_fetched_at`，用于清理过期 TMDB 数据
- 建议：线上环境可加 Redis 或反向代理缓存，减轻 TMDB 访问压力

## 本地开发（不使用 Docker）
后端：
```
cd server
npm install
npm run dev
```

前端：
```
cd client
npm install
npm run dev
```

## Docker 启动
```
docker compose up -d --build
```

初始化数据库：
```
docker exec -i filmrank-db mysql -uroot -pfilmrank_root filmrank < server/src/db/schema.sql
```

访问地址：
- 前端：`http://127.0.0.1/`
- 后端健康检查：`http://127.0.0.1:3000/health`

## API 说明（摘要）
- 健康检查：`GET /health`
- 认证：`POST /api/auth/register`、`POST /api/auth/login`
- 电影：`GET /api/movies`、`GET /api/movies/:id`
- 电视：`GET /api/tv`、`GET /api/tv/:id`
- 书签：`POST /api/bookmarks`、`GET /api/bookmarks`、`DELETE /api/bookmarks/:movieId`
- 用户：`GET /api/users/me`、`PUT /api/users/me`

## 页面与交互说明
- 首页分页：本周热映/电视播出为数字分页 + 上下页
- 搜索页分页：数字分页，避免一次性加载过多内容
- 详情页：电影支持收藏与私人书签；电视详情仅展示信息

## 常见问题
1) 首页/搜索无数据
   - 确认 `TMDB_API_KEY` 与 `TMDB_READ_ACCESS_TOKEN` 已配置
   - 访问 `http://127.0.0.1:3000/health` 检查后端状态

2) 图片或数据加载慢
   - TMDB 请求受限流影响，建议增加缓存
   - 可降低分页的每页数量

3) 前端请求 404
   - 确认 Nginx 代理 `/api` 已启用（`client/nginx.conf`）

## 备注
- 首页与详情使用 TMDB 数据源，确保配置了 `TMDB_API_KEY` 与 `TMDB_READ_ACCESS_TOKEN`。
- 前端使用相对 `/api` 访问后端，生产环境由 Nginx 进行转发。
