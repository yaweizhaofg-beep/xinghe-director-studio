# 星核耀火 · 3D 导演台

浏览器中的 3D 场景与动作参考编辑器。可以摆放人物和道具、拖动关节、绘制路线、编排动作和机位、导出截图与参考视频。

## 使用

运行 `python3 -m http.server 8000`，在桌面浏览器打开 http://localhost:8000/ 。工程保存在当前浏览器，也可保存为 JSON 备份。使用「机位视角」预览录制画面。

## 代码导航

| 目录或入口 | 内容 |
|---|---|
| index.html、director-studio/studio.js | 编辑器页面和交互入口 |
| director-studio/scene/ | 场景、人物骨骼与关节限位、道具、碰撞 |
| director-studio/timeline/ | 动作、路径和运镜的时间计算 |
| director-studio/ui/ | 样式与图标 |
| vendor/ | Three.js 运行库和第三方许可 |
| guide/ | 面向使用者的图文说明 |
| docs/ | 面向开发者的交接和验收说明 |

## Demo 交接

- [打开可视化导演台](https://yaweizhaofg-beep.github.io/xinghe-director-studio/)
- [使用者产品说明（支持打印为 PDF）](https://yaweizhaofg-beep.github.io/xinghe-director-studio/guide/)
- [开发交接：启动、模块、数据、验收与限制](docs/DEVELOPER.md)

人物来源及授权范围见 [模型清单](director-studio/models/SOURCES.json)。
