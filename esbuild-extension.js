const esbuild = require("esbuild");

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

async function main() {
    const ctx = await esbuild.context({
        entryPoints: ["src/extension.ts"],
        bundle: true,
        format: "cjs",
        minify: production,
        sourcemap: !production,
        sourcesContent: false,
        platform: "node",
        outfile: "out/extension.bundle.js",
        external: [
            "vscode",           // VS Code API - provided by the extension host
            "puppeteer",        // Large native dependency - optional, loaded at runtime
        ],
        logLevel: "info",
        plugins: [],
    });

    if (watch) {
        await ctx.watch();
        console.log('[extension] watching...');
    } else {
        await ctx.rebuild();
        console.log('[extension] build finished');
        await ctx.dispose();
    }
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
