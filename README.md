# 星核耀火 · 3D 导演台

浏览器中的 3D 场景与动作参考编辑器。可以摆放人物和道具、拖动关节、绘制路线、编排动作和机位、导出截图与参考视频。

## 使用

运行 `python3 -m http.server 8000`，在桌面浏览器打开 http://localhost:8000/ 。工程保存在当前浏览器，也可保存为 JSON 备份。使用「机位视角」预览录制画面。

## 目录

- director-studio：编辑器、时间轴、碰撞检测与独立生成人物的 cast.js。
- director-demo：编辑器依赖的道具几何和 Three.js 运行库。

Three.js 及 Lucide 图标的第三方声明分别位于 director-demo/vendor/LICENSE-Three.txt 和 director-studio/vendor/LUCIDE-LICENSE.txt。

## Demo 交接

- [公开试玩](https://yaweizhaofg-beep.github.io/xinghe-director-studio/director-studio/)
- [使用者产品说明（支持打印为 PDF）](https://yaweizhaofg-beep.github.io/xinghe-director-studio/guide/)
- [开发交接：启动、模块、数据、验收与限制](docs/DEVELOPER.md)
