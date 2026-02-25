import * as path from 'path';
import * as os from 'os';
import *  as fs from 'fs-extra';
import * as playwright from 'playwright';

import { DOWNLOAD_FILE, AUTH_FILE } from './const'

export class FlomoExporter {
    private async clickFirstAvailable(page: playwright.Page, selectors: Array<() => playwright.Locator>, stepName: string): Promise<boolean> {
        for (const makeLocator of selectors) {
            try {
                const locator = makeLocator();
                await locator.first().waitFor({ state: "visible", timeout: 3000 });
                await locator.first().click({ timeout: 5000 });
                console.log(`[FlomoExporter] ${stepName} 成功`);
                return true;
            } catch (_err) {
                // 尝试下一个候选定位器
            }
        }

        console.log(`[FlomoExporter] ${stepName} 未命中候选定位器`);
        return false;
    }

    private async triggerExport(page: playwright.Page): Promise<void> {
        console.log("[FlomoExporter] 尝试触发导出流程");
        await page.goto('https://v.flomoapp.com/mine');
        await page.waitForLoadState('domcontentloaded');

        // 先尝试从用户菜单路径进入（兼容中英文）
        await this.clickFirstAvailable(page, [
            () => page.getByText('Export/import memos'),
            () => page.getByText('Export memos'),
            () => page.getByText('导出'),
            () => page.getByRole('button', { name: /^Export$/i }),
            () => page.getByRole('button', { name: /^开始导出$/ })
        ], "进入导出入口");

        const exportClicked = await this.clickFirstAvailable(page, [
            () => page.getByRole('button', { name: /^Export$/i }),
            () => page.getByRole('button', { name: /^开始导出$/ }),
            () => page.getByText('Export'),
            () => page.getByText('开始导出')
        ], "点击导出按钮");

        if (exportClicked) {
            return;
        }

        // 兜底：兼容旧路径
        console.log("[FlomoExporter] 使用旧路径兜底触发导出");
        await page.goto('https://v.flomoapp.com/mine?source=export');
        await page.waitForLoadState('domcontentloaded');
        const fallbackClicked = await this.clickFirstAvailable(page, [
            () => page.getByRole('button', { name: /^Export$/i }),
            () => page.getByRole('button', { name: /^开始导出$/ }),
            () => page.getByText('Export'),
            () => page.getByText('开始导出')
        ], "旧路径点击导出按钮");

        if (!fallbackClicked) {
            throw new Error("未找到导出按钮，请检查 flomo 页面语言、登录状态或导出入口文案是否变化。");
        }
    }

    async export(): Promise<[boolean, string]> {
        try {
            // Setup
            console.log("[FlomoExporter] 启动浏览器并加载登录态");
            const browser = await playwright.chromium.launch();
            
            const context = await browser.newContext({ storageState: AUTH_FILE });
            const page = await context.newPage();


            const downloadPromise = page.waitForEvent('download', { timeout: 10 * 60 * 1000 });
            await this.triggerExport(page);
            console.log("[FlomoExporter] 已触发导出，等待下载事件");
            const download = await downloadPromise;

            await download.saveAs(DOWNLOAD_FILE);
            console.log(`[FlomoExporter] 导出文件已保存: ${DOWNLOAD_FILE}`);

            // Teardown
            await context.close();
            await browser.close();

            return [true, ""]
        } catch (error) {
            console.log("[FlomoExporter] 导出失败", error);
            return [false, `${error}`];
        }
    }

}