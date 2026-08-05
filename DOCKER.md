# Docker 部署

本项目会在镜像构建阶段生成 VitePress 静态站点，并由非 root Nginx 在容器内的 `8080` 端口提供服务。SSL 和公网域名继续由家庭 Nginx Proxy Manager（NPM）负责。

## 启动

在项目根目录执行：

```bash
docker compose up -d --build
```

构建后的镜像名为 `registry.mgxnet.com/nightcity-archive:latest`。需要发布到私有仓库时执行：

```bash
docker login registry.mgxnet.com --username mgxnet
docker compose build --pull
docker compose push
```

浏览器访问 `http://家庭主机局域网IP:8080`。查看状态或日志：

```bash
docker compose ps
docker compose logs -f nightcity-archive
```

更新知识库或网站代码后，重新构建并启动：

```bash
docker compose up -d --build
```

停止服务：

```bash
docker compose down
```

## 接入现有公网架构

建议使用 `wiki.mgxnet.com`：

1. 添加 A 记录：`wiki.mgxnet.com` 指向 `154.44.28.190`。
2. 在家庭 NPM 新建 Proxy Host：
   - Domain Names：`wiki.mgxnet.com`
   - Scheme：`http`
   - Forward Hostname / IP：`192.168.31.4`
   - Forward Port：`8080`
   - Websockets Support：无需开启
3. 在 NPM 申请 Let's Encrypt 证书，并开启 Force SSL 与 HTTP/2 Support。

若 Docker 实际运行在其他局域网主机，请把 NPM 的转发 IP 改为该主机地址。

## 安全说明

- 容器只提供静态文件，不包含数据库、后台管理页或 Docker Socket。
- 运行进程为非 root；根文件系统只读，并启用了 `no-new-privileges`。
- 不要在路由器上将 `8080` 直接映射到公网；公网访问应仅经过 WireGuard、云端转发和家庭 NPM。
- 当前站点本身没有登录功能。若档案内容不应完全公开，请在 NPM 前增加访问控制（如 Access List），或接入独立身份认证服务。
- 建议定期更新基础镜像并重新构建：`docker compose build --pull`。
