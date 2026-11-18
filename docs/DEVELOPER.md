# 技术交接 · 3D 导演台 Demo

本仓库是交互验证原型。交接基线是与本机一致的八种骨骼 GLB 人物。运行时不需要账号、服务端、外部模型地址或构建步骤。

## 启动和发布

在仓库根目录运行 `python3 -m http.server 8000`，访问 [编辑器](http://localhost:8000/director-studio/) 或 [使用说明](http://localhost:8000/guide/)。必须从根目录服务，因为编辑器跨目录引用 Three.js 和道具。GitHub Pages 从 main 分支根目录发布；修改入口脚本后注意 HTML 和模块 URL 的缓存版本。

## 从哪里读代码

| 文件 | 职责 |
|---|---|
| index.html、director-studio/ui/ | DOM 控件、布局、主题和本地图标 |
| director-studio/studio.js | 交互入口。mount 创建场景对象，updateScene 按时间求姿势与机位，frame 渲染导演和拍摄视角；tracks 绘制轨道，restore 导入工程 |
| director-studio/scene/scene.js、director-studio/models/ | 三维场景、角色骨骼、姿势预设与路径采样；人物从同站 GLB 加载 |
| director-studio/timeline/sequence.js | 片段区间与源动作进度映射；分割保留原动作进度 |
| director-studio/scene/collision.js | 骨骼胶囊、道具包围盒、地面与移动过程检测 |
| director-studio/scene/props.js、vendor/three/ | 道具与 Three.js 运行库。该目录是公开编辑器的运行依赖 |

## 数据和输出

工程 JSON 保存对象 ID、类型、姿势、变换、路径、机位、片段和列表排序。运行时 visual、tag 不序列化。动作与路线的时间单位为秒；片段 start、length 定位时间，from、to 定位源动作区间。自动保存使用 localStorage；截图与录像用 IndexedDB 单独保存。输出取自机位画布，编辑标签、操控杆和网格不应出现在成片。

## 发布前回归用例

1. 新开浏览器配置，确认默认三人出现。换体型、转头、拖手脚，确认选中人物变化。
2. 按使用说明制作 4 秒动作与推镜。分割动作、挪动后半段、改颜色，再撤销；检查分割点动作衔接和机位预览。
3. 画一条绕开椅子的路线，再测试穿过椅子的路线，观察阻挡与回退。上下交换两个人物，核对列表和轨道同步。
4. 保存 JSON、刷新、重新导入，对照动作、备注、排序和时长。分别下载截图和视频，核对画幅、时长及编辑控件是否被排除。
5. 在目标客户使用的浏览器验证 WebGL、MediaRecorder、长时间录制、窄屏和存储配额。在同一浏览器来源下测试旧工程导入。

## 从 Demo 到正式产品

- 现有动作是从站姿进入预设并还原；复杂连续表演需要姿势关键帧与插值设计。
- 碰撞是近似体积检测。把极端体型、坐卧、快速跨越障碍作为回归样例，明确可接受误差。
- 本地数据没有云端备份或多人协作。正式交付前补工程格式版本、迁移、导入失败处理和存储恢复测试。
- 模型来源及校验值见 director-studio/models/SOURCES.json。新增模型须核对网页分发和成片使用范围。保留仓库内 Three.js 与 Lucide 第三方声明。
