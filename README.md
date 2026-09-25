# 打卡监督平台

两个人共用一间屋子、一只猫，和同一套家具拼图。各自完成当天的工作、学习或运动，拼图就会多一块。拼满之后，家具或衣服会出现在房间里。

界面默认是英文，左上角可以切到中文。

## 本地运行

```bash
npm install
npm run dev
```

浏览器打开 http://127.0.0.1:5173 。这个端口是固定的，如果提示已被占用，先关掉之前的开发服务再启动。

没有配置 Supabase 时，仍然可以在同一台电脑上用两个窗口一起玩。进度存在本机。

## 接上 Supabase

1. 在 [Supabase](https://supabase.com) 新建一个项目。
2. 打开 SQL Editor，整段运行 `supabase/schema.sql`。
3. 在 Authentication 里启用 Email 登录。如果希望注册后立刻进门，可以关掉 Confirm email。
4. 把项目地址和 anon key 写进 `.env`（不要提交这个文件）：

```bash
VITE_SUPABASE_URL=你的项目地址
VITE_SUPABASE_ANON_KEY=你的 anon key
```

可以先复制 `.env.example`，再改成自己的值。改完 `.env` 之后需要重新运行 `npm run dev`。

登录之后，建房、进房和打卡都会记在当前账号的用户 ID 上。换设备登录，还能回到原来的房间和拼图。创建房间会得到一个 6 位邀请码，链接形如 `/room/123456`。

## 一天怎么算

打卡日界是上海时间凌晨 4 点。每个模块每天每人只能「搞定啦」一次，得到 1 块碎片。「今天歇了」只是休息，不扣已经拼上的碎片。
