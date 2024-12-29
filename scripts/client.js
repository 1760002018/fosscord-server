const path = require("path");
const fetch = require("node-fetch");
const fs = require("fs").promises;
const { existsSync } = require("fs");
const CACHE_PATH = path.join(__dirname, "assets");
const http = require("http");
const https = require("https");
const httpAgent = new http.Agent({ keepAlive: true });
const httpsAgent = new https.Agent({ keepAlive: true });
const agent = (_parsedURL) =>
	_parsedURL.protocol == "http:" ? httpAgent : httpsAgent;

const INDEX_SCRIPTS = [
	// Begin CECL Changes

	// Begin DBC

	"ee7c382d9257652a88c8f7b7f22a994d.png",
	"0.2d737cc92c807c265e1f.css",
	"07dca80a102d4149e9736d4b162cff6f.ico",
	"e1180c171e5a54377584.js",
	"07ca8d15cc9ad4ffc0f6.js",
	"c05bdc0c5c3c90e28c77.js",
	"7288c77130c62ff8aa82.js",

	// End DBC

	// Begin DBC Devel

	"0.e470f204037b26bc4ad8.css",
	"07dca80a102d4149e9736d4b162cff6f.ico",
	"366619ca708365b1c67d.js",
	"734c47e42d1b66186446.js",
	"61a1c562490b1ff488d9.js",

	// End DBC Devel

	// Begin LBC

	"652f40427e1f5186ad54836074898279.png",
	"0.59403e9789b2d9095785.css",
	"ec2c34cadd4b5f4594415127380a85e6.ico",
	"d170d5b12b302f315912.js",
	"35e0115547d406ec0d20.js",
	"be358c929d9afee6527f.js",
	"ac07c15f13e50948a1b2.js",

	// End LBC

	// Begin LBC Devel

	"532.731d70a410af04b4d0ea.css",
	"07dca80a102d4149e9736d4b162cff6f.ico",
	"8c5e082c1b6050a786c6.js",
	"da303f345db971837ba8.js",
	"56597f3659b06fd58100.js",

	// End LBC Devel

	// Begin FBC

	"652f40427e1f5186ad54836074898279.png",
	"e02290aaa8dac5d195c2.js",
	"b4499d2a6b9046b1b402.js",
	"4b58fa778cc38e586a72.js",
	"4b582ee1842099625350.js",
	"38c96749096ac4dbb7f0.js",
	"969413679de40b9126e0.js",
	"89c07f6464c4df65e564.js",
	"dc27e9f8c501ecdfe290.js",
	"d6e22fa832cf37fe714d.js",
	"3c3325feeb9e546ccb49.js",
	"2b4910b6cd2fd1ab016d.js",
	"8d2eda55fddac6c1d33a.js",
	"eebf4f03942f2301f69b.js",
	"a1f5f16a094861ec6adf.js",
	"d096beea5c932b38c6fa.js",
	"2d3867e958e47e88104a.js",
	"2cf66aad2f5fe29327fd.js",
	"7fea300c56ec94a57220.js",
	"46429fa52d446195e526.js",
	"333280bb4dcdb11aec24.js",
	"829fea82c38be7177a11.js",
	"66d04738a7fb759d2656.js",
	"4d9f1df159179a4c2e91.js",
	"508ebf8fd09e4d7dfc8d.js",
	"bee07f3a5c565c60793c.js",
	"04b6e764f047c642e9ec.js",
	"98ace94cfa9f17fcf2d9.js",
	"c7f23c21f324407b775e.js",
	"9c4b2d313c6e1c864e89.js",
	"1312141aadbb0db546ba.js",
	"2bbcc08cac2c9a5c33f2.js",
	"ecaf785bc6925815b071.js",
	"ea0a21be971880ff6c6c.js",
	"a5c2c9470601e8560717.js",
	"aea432f8f5f3309ad87e.js",
	"3ad533c40f6819ead25e.js",
	"9ad6610fbedc218dde60.js",
	"26c071d7282d6c654254.js",
	"6e98d426b375ee024fd2.js",
	"fdb805b74dfafd472d48.js",
	"d6d60439a57f2edd54ac.js",
	"3d5204dc59667b880802.js",
	"0a5d08252796c4d9bc4c.js",
	"40532.ccd7077c8311c798fcff.css",
	"ec2c34cadd4b5f4594415127380a85e6.ico",
	"83ace7450e110d16319e.js",
	"e02290aaa8dac5d195c2.js",
	"4f3b3c576b879a5f75d1.js",
	"699456246fdfe7589855.js",

	// End FBC

	// Begin FBC Devel

	"532.c1e7901581106ed2d853.css",
	"847541504914fd33810e70a0ea73177e.ico",
	"5ebe36b40ed22fb5be8a.js",
	"2086c7c3aa4594a8e718.js",
	"839dac47751c4acf3004.js",

	// End FBC Devel

	// End CECL Changes
];

const print = (x, printover = true) => {
	var repeat = process.stdout.columns - x.length;
	process.stdout.write(
		`${x}${" ".repeat(Math.max(0, repeat))}${printover ? "\r" : "\n"}`,
	);
};

const processFile = async (asset) => {
	asset = `${asset}${asset.includes(".") ? "" : ".js"}`;
	var res = await fetch("https://discord.com/assets/" + asset, { agent });
	if (res && res.status && res.status == 200) {
		if (
			asset.includes(".") &&
			!asset.includes(".js") &&
			!asset.includes(".css")
		) {
			await fs.writeFile(
				path.join(CACHE_PATH, asset),
				await res.buffer(),
			);
			var text = null;
		} else {
			var text = await res.text();
		}
	} else if (res && res.status && res.status !== 200) {
		print(`${res.status} on https://discord.com/assets/${asset}`, false);
		var res = await fetch(
			"https://web.archive.org/web/0id_/https://discord.com/assets/" +
				asset,
			{ agent },
		);
		if (res && res.status && res.status == 200) {
			if (
				asset.includes(".") &&
				!asset.includes(".js") &&
				!asset.includes(".css")
			) {
				await fs.writeFile(
					path.join(CACHE_PATH, asset),
					await res.buffer(),
				);
				var text = null;
			} else {
				var text = await res.text();
			}
		} else if (res && res.status && res.status !== 200) {
			print(
				`${res.status} on https://web.archive.org/web/0id_/https://discord.com/assets/${asset}`,
				false,
			);
			var res = await fetch(
				"https://web.archive.org/web/0id_/https://discordapp.com/assets/" +
					asset,
				{ agent },
			);
			if (res && res.status && res.status == 200) {
				if (
					asset.includes(".") &&
					!asset.includes(".js") &&
					!asset.includes(".css")
				) {
					await fs.writeFile(
						path.join(CACHE_PATH, asset),
						await res.buffer(),
					);
					var text = null;
				} else {
					var text = await res.text();
				}
			} else if (res && res.status && res.status !== 200) {
				print(
					`${res.status} on https://web.archive.org/web/0id_/https://discordapp.com/assets/${asset}`,
					false,
				);
				var text = null;
			} else {
				processFile(asset);
				var text = null;
			}
		} else {
			processFile(asset);
			var text = null;
		}
	} else {
		processFile(asset);
		var text = null;
	}
	if (text == null) {
		return [];
	}
	await fs.writeFile(path.join(CACHE_PATH, asset), text);
	var ret = new Set([
		...(text.match(/"[A-Fa-f0-9]{20}"/g) || []),
		...[...text.matchAll(/Worker\(.\..\+"(.*?\.worker\.js)"/g)].map(
			(x) => x[1],
		),
		...[...text.matchAll(/\.exports=.\..\+"(.*?\.worker\.js)"/g)].map(
			(x) => x[1],
		),
		...[...text.matchAll(/\/assets\/([a-zA-Z0-9]*?\.worker\.js)/g)].map(
			(x) => x[1],
		),
		...[...text.matchAll(/\.exports=.\..\+"(.*?\..{0,5})"/g)].map(
			(x) => x[1],
		),
		...[...text.matchAll(/\/assets\/([a-zA-Z0-9]*?\.[a-z0-9]{0,5})/g)].map(
			(x) => x[1],
		),
	]);
	return [...ret].map((x) => (x ? x.replace(/"/g, "") : []));
};

(async () => {
	if (!existsSync(CACHE_PATH)) {
		await fs.mkdir(CACHE_PATH, { recursive: true });
	}
	const assets = new Set(INDEX_SCRIPTS);
	var promises = [];
	var index = 0;
	for (var asset of assets) {
		index += 1;
		print(
			`Scraping Asset: ${asset} - Assets Remaining: ${
				assets.size - index
			}`,
		);
		promises.push(processFile(asset));
		const values = await Promise.all(promises);
		promises = [];
		values.flat().forEach((x) => assets.add(x));
	}
	print("Done Scraping Assets!", false);
})();
