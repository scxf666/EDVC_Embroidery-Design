# EDVC - Embroidery Design Viewer and Converter

EDVC 是一个专业的刺绣设计查看和转换工具，支持多种刺绣文件格式的查看、编辑和转换。

## 功能特点

- **支持多种刺绣文件格式**：DST, PES, JEF, EXP, VP3, PEC, XXX, SEW, DSB, U01, TBF
- **实时预览和编辑**：实时查看刺绣设计，支持缩放、平移等操作
- **格式转换**：在不同刺绣格式之间进行转换
- **图片导出**：将刺绣设计导出为图片格式
- **多语言界面**：支持中文、英文、西班牙语三种语言
- **背景图片支持**：支持添加背景图片（包括SVG矢量图形）
- **描述文本**：添加和管理描述文本
- **针迹动画**：查看刺绣针迹的动画效果
- **颜色管理**：支持自定义线色

## 技术栈

- **前端**：HTML5, CSS3, JavaScript
- **后端**：Python, Flask
- **图像处理**：PIL (Python Imaging Library)
- **国际化**：自定义国际化实现

## 安装和运行

### 前提条件

- Python 3.6 或更高版本
- pip 包管理工具

### 安装依赖

```bash
pip install flask pillow
```

### 运行项目

1. 直接运行 `start.bat` 脚本（Windows）：

```bash
./start.bat
```

2. 或者手动运行：

```bash
python main.py
```

3. 访问 http://localhost:6010 打开应用

## 使用说明

1. **打开文件**：点击"打开"按钮选择刺绣文件
2. **添加背景**：点击"添加背景"按钮添加背景图片（支持SVG）
3. **导出图片**：点击"导出图片"按钮将设计导出为图片
4. **转换格式**：点击"转换格式"按钮选择目标格式进行转换
5. **查看针迹**：在左侧面板查看针迹清单和动画
6. **添加描述**：在左侧面板添加描述文本
7. **调整语言**：在右上角选择界面语言

## 项目结构

```
EDVC_Deploy-V0.5/
├── static/                # 静态资源
│   ├── css/              # CSS样式
│   │   └── style.css     # 主样式文件
│   ├── data/             # 数据文件
│   │   ├── contact_info.json  # 联系信息
│   │   └── thread_colors.json # 线色数据
│   └── js/               # JavaScript文件
│       └── app.js        # 主应用逻辑
├── templates/            # HTML模板
│   ├── index.html        # 主页面
│   ├── T恤.svg           # 示例SVG文件
│   └── ic_帽子.svg        # 示例SVG文件
├── main.py               # 主应用文件
├── start.bat             # 启动脚本
├── test_screenshot.py    # 测试脚本
├── edvc_screenshot.png   # 应用截图
└── README.md             # 项目说明
```

## 核心功能模块

### 1. 文件处理
- 支持多种刺绣文件格式的读取
- 文件信息解析和显示
- 格式转换功能

### 2. 画布操作
- 实时预览刺绣设计
- 缩放和平移功能
- 背景图片管理
- 针迹动画播放

### 3. 国际化支持
- 多语言界面切换
- 翻译字典管理
- 动态文本更新

### 4. 数据管理
- 描述文本管理
- 针迹数据处理
- 背景图片存储

## 贡献指南

1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件

## 联系我们

- **Email**：support@edvc.com
- **Phone**：+86 123 4567 8910
- **Website**：www.edvc.com

---

© 2026 EDVC Team. All rights reserved.