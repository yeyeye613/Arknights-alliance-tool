# 第三方内容与许可

本仓库以 [MIT](LICENSE) 发布的部分限于自行编写的源代码。以下三类内容不属于本仓库所有，不随代码授权，权利人保留全部权利。

| 内容 | 位置 | 权利人 |
| --- | --- | --- |
| 游戏数据 | `frontend/src/data/` | 上海鹰角网络科技有限公司及其关联公司 |
| 游戏图像 | `frontend/public/resource/image/` | 上海鹰角网络科技有限公司及其关联公司 |
| PRTS 整理性内容 | 数据条目中的分类与层级划分 | PRTS 编辑者（CC BY-NC-SA 4.0） |

## 游戏数据

位置：`frontend/src/data/*.json`、`equipment.js`、`versions.js`。

来源：[PRTS 明日方舟中文 Wiki](https://prts.wiki) 的[卫戍协议：盟约](https://prts.wiki/w/卫戍协议：盟约)与[卫戍协议·规程 / PRTS盟约记录](https://prts.wiki/w/卫戍协议·规程/PRTS盟约记录)。

处理方式：页面表格转为 JSON，字段重命名为 camelCase，删去与本工具无关的列。干员名称、职业、星级、盟约归属、装备价格等字段取自页面表格，未重新计算；效果描述与装备风味文本按原文保留。

版权：PRTS 站点版权声明把游戏图片、动画、音频与文本原文的权利归入鹰角，明确不适用其站点的知识共享许可。因此这部分内容既不在 MIT 范围内，也不在 CC BY-NC-SA 范围内。

## 游戏图像

位置：`frontend/public/resource/image/`，共 415 个文件，含干员头像、职业图标、装备图标、盟约与活动图标。

版权：归上海鹰角网络科技有限公司及其关联公司。PRTS 仅作托管，不主张权利，也无权转授。

## PRTS 整理性内容

本仓库不收录 PRTS 页面原文。数据条目沿用了 PRTS 编辑者整理出的分类方式与层级划分，这部分属于 PRTS 的原创整理工作，PRTS 以 [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/deed.zh-hans) 授权站点内容（见其 MediaWiki 版权声明：「除非另有声明，网站其他内容采用知识共享署名-非商业性使用-相同方式共享授权」）。

依该许可的要求，此处说明：署名 PRTS 明日方舟中文 Wiki 及上述两个来源页面；内容经过转换与结构化改写，非原文转载；该部分内容如被再分发，需同样以 CC BY-NC-SA 4.0 提供。

## 使用条件

本仓库对上述第三方内容不作任何授权，也不对其可用性、完整性或合法性作出保证。第三方若要使用，需自行向权利人取得许可。

本项目是非官方、非商业的同人工具，与鹰角网络及 PRTS 均无隶属关系，未取得权利人对数据与图像的明示许可。权利人提出异议时，相关内容将被移除。

## 其他

规则考据参考 [sganggs/Stronghold-Protocol](https://github.com/sganggs/Stronghold-Protocol)。该仓库的 GPL-3.0-or-later 覆盖其自行编写的代码，本仓库未复制其代码或文档。
