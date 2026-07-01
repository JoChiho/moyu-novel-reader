<script setup lang="ts">
import { DEFAULT_SETTINGS } from "../types";
import { SUPPORTED_BOOK_FORMATS } from "../utils/bookPath";

const emit = defineEmits<{
  close: [];
}>();

const defaults = DEFAULT_SETTINGS;
</script>

<template>
  <div class="manual-overlay" @click.self="emit('close')">
    <div class="manual-dialog" role="dialog" aria-labelledby="manual-title">
      <header class="manual-header">
        <h2 id="manual-title">摸鱼小说阅读器 · 说明书</h2>
        <button type="button" class="manual-close" title="关闭" @click="emit('close')">
          ×
        </button>
      </header>

      <div class="manual-body">
        <section class="manual-section">
          <h3>软件能做什么</h3>
          <ul>
            <li>导入本地小说，多本书籍书架管理（搜索、排序）</li>
            <li>窗口随意拖拽、缩放，文字随窗口实时重排，不截断半行半字</li>
            <li>透明摸鱼模式：窗口与文字可半透明，透视桌面</li>
            <li>章节自动识别、书签、章节/书签导航子窗口</li>
            <li>阅读进度、窗口位置、样式设置自动记忆</li>
            <li>系统托盘：隐藏后仍可从托盘恢复</li>
            <li>主窗口专注阅读；设置 / 书架 / 导航在独立子窗口打开</li>
          </ul>
        </section>

        <section class="manual-section">
          <h3>支持格式</h3>
          <p>{{ SUPPORTED_BOOK_FORMATS }}</p>
          <p class="manual-note">
            纯文本类自动对比 UTF-8 / GBK；可在设置中手动指定编码。
          </p>
        </section>

        <section class="manual-section">
          <h3>初始快捷键（可在设置中修改部分项）</h3>
          <table class="manual-table">
            <thead>
              <tr>
                <th>操作</th>
                <th>默认按键</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>下一页</td>
                <td>
                  滚轮向下、→、↓、空格、{{ defaults.nextPageKey }}
                </td>
              </tr>
              <tr>
                <td>上一页</td>
                <td>滚轮向上、←、↑、{{ defaults.prevPageKey }}</td>
              </tr>
              <tr>
                <td>隐藏 / 显示窗口</td>
                <td>{{ defaults.toggleVisibilityShortcut }}（全局，可录制）</td>
              </tr>
              <tr>
                <td>打开设置</td>
                <td>右键阅读区、Ctrl+,</td>
              </tr>
              <tr>
                <td>添加书签</td>
                <td>Ctrl+B</td>
              </tr>
              <tr>
                <td>拖动窗口（阅读区）</td>
                <td>按住 Alt + 鼠标左键拖动</td>
              </tr>
            </tbody>
          </table>
          <p class="manual-note">
            「下一页键」「上一页键」在设置 → 快捷键中可改为任意单键（如
            F、PageDown）。阅读区默认滚轮翻页；拖窗口请用 Alt+拖动或顶部拖动手柄。
          </p>
        </section>

        <section class="manual-section">
          <h3>界面与窗口操作</h3>
          <ul>
            <li>阅读时鼠标移到窗口顶部，显示工具栏（导入 +、架、导、鱼、⚙、◐）</li>
            <li>拖动窗口：窗口顶部左侧拖动手柄，或阅读区按住 Alt + 左键拖动</li>
            <li>滚轮翻页：鼠标在阅读区上直接滚动（无需按 Alt）；失焦后请先点击阅读区再滚轮</li>
            <li>点击阅读区可重新聚焦窗口，隐藏 Windows 失焦时出现的标题栏色带</li>
            <li>顶栏「+」导入书籍；「架」书架；「导」章节与书签；「鱼」摸鱼计算器；「⚙」设置；「◐」隐藏/显示</li>
            <li>未打开书籍时，空状态页也可导入</li>
          </ul>
        </section>

        <section class="manual-section">
          <h3>章节缓存与翻页（v0.6.0）</h3>
          <ul>
            <li>导入书籍时，程序会按章节标题自动拆分并缓存到本机，章内翻页只加载当前章，速度更快</li>
            <li>阅读进度、书签、摸鱼统计仍使用全书字符位置，与旧版兼容</li>
            <li>到达章末继续下一页会进入下一章；在章首向上翻页会回到上一章最后一页</li>
            <li>若书籍未识别到章节标题，整本作为单章缓存，翻页速度与旧版相同</li>
            <li>已导入的旧书在下次打开时会自动生成章节缓存；删书时一并清理缓存</li>
          </ul>
        </section>

        <section class="manual-section">
          <h3>摸鱼计算器</h3>
          <ul>
            <li>工具栏「鱼」打开摸鱼计算器，可查看本次 / 累计 / 本周 / 本月摸鱼时长与阅读字数</li>
            <li>程序启动后默认自动开始计时；主窗口可见时累计时长，阅读字数按当前位置实时更新（约每秒刷新）</li>
            <li>隐藏窗口或暂停计时时，本次阅读字数写入累计与历史记录</li>
            <li>「暂停计时」或「清零统计」后需点击「开始计时」继续；下次启动程序会再次自动开始</li>
            <li>可填写月薪、工作天数、每日工时，自动换算等价金额</li>
            <li>历史记录展示每次摸鱼时段、时长与阅读字数；统计仅存本机，可一键清零</li>
          </ul>
        </section>

        <section class="manual-section">
          <h3>可自定义的设置项</h3>
          <dl class="manual-dl">
            <dt>阅读样式</dt>
            <dd>
              护眼主题、字号、文字颜色（黑/深灰/浅灰/白快捷预设 + 取色器）、自适应文字对比度（透明窗口下随桌面明暗切换）、背景颜色、透明窗口与背景不透明度、透明文字与文字不透明度、窗口置顶
            </dd>
            <dt>翻页</dt>
            <dd>是否保留上一页末尾行、保留行数（1～20）</dd>
            <dt>工具栏样式</dt>
            <dd>顶栏按钮颜色、透明按钮背景及不透明度</dd>
            <dt>阅读进度</dt>
            <dd>当前书籍进度滑块跳转（需已打开书籍）</dd>
            <dt>导入与编码</dt>
            <dd>TXT 编码（自动 / UTF-8 / GBK）、导入时是否合并空行</dd>
            <dt>快捷键</dt>
            <dd>
              隐藏/显示全局快捷键（点击录制）、下一页键、上一页键；不可与全局快捷键冲突
            </dd>
          </dl>
        </section>

        <section class="manual-section">
          <h3>数据保存在哪</h3>
          <p>
            书架、阅读进度、书签、章节索引与全部设置保存在本机（electron-store），不联网。
          </p>
          <p class="manual-note">
            章节正文缓存位于用户数据目录下的 book-cache 文件夹（每本书一个子目录），删书时自动清理。
          </p>
        </section>
      </div>

      <footer class="manual-footer">
        <button type="button" class="primary manual-ok" @click="emit('close')">
          知道了
        </button>
      </footer>
    </div>
  </div>
</template>