const esbuild = require("esbuild");

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

async function main() {
    const ctx = await esbuild.context({
        entryPoints: ["src/webview/index.tsx"],
        bundle: true,
        format: "iife",
        minify: production,
        sourcemap: !production,
        sourcesContent: false,
        platform: "browser",
        outfile: "out/compiled/bundle.js",
        external: ["vscode"],
        logLevel: "silent",
        plugins: [
            /* add plugins here */
        ],
    });

    if (watch) {
        await ctx.watch();
        console.log('[watch] build finished');
    } else {
        await ctx.rebuild();
        await ctx.dispose();
    }
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
