/*
	Fosscord: A FOSS re-implementation and extension of the Discord.com backend.
	Copyright (C) 2023 Fosscord and Fosscord Contributors
	
	This program is free software: you can redistribute it and/or modify
	it under the terms of the GNU Affero General Public License as published
	by the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.
	
	This program is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
	GNU Affero General Public License for more details.
	
	You should have received a copy of the GNU Affero General Public License
	along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import fs from "fs";
import FormData from "form-data";
import { HTTPError } from "lambert-server";
import fetch from "node-fetch";
import { Attachment } from "../entities";
import { Config } from "./Config";

export async function uploadFile(
	path: string,
	// These are the only props we use, don't need to enforce the full type.
	file?: Pick<Express.Multer.File, "mimetype" | "originalname" | "buffer">,
): Promise<Attachment> {
	if (!file?.buffer) throw new HTTPError("Missing file in body");

	const form = new FormData();
	form.append("file", file.buffer, {
		contentType: file.mimetype,
		filename: file.originalname,
	});

	return (await (
		await fetch(
			fs.readFileSync("./tmp/PROT", { encoding: "utf8" }) +
				"://" +
				fs.readFileSync("./tmp/HOST", { encoding: "utf8" }) +
				path || "http://localhost:3001" + path,
			{
				headers: {
					signature: Config.get().security.requestSignature,
					...form.getHeaders(),
				},
				method: "POST",
				body: form,
			},
		)
	).json()) as Attachment;
}

export async function handleFile(
	path: string,
	body?: string,
): Promise<string | undefined> {
	if (!body || !body.startsWith("data:")) return undefined;
	try {
		const mimetype = body.split(":")[1].split(";")[0];
		const buffer = Buffer.from(body.split(",")[1], "base64");

		const { id } = await uploadFile(path, {
			buffer,
			mimetype,
			originalname: "banner",
		});
		return id;
	} catch (error) {
		console.error(error);
		throw new HTTPError("Invalid " + path);
	}
}

export async function deleteFile(path: string) {
	return await (
		await fetch(
			fs.readFileSync("./tmp/PROT", { encoding: "utf8" }) +
				"://" +
				fs.readFileSync("./tmp/HOST", { encoding: "utf8" }) +
				path || "http://localhost:3001" + path,
			{
				headers: {
					signature: Config.get().security.requestSignature,
				},
				method: "DELETE",
			},
		)
	).json();
}
